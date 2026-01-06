/**
 * 수련의 숲 (Training Forest) 타입 정의
 *
 * 층별로 강해지는 적을 상대하여 자신의 강함을 측정하는 시스템
 */

import type { CharacterStats } from './stats'

// =============================================
// 타워 상태
// =============================================

export type TowerBattleStatus = 'idle' | 'ready' | 'fighting' | 'victory' | 'defeat'

export type TowerEnemyType = 'scarecrow' | 'monster'

// =============================================
// 타워 적 정의
// =============================================

export interface TowerEnemyImages {
  idle: string      // 0.png - 기본 상태
  hit: string       // 1.png - 피격 상태
  attack: string    // 2.png - 공격 상태
  death: string     // 3.png - 사망 상태
}

export interface TowerEnemy {
  id: string
  name: string
  type: TowerEnemyType
  floor: number
  stats: CharacterStats
  images: TowerEnemyImages   // 이미지 경로들
  emoji: string              // 이미지 없을 때 표시할 이모지
}

// =============================================
// 보상 정의
// =============================================

export interface TowerReward {
  baseGold: number           // 기본 클리어 골드
  milestoneBonus: number     // 10층 단위 최초 클리어 보너스
  recordBonus: number        // 최고 기록 갱신 보너스
  totalGold: number          // 총 획득 골드
}

// =============================================
// 진행 상태
// =============================================

export interface TowerProgress {
  currentFloor: number         // 현재 도전 층
  highestFloor: number         // 최고 기록 층
  firstClearMilestones: number[] // 10, 20, 30... 최초 클리어 완료 층
  totalAttempts: number        // 총 시도 횟수
  totalGoldEarned: number      // 총 획득 골드
}

// =============================================
// 배틀 결과
// =============================================

export interface TowerBattleResult {
  floor: number
  success: boolean
  timeRemaining: number        // 남은 시간 (ms)
  playerDamageDealt: number    // 플레이어가 준 총 데미지
  enemyDamageDealt: number     // 적이 준 총 데미지
  playerFinalHp: number        // 플레이어 최종 HP
  enemyFinalHp: number         // 적 최종 HP
  rewards: TowerReward
  isNewRecord: boolean         // 최고 기록 갱신 여부
  isFirstMilestone: boolean    // 10층 단위 최초 클리어
}

// =============================================
// 층별 설정
// =============================================

export interface TowerFloorConfig {
  floor: number
  enemy: TowerEnemy
  timeLimit: number           // ms
  rewards: TowerReward
}

// =============================================
// 배틀 설정 상수
// =============================================

export const TOWER_CONFIG = {
  // 시간 제한
  TIME_LIMIT: 30000,           // 30초

  // 적 스탯 기본값 (1층)
  BASE_HP: 200,                // 적정 HP
  BASE_DEFENSE: 8,             // 약간 너프
  BASE_ATTACK: 20,             // 대폭 상향 (3 → 20) - 유저에게 위협적
  BASE_CRIT_RATE: 5,           // 상향 (3 → 5)
  BASE_CRIT_DAMAGE: 150,       // 상향 (120 → 150)
  BASE_ATTACK_SPEED: 100,      // 상향 (80 → 100) - 더 빠른 공격

  // 층별 스케일링
  HP_SCALING: 1.10,            // 층별 HP 10% 증가
  DEFENSE_SCALING: 1.06,       // 층별 방어력 6% 증가
  ATTACK_SCALING: 1.12,        // 대폭 상향 (1.05 → 1.12) 층별 공격력 12% 증가
  CRIT_SCALING: 1.03,          // 상향 (1.02 → 1.03) 층별 치명타 확률 3% 증가
  SPEED_SCALING: 1.02,         // 상향 (1.01 → 1.02) 층별 공격속도 2% 증가

  // 배틀 밸런스
  HP_MULTIPLIER: 1.5,          // 적정 배율 (1 → 1.5)
  PLAYER_HP_MULTIPLIER: 2,     // 플레이어 HP 배율
  DAMAGE_REDUCTION: 0.8,       // 데미지 감소 (20% 감소)

  // 보상
  BASE_GOLD_REWARD: 100,       // 기본 골드 보상
  GOLD_SCALING: 1.05,          // 층별 골드 5% 증가
  MILESTONE_BONUS: 1000,       // 10층 단위 최초 클리어 보너스
  RECORD_BONUS_MULTIPLIER: 0.5, // 기록 갱신 보너스 (해당 층 보상의 50%)

  // 배틀 루프
  BASE_ATTACK_INTERVAL: 2000,  // 공속 100 기준 공격 간격 (ms)
  MIN_ATTACK_INTERVAL: 500,    // 최소 공격 간격 (ms)
  CARD_TRIGGER_INTERVAL: 5000, // 카드 발동 간격 (ms)
} as const

// =============================================
// 층별 적 외형 정의
// =============================================

export interface EnemyVariant {
  name: string
  emoji: string
  type: TowerEnemyType
  minFloor: number
}

export const ENEMY_VARIANTS: EnemyVariant[] = [
  { name: '나무 허수아비', emoji: '🎯', type: 'scarecrow', minFloor: 1 },
  { name: '짚 허수아비', emoji: '🌾', type: 'scarecrow', minFloor: 11 },
  { name: '강철 허수아비', emoji: '⚙️', type: 'scarecrow', minFloor: 21 },
  { name: '마법 허수아비', emoji: '✨', type: 'scarecrow', minFloor: 31 },
  { name: '골렘', emoji: '🗿', type: 'monster', minFloor: 41 },
  { name: '거인', emoji: '👹', type: 'monster', minFloor: 51 },
  { name: '드래곤', emoji: '🐉', type: 'monster', minFloor: 61 },
  { name: '고대의 수호자', emoji: '⚔️', type: 'monster', minFloor: 71 },
  { name: '심연의 군주', emoji: '👑', type: 'monster', minFloor: 81 },
  { name: '세계의 끝', emoji: '💀', type: 'monster', minFloor: 91 },
]

// =============================================
// 티어 (랭킹 표시용)
// =============================================

export type TowerTier = 'wood' | 'stone' | 'iron' | 'steel' | 'mithril' | 'legendary'

export const TOWER_TIER_THRESHOLDS: Record<TowerTier, number> = {
  wood: 1,
  stone: 10,
  iron: 30,
  steel: 50,
  mithril: 80,
  legendary: 100,
}

export const TOWER_TIER_NAMES: Record<TowerTier, string> = {
  wood: '나무',
  stone: '돌',
  iron: '철',
  steel: '강철',
  mithril: '미스릴',
  legendary: '전설',
}

export const TOWER_TIER_EMOJIS: Record<TowerTier, string> = {
  wood: '🪵',
  stone: '🪨',
  iron: '⚙️',
  steel: '🔩',
  mithril: '💠',
  legendary: '👑',
}

export const TOWER_TIER_COLORS: Record<TowerTier, string> = {
  wood: 'text-amber-700',
  stone: 'text-gray-400',
  iron: 'text-slate-400',
  steel: 'text-blue-400',
  mithril: 'text-purple-400',
  legendary: 'text-yellow-400',
}

// =============================================
// 티어 헬퍼 함수
// =============================================

export function getTowerTier(floor: number): TowerTier {
  if (floor >= 100) return 'legendary'
  if (floor >= 80) return 'mithril'
  if (floor >= 50) return 'steel'
  if (floor >= 30) return 'iron'
  if (floor >= 10) return 'stone'
  return 'wood'
}

// =============================================
// 타워 상태 (관리자 제어)
// =============================================

export interface TowerStatus {
  isOpen: boolean
  message: string
}

// =============================================
// 리더보드 타입
// =============================================

export interface TowerLeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatarUrl?: string
  highestFloor: number
  tier: TowerTier
}

// =============================================
// DB 레코드 타입
// =============================================

export interface TowerRecordRow {
  id: string
  user_id: string
  highest_floor: number
  current_floor: number
  first_clear_milestones: number[]
  total_attempts: number
  total_gold_earned: number
  created_at: string
  updated_at: string
}

// =============================================
// 시즌 시스템 타입
// =============================================

export interface TowerSeason {
  id: string
  name: string
  description?: string
  startsAt: Date
  endsAt: Date
  isActive: boolean
  rewardsDistributed: boolean
  timeRemainingMs?: number
}

// =============================================
// 유연한 보상 아이템 시스템
// =============================================

// 보상 아이템 타입 (확장 가능)
export type RewardItemType = 'gold' | 'enhancement_ticket' | string

// 기본 보상 아이템 인터페이스
export interface BaseRewardItem {
  type: RewardItemType
}

// 골드 보상
export interface GoldRewardItem extends BaseRewardItem {
  type: 'gold'
  amount: number
}

// 강화권 보상
export interface EnhancementTicketRewardItem extends BaseRewardItem {
  type: 'enhancement_ticket'
  level: number   // 강화권 레벨 (예: 17 = 17성 강화권)
  count: number   // 개수
}

// 커스텀 아이템 보상 (추후 확장용)
export interface CustomRewardItem extends BaseRewardItem {
  type: string
  itemId?: string
  count?: number
  data?: Record<string, unknown>
}

// 모든 보상 아이템 유니온 타입
export type RewardItem = GoldRewardItem | EnhancementTicketRewardItem | CustomRewardItem

// 보상 아이템 타입 정의 (DB의 reward_item_types 테이블과 매핑)
export interface RewardItemTypeDefinition {
  id: string
  displayName: string
  description?: string
  icon?: string
}

// 기본 제공 보상 타입
export const REWARD_ITEM_TYPES: RewardItemTypeDefinition[] = [
  { id: 'gold', displayName: '골드', description: '게임 내 기본 화폐', icon: '💰' },
  { id: 'enhancement_ticket', displayName: '강화권', description: 'N성 강화권 - 장비를 해당 성급으로 즉시 강화', icon: '🎫' },
]

// =============================================
// 시즌 보상 티어
// =============================================

export interface TowerSeasonRewardTier {
  rankFrom: number
  rankTo: number
  // 레거시 필드 (하위 호환성)
  goldReward: number
  enhancementTicketLevel: number
  enhancementTicketCount: number
  // 유연한 보상 아이템 배열
  rewardItems?: RewardItem[]
}

export interface TowerSeasonUserReward {
  id: string
  seasonId: string
  seasonName: string
  finalRank: number
  finalFloor: number
  // 레거시 필드 (하위 호환성)
  goldReward: number
  enhancementTicketLevel: number
  enhancementTicketCount: number
  // 유연한 보상 아이템 배열
  rewardItems?: RewardItem[]
  isClaimed: boolean
}

export interface CreateSeasonParams {
  name: string
  description?: string
  startsAt: Date
  endsAt: Date
  rewards: TowerSeasonRewardTier[]
}

// =============================================
// 보상 헬퍼 함수
// =============================================

/**
 * 보상 아이템 배열에서 총 골드 계산
 */
export function getTotalGoldFromRewards(items: RewardItem[]): number {
  return items
    .filter((item): item is GoldRewardItem => item.type === 'gold')
    .reduce((sum, item) => sum + item.amount, 0)
}

/**
 * 보상 아이템 배열에서 강화권 목록 추출
 */
export function getEnhancementTicketsFromRewards(items: RewardItem[]): EnhancementTicketRewardItem[] {
  return items.filter((item): item is EnhancementTicketRewardItem => item.type === 'enhancement_ticket')
}

/**
 * 보상 아이템을 표시용 문자열로 변환
 */
export function formatRewardItem(item: RewardItem): string {
  switch (item.type) {
    case 'gold':
      return `${(item as GoldRewardItem).amount.toLocaleString()} 골드`
    case 'enhancement_ticket': {
      const ticket = item as EnhancementTicketRewardItem
      return `${ticket.level}성 강화권 x${ticket.count}`
    }
    default:
      return `알 수 없는 보상 (${item.type})`
  }
}

/**
 * 보상 아이템 배열을 요약 문자열로 변환
 */
export function formatRewardsSummary(items: RewardItem[]): string {
  if (!items || items.length === 0) return '보상 없음'
  return items.map(formatRewardItem).join(', ')
}
