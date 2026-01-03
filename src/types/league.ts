// =============================================
// 리그 티어 시스템
// =============================================

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master'

export const LEAGUE_TIERS: LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master']

export interface TierInfo {
  name: string
  minRating: number
  maxRating: number
  emoji: string
  color: string
  bgColor: string
  borderColor: string
  weeklyReward: {
    gold: number
    tickets: number
  }
}

export const TIER_INFO: Record<LeagueTier, TierInfo> = {
  bronze: {
    name: '브론즈',
    minRating: 0,
    maxRating: 999,
    emoji: '🥉',
    color: 'text-orange-600',
    bgColor: 'bg-orange-900/30',
    borderColor: 'border-orange-600',
    weeklyReward: { gold: 1000, tickets: 0 },
  },
  silver: {
    name: '실버',
    minRating: 1000,
    maxRating: 1499,
    emoji: '🥈',
    color: 'text-gray-300',
    bgColor: 'bg-gray-700/30',
    borderColor: 'border-gray-400',
    weeklyReward: { gold: 3000, tickets: 1 },
  },
  gold: {
    name: '골드',
    minRating: 1500,
    maxRating: 1999,
    emoji: '🥇',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/30',
    borderColor: 'border-yellow-500',
    weeklyReward: { gold: 5000, tickets: 2 },
  },
  platinum: {
    name: '플래티넘',
    minRating: 2000,
    maxRating: 2499,
    emoji: '💎',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-900/30',
    borderColor: 'border-cyan-500',
    weeklyReward: { gold: 8000, tickets: 3 },
  },
  diamond: {
    name: '다이아몬드',
    minRating: 2500,
    maxRating: 2999,
    emoji: '💠',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-500',
    weeklyReward: { gold: 12000, tickets: 5 },
  },
  master: {
    name: '마스터',
    minRating: 3000,
    maxRating: 9999,
    emoji: '👑',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30',
    borderColor: 'border-purple-500',
    weeklyReward: { gold: 20000, tickets: 10 },
  },
}

// 레이팅으로 티어 계산
export function getTierFromRating(rating: number): LeagueTier {
  if (rating >= 3000) return 'master'
  if (rating >= 2500) return 'diamond'
  if (rating >= 2000) return 'platinum'
  if (rating >= 1500) return 'gold'
  if (rating >= 1000) return 'silver'
  return 'bronze'
}

// 티어 정보 가져오기
export function getTierInfo(tier: LeagueTier): TierInfo {
  return TIER_INFO[tier]
}

// 다음 티어까지 필요한 레이팅
export function getPointsToNextTier(rating: number): number | null {
  const currentTier = getTierFromRating(rating)
  const tierIndex = LEAGUE_TIERS.indexOf(currentTier)

  if (tierIndex >= LEAGUE_TIERS.length - 1) return null // 마스터는 다음 티어 없음

  const nextTier = LEAGUE_TIERS[tierIndex + 1]
  const nextTierInfo = TIER_INFO[nextTier]

  return nextTierInfo.minRating - rating
}

// 티어 내 진행도 (0-100%)
export function getTierProgress(rating: number): number {
  const tier = getTierFromRating(rating)
  const tierInfo = TIER_INFO[tier]

  if (tier === 'master') {
    // 마스터는 3000 이상 무한
    return Math.min(100, ((rating - 3000) / 1000) * 100)
  }

  const range = tierInfo.maxRating - tierInfo.minRating + 1
  const progress = rating - tierInfo.minRating

  return Math.min(100, (progress / range) * 100)
}

// =============================================
// 랭킹 정보
// =============================================

export interface PvPRanking {
  userId: string
  rating: number
  tier: LeagueTier
  wins: number
  losses: number
  draws: number
  winStreak: number
  highestRating: number
  combatPower: number
  weeklyBattles: number
  lastWeeklyClaim: Date | null
  updatedAt: Date
}

// DB Row 타입
export interface PvPRankingRow {
  user_id: string
  rating: number
  tier: string
  wins: number
  losses: number
  draws: number
  win_streak: number
  highest_rating: number
  combat_power: number
  weekly_battles: number
  last_weekly_claim: string | null
  updated_at: string
}

// 승률 계산
export function getWinRate(ranking: PvPRanking): number {
  const total = ranking.wins + ranking.losses + ranking.draws
  if (total === 0) return 0
  return Math.round((ranking.wins / total) * 100)
}

// =============================================
// 리더보드
// =============================================

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  rating: number
  tier: LeagueTier
  wins: number
  losses: number
  winStreak: number
  combatPower: number
}

// =============================================
// 시즌
// =============================================

export interface PvPSeason {
  id: number
  name: string
  startDate: Date
  endDate: Date
  isActive: boolean
}

export interface SeasonRecord {
  id: string
  userId: string
  seasonId: number
  finalRating: number
  finalRank: number | null
  tier: LeagueTier
  wins: number
  losses: number
  draws: number
  rewardsClaimed: boolean
}

// 시즌 종료 보상 (티어별)
export const SEASON_END_REWARDS: Record<LeagueTier, {
  gold: number
  tickets: number
  title: string | null
}> = {
  bronze: { gold: 5000, tickets: 1, title: null },
  silver: { gold: 10000, tickets: 3, title: null },
  gold: { gold: 20000, tickets: 5, title: '황금의 전사' },
  platinum: { gold: 35000, tickets: 8, title: '플래티넘 챔피언' },
  diamond: { gold: 50000, tickets: 12, title: '다이아몬드 마스터' },
  master: { gold: 100000, tickets: 20, title: '전설의 투사' },
}

// =============================================
// 주간 보상
// =============================================

export interface WeeklyReward {
  id: string
  userId: string
  weekStart: Date
  tierAtClaim: LeagueTier
  goldReward: number
  ticketReward: number
  claimedAt: Date
}

// 이번 주 시작일 계산 (월요일 기준)
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// 주간 보상 수령 가능 여부
export function canClaimWeeklyReward(lastClaim: Date | null): boolean {
  if (!lastClaim) return true

  const currentWeekStart = getWeekStart()
  const lastClaimWeekStart = getWeekStart(lastClaim)

  return currentWeekStart.getTime() > lastClaimWeekStart.getTime()
}

// =============================================
// ELO 레이팅 계산
// =============================================

export const ELO_CONFIG = {
  K_FACTOR: 32,           // K-factor
  MIN_RATING: 0,          // 최소 레이팅
  INITIAL_RATING: 1000,   // 초기 레이팅
} as const

// 예상 승률 계산
export function getExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
}

// 레이팅 변동 계산
export function calculateRatingChange(
  winnerRating: number,
  loserRating: number,
  isDraw: boolean = false
): { winnerChange: number; loserChange: number } {
  const { K_FACTOR } = ELO_CONFIG

  const expectedWinner = getExpectedScore(winnerRating, loserRating)
  const expectedLoser = 1 - expectedWinner

  if (isDraw) {
    return {
      winnerChange: Math.round(K_FACTOR * (0.5 - expectedWinner)),
      loserChange: Math.round(K_FACTOR * (0.5 - expectedLoser)),
    }
  }

  return {
    winnerChange: Math.round(K_FACTOR * (1 - expectedWinner)),
    loserChange: Math.round(K_FACTOR * (0 - expectedLoser)),
  }
}

// 레이팅 업데이트 (최소값 보장)
export function updateRating(currentRating: number, change: number): number {
  return Math.max(ELO_CONFIG.MIN_RATING, currentRating + change)
}

// =============================================
// 보상 계산
// =============================================

export interface BattleRewards {
  gold: number
  ratingChange: number
  cardDropChance: number  // 카드 드랍 확률 (0-1)
}

// 승리/패배/무승부별 기본 보상
export const BASE_REWARDS = {
  WIN: { gold: 500, cardDropChance: 0.3 },
  LOSE: { gold: 100, cardDropChance: 0.05 },
  DRAW: { gold: 250, cardDropChance: 0.15 },
} as const

// 티어별 보상 배율
export const TIER_REWARD_MULTIPLIERS: Record<LeagueTier, number> = {
  bronze: 1.0,
  silver: 1.2,
  gold: 1.5,
  platinum: 1.8,
  diamond: 2.2,
  master: 3.0,
}

// 배틀 보상 계산
export function calculateBattleRewards(
  result: 'win' | 'lose' | 'draw',
  playerTier: LeagueTier,
  ratingChange: number,
  isRevenge: boolean = false
): BattleRewards {
  const baseReward = BASE_REWARDS[result.toUpperCase() as keyof typeof BASE_REWARDS]
  const tierMultiplier = TIER_REWARD_MULTIPLIERS[playerTier]
  const revengeMultiplier = isRevenge ? 1.5 : 1.0

  return {
    gold: Math.floor(baseReward.gold * tierMultiplier * revengeMultiplier),
    ratingChange,
    cardDropChance: baseReward.cardDropChance,
  }
}
