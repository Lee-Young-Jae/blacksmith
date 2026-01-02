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

  // AI 대전 시작
  const startBattle = useCallback(async (difficulty: AIDifficulty): Promise<{
    result: BattleResult
    goldReward: number
  } | null> => {
    if (!playerWeapon || status !== 'idle') return null

    setSelectedDifficulty(difficulty)
    setStatus('matchmaking')

    // 매칭 연출
    await new Promise(r => setTimeout(r, BATTLE_CONFIG.matchmakingDelay))

    // AI 무기 생성
    const aiWeapon = generateAIWeapon(difficulty, playerWeapon.totalAttack)
    const aiName = getRandomAIName()

    const player: BattleParticipant = {
      id: 'player',
      name: '나',
      weapon: playerWeapon,
      baseAttack: playerWeapon.totalAttack,
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

    // 대미지 계산
    player.finalDamage = calculateDamage(player.baseAttack)
    opponent.finalDamage = calculateDamage(opponent.baseAttack)

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

    // 보상 계산 (새 공식: 레벨 + 공격력 기반)
    const goldReward = calculateBattleReward(
      result,
      player.baseAttack,
      playerWeapon.starLevel,
      config.rewardMultiplier
    )

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

    return { result, goldReward }
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
