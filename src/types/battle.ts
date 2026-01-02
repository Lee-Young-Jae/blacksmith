import type { UserWeapon } from './weapon'

// 대결 상태
export type BattleStatus = 'idle' | 'matchmaking' | 'fighting' | 'finished'

// 대결 결과
export type BattleResult = 'win' | 'lose' | 'draw'

// AI 난이도
export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'extreme'

// 대결 참가자
export interface BattleParticipant {
  id: string
  name: string
  weapon: UserWeapon
  baseAttack: number
  rollValue: number
  finalDamage: number
}

// 대결 매치
export interface BattleMatch {
  id: string
  player: BattleParticipant
  opponent: BattleParticipant
  winner: 'player' | 'opponent' | null
  result: BattleResult | null
  goldReward: number
  status: BattleStatus
  createdAt: Date
  finishedAt?: Date
}

// AI 난이도별 설정
export const AI_DIFFICULTY_CONFIG: Record<AIDifficulty, {
  name: string
  multiplier: number
  rewardMultiplier: number
  emoji: string
}> = {
  easy: {
    name: '쉬움',
    multiplier: 0.6,
    rewardMultiplier: 0.5,
    emoji: '😊',
  },
  normal: {
    name: '보통',
    multiplier: 1.0,
    rewardMultiplier: 1.0,
    emoji: '😐',
  },
  hard: {
    name: '어려움',
    multiplier: 1.4,
    rewardMultiplier: 1.5,
    emoji: '😤',
  },
  extreme: {
    name: '극한',
    multiplier: 2.0,
    rewardMultiplier: 2.5,
    emoji: '👹',
  },
}

// 대결 설정
export const BATTLE_CONFIG = {
  randomFactor: 0.3,        // 30% 랜덤 요소
  animationDuration: 2500,  // 대결 애니메이션 시간 (ms)
  matchmakingDelay: 1000,   // 매칭 연출 시간 (ms)
  // 보상 공식 상수
  baseWinReward: 300,       // 승리 기본 보상
  attackBonusFactor: 0.3,   // 공격력 보너스 계수
  levelBonusFactor: 50,     // 레벨 보너스 계수
  baseLoseReward: 50,       // 패배 기본 보상 (참여 보상)
  loseAttackFactor: 0.05,   // 패배 공격력 계수
  loseLevelFactor: 10,      // 패배 레벨 계수
}

/**
 * 대결 보상 계산
 * - 승리: 기본 + 공격력 보너스 + 레벨 보너스
 * - 패배: 소량의 참여 보상
 * - 무승부: 승리의 30%
 */
export function calculateBattleReward(
  result: BattleResult,
  playerAttack: number,
  playerLevel: number,
  difficultyMultiplier: number
): number {
  const {
    baseWinReward,
    attackBonusFactor,
    levelBonusFactor,
    baseLoseReward,
    loseAttackFactor,
    loseLevelFactor,
  } = BATTLE_CONFIG

  if (result === 'win') {
    const reward = baseWinReward + playerAttack * attackBonusFactor + playerLevel * levelBonusFactor
    return Math.floor(reward * difficultyMultiplier)
  } else if (result === 'draw') {
    const reward = baseWinReward + playerAttack * attackBonusFactor + playerLevel * levelBonusFactor
    return Math.floor(reward * difficultyMultiplier * 0.3)
  } else {
    // 패배: 참여 보상
    const reward = baseLoseReward + playerAttack * loseAttackFactor + playerLevel * loseLevelFactor
    return Math.floor(reward * difficultyMultiplier)
  }
}
