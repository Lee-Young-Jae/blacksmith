import { useState, useCallback } from 'react'
import { getRandomWeapon } from '../data/weapons'
import { getTotalAttack } from '../utils/starforce'
import type {
  BattleMatch,
  BattleParticipant,
  BattleResult,
  BattleStatus,
  AIDifficulty,
} from '../types/battle'
import { BATTLE_CONFIG, AI_DIFFICULTY_CONFIG, calculateBattleReward } from '../types/battle'
import type { UserWeapon } from '../types/weapon'
import type { BattleCard } from '../types/battleCard'

// AI 무기 생성
function generateAIWeapon(difficulty: AIDifficulty, playerAttack: number): UserWeapon {
  const config = AI_DIFFICULTY_CONFIG[difficulty]
  const targetAttack = playerAttack * config.multiplier

  // 랜덤 무기 선택
  const weaponType = getRandomWeapon()

  // 적절한 레벨 계산 (역산)
  let level = 0
  let currentAttack = weaponType.baseAttack
  while (currentAttack < targetAttack && level < 30) {
    level++
    currentAttack = getTotalAttack(weaponType.baseAttack, level)
  }

  // 약간의 랜덤 변동
  const variation = Math.floor((Math.random() - 0.5) * 3)
  level = Math.max(0, level + variation)
  const totalAttack = getTotalAttack(weaponType.baseAttack, level)

  return {
    id: 'ai-weapon',
    weaponTypeId: weaponType.id,
    weaponType,
    starLevel: level,
    isDestroyed: false,
    consecutiveFails: 0,
    createdAt: new Date(),
    totalAttack,
  }
}

// 대미지 계산 (공격력 + 랜덤 요소)
function calculateDamage(attack: number): number {
  const randomBonus = attack * BATTLE_CONFIG.randomFactor * (Math.random() * 2 - 1)
  return Math.max(1, Math.floor(attack + randomBonus))
}

// 카드 효과 적용된 스탯 계산
interface CardBonuses {
  attackMultiplier: number
  defenseMultiplier: number
  critRateBonus: number
  critDamageBonus: number
  penetrationBonus: number
  guaranteedCrit: boolean
  damageReflect: number
  firstStrikeDamage: number
  goldMultiplier: number
}

function getCardBonuses(card: BattleCard | null): CardBonuses {
  const bonuses: CardBonuses = {
    attackMultiplier: 1,
    defenseMultiplier: 1,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    guaranteedCrit: false,
    damageReflect: 0,
    firstStrikeDamage: 0,
    goldMultiplier: 1,
  }

  if (!card) return bonuses

  const { type, value } = card.effect

  switch (type) {
    case 'attack_boost':
      bonuses.attackMultiplier = 1 + value / 100
      break
    case 'defense_boost':
      bonuses.defenseMultiplier = 1 + value / 100
      break
    case 'crit_rate_boost':
      bonuses.critRateBonus = value
      break
    case 'crit_damage_boost':
      bonuses.critDamageBonus = value
      break
    case 'penetration_boost':
      bonuses.penetrationBonus = value
      break
    case 'guaranteed_crit':
      bonuses.guaranteedCrit = true
      break
    case 'damage_reflect':
      bonuses.damageReflect = value / 100
      break
    case 'first_strike':
      bonuses.firstStrikeDamage = value
      break
    case 'gold_bonus':
      bonuses.goldMultiplier = 1 + value / 100
      break
  }

  return bonuses
}

// AI 이름 생성
const AI_NAMES = [
  '그림자 기사', '불의 마법사', '얼음 궁수', '대지의 전사',
  '바람의 암살자', '번개의 창병', '어둠의 낫꾼', '빛의 성기사',
  '용의 후예', '악마 사냥꾼', '정령술사', '광전사'
]

function getRandomAIName(): string {
  return AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)]
}

export function useBattle(playerWeapon: UserWeapon | null) {
  const [status, setStatus] = useState<BattleStatus>('idle')
  const [currentBattle, setCurrentBattle] = useState<BattleMatch | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty | null>(null)

  // 예상 보상 계산 (승리 시 보상 범위)
  const getExpectedReward = useCallback((difficulty: AIDifficulty): {
    win: number;
    lose: number;
    draw: number;
  } => {
    if (!playerWeapon) return { win: 0, lose: 0, draw: 0 }

    const config = AI_DIFFICULTY_CONFIG[difficulty]
    const playerAttack = playerWeapon.totalAttack
    const playerLevel = playerWeapon.starLevel

    return {
      win: calculateBattleReward('win', playerAttack, playerLevel, config.rewardMultiplier),
      lose: calculateBattleReward('lose', playerAttack, playerLevel, config.rewardMultiplier),
      draw: calculateBattleReward('draw', playerAttack, playerLevel, config.rewardMultiplier),
    }
  }, [playerWeapon])

  // AI 대전 시작 (카드 효과 적용)
  const startBattle = useCallback(async (
    difficulty: AIDifficulty,
    selectedCard: BattleCard | null = null
  ): Promise<{
    result: BattleResult
    goldReward: number
    cardUsed: BattleCard | null
  } | null> => {
    if (!playerWeapon || status !== 'idle') return null

    setSelectedDifficulty(difficulty)
    setStatus('matchmaking')

    // 카드 보너스 계산
    const cardBonuses = getCardBonuses(selectedCard)

    // 매칭 연출
    await new Promise(r => setTimeout(r, BATTLE_CONFIG.matchmakingDelay))

    // AI 무기 생성
    const aiWeapon = generateAIWeapon(difficulty, playerWeapon.totalAttack)
    const aiName = getRandomAIName()

    // 카드 효과가 적용된 공격력
    const boostedPlayerAttack = Math.floor(playerWeapon.totalAttack * cardBonuses.attackMultiplier)

    const player: BattleParticipant = {
      id: 'player',
      name: '나',
      weapon: playerWeapon,
      baseAttack: boostedPlayerAttack,
      rollValue: 0,
      finalDamage: 0,
    }

    const opponent: BattleParticipant = {
      id: 'ai',
      name: aiName,
      weapon: aiWeapon,
      baseAttack: aiWeapon.totalAttack,
      rollValue: 0,
      finalDamage: 0,
    }

    const battle: BattleMatch = {
      id: crypto.randomUUID(),
      player,
      opponent,
      winner: null,
      result: null,
      goldReward: 0,
      status: 'fighting',
      createdAt: new Date(),
    }

    setCurrentBattle(battle)
    setStatus('fighting')

    // 대결 애니메이션
    await new Promise(r => setTimeout(r, BATTLE_CONFIG.animationDuration))

    // 대미지 계산 (카드 효과 적용)
    let playerDamage = calculateDamage(player.baseAttack)

    // 선제 공격 보너스
    if (cardBonuses.firstStrikeDamage > 0) {
      playerDamage += cardBonuses.firstStrikeDamage
    }

    // 치명타 처리 (확정 치명타 또는 치명타 확률 보너스)
    const baseCritRate = 5 + cardBonuses.critRateBonus  // 기본 5% + 보너스
    const isCrit = cardBonuses.guaranteedCrit || Math.random() * 100 < baseCritRate
    if (isCrit) {
      const critMultiplier = (150 + cardBonuses.critDamageBonus) / 100  // 기본 150% + 보너스
      playerDamage = Math.floor(playerDamage * critMultiplier)
    }

    player.finalDamage = playerDamage
    opponent.finalDamage = calculateDamage(opponent.baseAttack)

    // 데미지 반사 처리
    if (cardBonuses.damageReflect > 0) {
      const reflectedDamage = Math.floor(opponent.finalDamage * cardBonuses.damageReflect)
      player.finalDamage += reflectedDamage
    }

    // 승패 결정
    let result: BattleResult
    const config = AI_DIFFICULTY_CONFIG[difficulty]

    if (player.finalDamage > opponent.finalDamage) {
      result = 'win'
    } else if (player.finalDamage < opponent.finalDamage) {
      result = 'lose'
    } else {
      result = 'draw'
    }

    // 보상 계산 (카드 골드 보너스 적용)
    let goldReward = calculateBattleReward(
      result,
      playerWeapon.totalAttack,  // 원본 공격력 기준
      playerWeapon.starLevel,
      config.rewardMultiplier
    )
    goldReward = Math.floor(goldReward * cardBonuses.goldMultiplier)

    const finishedBattle: BattleMatch = {
      ...battle,
      player,
      opponent,
      winner: result === 'win' ? 'player' : result === 'lose' ? 'opponent' : null,
      result,
      goldReward,
      status: 'finished',
      finishedAt: new Date(),
    }

    setCurrentBattle(finishedBattle)
    setStatus('finished')

    return { result, goldReward, cardUsed: selectedCard }
  }, [playerWeapon, status])

  // 대결 리셋
  const resetBattle = useCallback(() => {
    setStatus('idle')
    setCurrentBattle(null)
    setSelectedDifficulty(null)
  }, [])

  return {
    status,
    currentBattle,
    selectedDifficulty,
    startBattle,
    resetBattle,
    getExpectedReward,
    isMatchmaking: status === 'matchmaking',
    isFighting: status === 'fighting',
    isFinished: status === 'finished',
  }
}
