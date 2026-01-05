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
import type { CharacterStats } from '../types/stats'
import { DEFAULT_CHARACTER_STATS } from '../types/stats'
import type { BattleCard } from '../types/battleCard'

// AI 무기 및 스탯 생성
interface AIData {
  weapon: UserWeapon
  stats: CharacterStats
}

function generateAIData(difficulty: AIDifficulty, playerStats: CharacterStats): AIData {
  const config = AI_DIFFICULTY_CONFIG[difficulty]
  const targetAttack = playerStats.attack * config.multiplier

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

  const weapon: UserWeapon = {
    id: 'ai-weapon',
    weaponTypeId: weaponType.id,
    weaponType,
    starLevel: level,
    isDestroyed: false,
    consecutiveFails: 0,
    createdAt: new Date(),
    totalAttack,
  }

  // AI 스탯 생성 (플레이어 스탯 기반 + 난이도 배율)
  const stats: CharacterStats = {
    attack: totalAttack,
    defense: Math.floor((DEFAULT_CHARACTER_STATS.defense + playerStats.defense * 0.5) * config.multiplier),
    hp: Math.floor((DEFAULT_CHARACTER_STATS.hp + playerStats.hp * 0.3) * config.multiplier),
    critRate: DEFAULT_CHARACTER_STATS.critRate + Math.floor(level * 0.3),
    critDamage: DEFAULT_CHARACTER_STATS.critDamage + Math.floor(level * 1),
    penetration: Math.floor(level * 0.2),
    attackSpeed: DEFAULT_CHARACTER_STATS.attackSpeed,
    evasion: Math.floor(level * 0.1),  // AI도 레벨에 따라 약간의 회피율
  }

  return { weapon, stats }
}

// 대미지 계산 (공격력, 방어력, 관통력 적용)
function calculateDamage(
  attackerStats: CharacterStats,
  defenderStats: CharacterStats
): { damage: number; isCrit: boolean } {
  const { attack, critRate, critDamage, penetration } = attackerStats
  const { defense } = defenderStats

  // 기본 대미지 (랜덤 요소 포함)
  const randomBonus = attack * BATTLE_CONFIG.randomFactor * (Math.random() * 2 - 1)
  let damage = Math.max(1, attack + randomBonus)

  // 치명타 판정
  const isCrit = Math.random() * 100 < critRate
  if (isCrit) {
    damage *= critDamage / 100
  }

  // 유효 방어력 계산 (관통력 적용)
  const effectiveDefense = defense * (1 - Math.min(penetration, 100) / 100)

  // 방어 감소 공식: 방어력 / (방어력 + 100)
  const damageReduction = effectiveDefense / (effectiveDefense + 100)
  damage *= (1 - damageReduction)

  return { damage: Math.max(1, Math.floor(damage)), isCrit }
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

// 카드 보너스를 스탯에 적용
function applyCardBonusesToStats(
  stats: CharacterStats,
  bonuses: CardBonuses
): CharacterStats {
  return {
    ...stats,
    attack: Math.floor(stats.attack * bonuses.attackMultiplier),
    defense: Math.floor(stats.defense * bonuses.defenseMultiplier),
    critRate: stats.critRate + bonuses.critRateBonus,
    critDamage: stats.critDamage + bonuses.critDamageBonus,
    penetration: stats.penetration + bonuses.penetrationBonus,
  }
}

export function useBattle(playerWeapon: UserWeapon | null, playerStats?: CharacterStats) {
  const [status, setStatus] = useState<BattleStatus>('idle')
  const [currentBattle, setCurrentBattle] = useState<BattleMatch | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty | null>(null)

  // 기본 스탯 (playerStats가 없으면 무기 기반으로 생성)
  const effectiveStats: CharacterStats = playerStats ?? {
    ...DEFAULT_CHARACTER_STATS,
    attack: playerWeapon?.totalAttack ?? 0,
  }

  // 예상 보상 계산 (승리 시 보상 범위)
  const getExpectedReward = useCallback((difficulty: AIDifficulty): {
    win: number;
    lose: number;
    draw: number;
  } => {
    if (!playerWeapon) return { win: 0, lose: 0, draw: 0 }

    const config = AI_DIFFICULTY_CONFIG[difficulty]
    const playerAttack = effectiveStats.attack
    const playerLevel = playerWeapon.starLevel

    return {
      win: calculateBattleReward('win', playerAttack, playerLevel, config.rewardMultiplier),
      lose: calculateBattleReward('lose', playerAttack, playerLevel, config.rewardMultiplier),
      draw: calculateBattleReward('draw', playerAttack, playerLevel, config.rewardMultiplier),
    }
  }, [playerWeapon, effectiveStats.attack])

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

    // AI 생성 (무기 + 스탯)
    const aiData = generateAIData(difficulty, effectiveStats)
    const aiName = getRandomAIName()

    // 카드 효과가 적용된 플레이어 스탯
    let boostedPlayerStats = applyCardBonusesToStats(effectiveStats, cardBonuses)

    // 확정 치명타 처리
    if (cardBonuses.guaranteedCrit) {
      boostedPlayerStats = { ...boostedPlayerStats, critRate: 100 }
    }

    const player: BattleParticipant = {
      id: 'player',
      name: '나',
      weapon: playerWeapon,
      stats: boostedPlayerStats,
      rollValue: 0,
      finalDamage: 0,
    }

    const opponent: BattleParticipant = {
      id: 'ai',
      name: aiName,
      weapon: aiData.weapon,
      stats: aiData.stats,
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

    // 대미지 계산 (전체 스탯 적용)
    const playerDamageResult = calculateDamage(player.stats, opponent.stats)
    let playerDamage = playerDamageResult.damage
    const playerCrit = playerDamageResult.isCrit

    // 선제 공격 보너스
    if (cardBonuses.firstStrikeDamage > 0) {
      playerDamage += cardBonuses.firstStrikeDamage
    }

    const opponentDamageResult = calculateDamage(opponent.stats, player.stats)
    let opponentDamage = opponentDamageResult.damage
    const opponentCrit = opponentDamageResult.isCrit

    // 데미지 반사 처리
    if (cardBonuses.damageReflect > 0) {
      const reflectedDamage = Math.floor(opponentDamage * cardBonuses.damageReflect)
      playerDamage += reflectedDamage
    }

    player.finalDamage = playerDamage
    player.isCrit = playerCrit
    opponent.finalDamage = opponentDamage
    opponent.isCrit = opponentCrit

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
      effectiveStats.attack,  // 원본 공격력 기준
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
  }, [playerWeapon, effectiveStats, status])

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
