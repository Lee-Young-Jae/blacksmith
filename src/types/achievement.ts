// 업적 등급
export type AchievementTier = 'common' | 'rare' | 'epic' | 'unique' | 'legendary'

// 업적 카테고리
export type AchievementCategory = 'battle' | 'enhancement' | 'collection'

// 테두리 효과 타입
export type BorderEffectType =
  | 'none'       // 효과 없음
  | 'glow'       // 은은한 글로우
  | 'pulse'      // 펄스 효과
  | 'sparkle'    // 반짝임 파티클
  | 'lightning'  // 번개 효과
  | 'aurora'     // 오로라/무지개 효과
  | 'fire'       // 불꽃 효과
  | 'rain'       // 비/골드 떨어지는 효과
  | 'wind'       // 바람/돌풍 효과
  | 'storm'      // 폭풍 효과
  | 'cosmic'     // 우주/별 효과
  | 'particles'  // 파티클 떠다니는 효과

// 테두리 색상 타입
export type BorderColorType =
  | 'gray' | 'blue' | 'purple' | 'amber' | 'yellow' | 'gold'
  | 'orange' | 'red' | 'cyan' | 'emerald' | 'indigo' | 'rainbow'

// 업적 조건 타입
export type AchievementConditionType =
  | 'pvp_wins'        // PvP 승리 수
  | 'pvp_win_streak'  // PvP 연승
  | 'max_star'        // 최고 스타포스 (레거시)
  | 'max_star_tier1'  // Tier1 무기 최고 스타포스
  | 'max_star_tier2'  // Tier2 무기 최고 스타포스
  | 'enhance_count'   // 강화 시도 횟수
  | 'total_gold'      // 누적 골드 획득
  | 'equipment_count' // 장비 보유 수
  | 'gacha_count'     // 가챠 횟수

// 업적 해금 조건
export interface AchievementCondition {
  type: AchievementConditionType
  target: number
  category: AchievementCategory
  season?: number  // 시즌 한정 업적의 경우
}

// 업적/테두리 정의 (DB achievement_borders 테이블)
export interface AchievementBorder {
  id: string
  tier: AchievementTier
  name: string
  description: string
  borderClass: string
  unlockCondition: AchievementCondition
  // 시즌 관련
  seasonId: number | null
  isSeasonal: boolean
  seasonEndDate: string | null
  // 개별 테두리 효과
  borderEffect: BorderEffectType
  borderColor: BorderColorType | null
  // 프레임 이미지 (업적별 고유)
  frameImage: string | null
}

// 유저 업적 진행 상황 (DB user_achievements 테이블)
export interface UserAchievement {
  borderId: string
  progress: number
  isUnlocked: boolean
  unlockedAt: string | null
}

// 업적 + 진행 상황 통합 (UI 표시용)
export interface AchievementWithProgress extends AchievementBorder {
  progress: number
  isUnlocked: boolean
  unlockedAt: string | null
}

// 등급별 한글 이름
export const ACHIEVEMENT_TIER_NAMES: Record<AchievementTier, string> = {
  common: '일반',
  rare: '레어',
  epic: '에픽',
  unique: '유니크',
  legendary: '전설',
}

// 등급별 텍스트 색상
export const ACHIEVEMENT_TIER_COLORS: Record<AchievementTier, string> = {
  common: 'text-gray-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  unique: 'text-amber-400',
  legendary: 'text-red-400',
}

// 등급별 배경 색상
export const ACHIEVEMENT_TIER_BG: Record<AchievementTier, string> = {
  common: 'bg-gray-500/20',
  rare: 'bg-blue-500/20',
  epic: 'bg-purple-500/20',
  unique: 'bg-amber-500/20',
  legendary: 'bg-red-500/20',
}

// 카테고리별 한글 이름
export const ACHIEVEMENT_CATEGORY_NAMES: Record<AchievementCategory, string> = {
  battle: '전투',
  enhancement: '강화',
  collection: '수집',
}

// 카테고리별 아이콘
export const ACHIEVEMENT_CATEGORY_ICONS: Record<AchievementCategory, string> = {
  battle: '⚔️',
  enhancement: '⭐',
  collection: '📦',
}

// DB Row 타입 (Supabase 응답용)
export interface AchievementBorderRow {
  id: string
  tier: AchievementTier
  name: string
  description: string | null
  border_class: string | null
  unlock_condition: AchievementCondition
  created_at: string
  // 시즌 관련
  season_id: number | null
  is_seasonal: boolean
  season_end_date: string | null
  // 개별 테두리 효과
  border_effect: BorderEffectType | null
  border_color: BorderColorType | null
  // 프레임 이미지 (업적별 고유)
  frame_image: string | null
}

export interface UserAchievementRow {
  user_id: string
  border_id: string
  progress: number
  is_unlocked: boolean
  unlocked_at: string | null
  created_at: string
  updated_at: string
}
