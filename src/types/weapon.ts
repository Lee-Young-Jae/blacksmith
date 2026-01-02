// 무기 카테고리
export type WeaponCategory =
  | 'sword'    // 검
  | 'axe'      // 도끼
  | 'bow'      // 활
  | 'whip'     // 채찍
  | 'club'     // 몽둥이
  | 'spear'    // 창
  | 'dagger'   // 단검
  | 'staff'    // 지팡이
  | 'hammer'   // 해머
  | 'scythe'   // 낫

// 레벨별 무기 진화 정보
export interface WeaponLevel {
  name: string           // 레벨별 이름
  image?: string         // 레벨별 이미지 (없으면 emoji 사용)
  comment: string        // 대장장이 코멘트
}

// 무기 타입 정의
export interface WeaponType {
  id: string
  category: WeaponCategory
  baseAttack: number
  sellPriceBase: number
  emoji: string
  levels: WeaponLevel[]  // 0~20레벨 진화 정보
}

// 사용자 무기 인스턴스
export interface UserWeapon {
  id: string
  weaponTypeId: string
  weaponType: WeaponType
  starLevel: number
  isDestroyed: boolean
  consecutiveFails: number
  createdAt: Date
  totalAttack: number
}

// 현재 레벨의 무기 정보 가져오기 헬퍼
export function getWeaponAtLevel(weapon: WeaponType, level: number): WeaponLevel {
  // 레벨이 levels 배열 범위를 벗어나면 마지막 레벨 정보 사용
  const safeLevel = Math.min(level, weapon.levels.length - 1)
  return weapon.levels[Math.max(0, safeLevel)]
}

// 현재 레벨의 무기 이름 가져오기
export function getWeaponName(weapon: WeaponType, level: number): string {
  return getWeaponAtLevel(weapon, level).name
}

// 현재 레벨의 대장장이 코멘트 가져오기
export function getWeaponComment(weapon: WeaponType, level: number): string {
  return getWeaponAtLevel(weapon, level).comment
}

// 레벨 구간별 색상 (0-4, 5-9, 10-14, 15-19, 20+)
export type LevelTier = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master'

export function getLevelTier(level: number): LevelTier {
  if (level >= 20) return 'master'
  if (level >= 15) return 'expert'
  if (level >= 10) return 'journeyman'
  if (level >= 5) return 'apprentice'
  return 'novice'
}

export const LEVEL_COLORS: Record<LevelTier, string> = {
  novice: 'text-gray-400',
  apprentice: 'text-green-400',
  journeyman: 'text-blue-400',
  expert: 'text-purple-400',
  master: 'text-yellow-400',
}

export const LEVEL_BG_COLORS: Record<LevelTier, string> = {
  novice: 'from-gray-600 to-gray-800',
  apprentice: 'from-green-600 to-green-900',
  journeyman: 'from-blue-600 to-blue-900',
  expert: 'from-purple-600 to-purple-900',
  master: 'from-yellow-500 to-orange-700',
}

export const LEVEL_GLOW: Record<LevelTier, string> = {
  novice: '',
  apprentice: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  journeyman: 'drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]',
  expert: 'drop-shadow-[0_0_16px_rgba(168,85,247,0.7)]',
  master: 'drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]',
}

export const LEVEL_TIER_NAMES: Record<LevelTier, string> = {
  novice: '초보',
  apprentice: '견습',
  journeyman: '숙련',
  expert: '전문가',
  master: '마스터',
}

// 카테고리별 한글 이름
export const CATEGORY_NAMES: Record<WeaponCategory, string> = {
  sword: '검',
  axe: '도끼',
  bow: '활',
  whip: '채찍',
  club: '몽둥이',
  spear: '창',
  dagger: '단검',
  staff: '지팡이',
  hammer: '해머',
  scythe: '낫',
}

