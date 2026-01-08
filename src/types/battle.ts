import type { UserWeapon } from './weapon'
import type { CharacterStats } from './stats'
import type { UserEquipment } from './equipment'

// =============================================
// AI 대결 (기존)
// =============================================

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
  stats: CharacterStats  // 전체 스탯
  rollValue: number
  finalDamage: number
  isCrit?: boolean       // 치명타 발생 여부
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
    rewardMultiplier: 0.7,
    emoji: '😊',
  },
  normal: {
    name: '보통',
    multiplier: 0.8,
    rewardMultiplier: 1.2,
    emoji: '😐',
  },
  hard: {
    name: '어려움',
    multiplier: 1.1,
    rewardMultiplier: 2.0,
    emoji: '😤',
  },
  extreme: {
    name: '극한',
    multiplier: 1.5,
    rewardMultiplier: 3.0,
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

// =============================================
// PvP 대결 (신규)
// =============================================

// PvP 배틀 상태
export type PvPBattleStatus = 'idle' | 'searching' | 'calculating' | 'finished'

// PvP 결과
export type PvPBattleResult = 'attacker_win' | 'defender_win' | 'draw'

// 플레이어 스냅샷 (비동기 PvP용)
export interface PvPPlayerSnapshot {
  id: string
  visibleId: string             // 표시용 ID
  username: string
  combatPower: number
  stats: CharacterStats
  equipment: UserEquipment[]     // 착용 장비 스냅샷
  createdAt: Date
}

// PvP 배틀 기록
export interface PvPBattle {
  id: string
  attackerId: string
  defenderId: string
  attacker: PvPPlayerSnapshot
  defender: PvPPlayerSnapshot

  // 배틀 계산 상세
  attackerDamageDealt: number
  defenderDamageDealt: number
  attackerCritTriggered: boolean
  defenderCritTriggered: boolean

  // 결과
  winnerId: string | null        // null = 무승부
  result: PvPBattleResult
  attackerReward: number
  defenderReward: number

  // 레이팅 변화
  attackerRatingChange: number
  defenderRatingChange: number

  createdAt: Date
}

// PvP 티어
export type PvPTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster'

export const PVP_TIERS: PvPTier[] = [
  'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'
]

export const PVP_TIER_THRESHOLDS: Record<PvPTier, number> = {
  bronze: 0,
  silver: 1100,
  gold: 1300,
  platinum: 1500,
  diamond: 1700,
  master: 1900,
  grandmaster: 2100,
}

export const PVP_TIER_NAMES: Record<PvPTier, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  diamond: '다이아몬드',
  master: '마스터',
  grandmaster: '그랜드마스터',
}

export const PVP_TIER_COLORS: Record<PvPTier, string> = {
  bronze: 'text-amber-600',
  silver: 'text-gray-400',
  gold: 'text-yellow-400',
  platinum: 'text-cyan-400',
  diamond: 'text-blue-400',
  master: 'text-purple-400',
  grandmaster: 'text-red-400',
}

export const PVP_TIER_EMOJIS: Record<PvPTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
  master: '👑',
  grandmaster: '🏆',
}

// PvP 랭킹
export interface PvPRanking {
  userId: string
  username: string
  rating: number
  wins: number
  losses: number
  draws: number
  winStreak: number
  highestRating: number
  combatPower: number
  rank: number
  tier: PvPTier
}

// PvP 설정
export const PVP_CONFIG = {
  baseWinReward: 500,
  baseLoseReward: 100,
  baseDrawReward: 250,
  ratingBaseChange: 25,
  streakBonus: 0.1,           // 연승 보너스 10%
  powerDifferenceBonus: 0.05, // 강자 격파 보너스
  dailyBattleLimit: 10,       // 일일 PvP 횟수 제한
  matchmakingRange: 200,      // 레이팅 매칭 범위
}

// 레이팅으로 티어 결정
export function getTierFromRating(rating: number): PvPTier {
  const tiers = [...PVP_TIERS].reverse()
  for (const tier of tiers) {
    if (rating >= PVP_TIER_THRESHOLDS[tier]) {
      return tier
    }
  }
  return 'bronze'
}

// ELO 레이팅 변화 계산
export function calculateRatingChange(
  winnerRating: number,
  loserRating: number,
  isDraw: boolean = false
): { winnerChange: number; loserChange: number } {
  const K = 32 // K-factor

  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400))
  const expectedLoser = 1 - expectedWinner

  if (isDraw) {
    const change = Math.round(K * (0.5 - expectedWinner))
    return { winnerChange: change, loserChange: -change }
  }

  const winnerChange = Math.round(K * (1 - expectedWinner))
  const loserChange = Math.round(K * (0 - expectedLoser))

  return { winnerChange, loserChange }
}
