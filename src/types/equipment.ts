import type { CharacterStats } from './stats'
import type { PotentialLine } from './potential'

// 장비 슬롯 타입 (7부위)
export type EquipmentSlot =
  | 'hat'      // 모자
  | 'top'      // 상의
  | 'bottom'   // 하의
  | 'weapon'   // 무기
  | 'gloves'   // 장갑
  | 'shoes'    // 신발
  | 'earring'  // 귀고리

export const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  'hat', 'top', 'bottom', 'weapon', 'gloves', 'shoes', 'earring'
]

export const EQUIPMENT_SLOT_NAMES: Record<EquipmentSlot, string> = {
  hat: '모자',
  top: '상의',
  bottom: '하의',
  weapon: '무기',
  gloves: '장갑',
  shoes: '신발',
  earring: '귀고리',
}

export const EQUIPMENT_SLOT_EMOJIS: Record<EquipmentSlot, string> = {
  hat: '🎩',
  top: '👕',
  bottom: '👖',
  weapon: '⚔️',
  gloves: '🧤',
  shoes: '👟',
  earring: '💎',
}

// 레벨 티어 (스타포스 레벨 기반)
export type LevelTier = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master'

export const LEVEL_TIERS: LevelTier[] = ['novice', 'apprentice', 'journeyman', 'expert', 'master']

export const LEVEL_TIER_NAMES: Record<LevelTier, string> = {
  novice: '초보',
  apprentice: '견습',
  journeyman: '숙련',
  expert: '전문',
  master: '장인',
}

export const LEVEL_TIER_COLORS: Record<LevelTier, string> = {
  novice: 'text-gray-400',
  apprentice: 'text-green-400',
  journeyman: 'text-blue-400',
  expert: 'text-purple-400',
  master: 'text-yellow-400',
}

// 레벨 티어 결정 (0-4: novice, 5-9: apprentice, 10-14: journeyman, 15-19: expert, 20+: master)
export function getLevelTier(level: number): LevelTier {
  if (level >= 20) return 'master'
  if (level >= 15) return 'expert'
  if (level >= 10) return 'journeyman'
  if (level >= 5) return 'apprentice'
  return 'novice'
}

// 장비 레벨 데이터 (각 레벨별 이름, 코멘트, 이미지)
export interface EquipmentLevel {
  name: string
  comment: string
  image?: string
}

// 장비 기본 데이터 (정적, 데이터 파일에 정의)
export interface EquipmentBase {
  id: string
  slot: EquipmentSlot
  baseStats: Partial<CharacterStats>
  emoji: string
  levels: EquipmentLevel[]  // 0-20 레벨별 진화 데이터
  potentialSlots: number    // 잠재옵션 라인 수 (기본 3)
}

// 현재 레벨의 장비 데이터 가져오기
export function getEquipmentAtLevel(equipment: EquipmentBase, level: number): EquipmentLevel {
  const safeLevel = Math.min(level, equipment.levels.length - 1)
  return equipment.levels[safeLevel]
}

// 장비 이름 가져오기 (레벨 기반)
export function getEquipmentName(equipment: EquipmentBase, level: number): string {
  return getEquipmentAtLevel(equipment, level).name
}

// 대장장이 코멘트 가져오기
export function getEquipmentComment(equipment: EquipmentBase, level: number): string {
  return getEquipmentAtLevel(equipment, level).comment
}

// 유저 장비 인스턴스
export interface UserEquipment {
  id: string                     // UUID
  equipmentBaseId: string        // 기본 장비 참조
  equipmentBase: EquipmentBase   // 기본 장비 데이터 (조인)
  starLevel: number              // 0-25 스타포스
  consecutiveFails: number       // 연속 실패 (찬스타임용)
  potentials: PotentialLine[]    // 잠재옵션 라인들 (각 라인별 등급)
  isEquipped: boolean            // 착용 여부
  createdAt: Date
  updatedAt: Date
}

// 장비 + 계산된 스탯 (표시용)
export interface EquipmentWithStats extends UserEquipment {
  calculatedStats: CharacterStats   // 스타포스 + 잠재옵션 적용 후 최종 스탯
  combatPower: number               // 전투력 기여도
}

// 슬롯별 착용 장비 맵
export type EquippedItems = Partial<Record<EquipmentSlot, UserEquipment>>

// 장비 필터 옵션
export interface EquipmentFilter {
  slot?: EquipmentSlot
  minStarLevel?: number
  maxStarLevel?: number
  isEquipped?: boolean
}

// 스타포스 강화 시 스탯 증가량 계산
export function getStarForceBonus(
  baseStats: Partial<CharacterStats>,
  starLevel: number
): Partial<CharacterStats> {
  const starMultiplier = 1 + (starLevel * 0.05) + (starLevel * starLevel * 0.002)

  const bonus: Partial<CharacterStats> = {}

  if (baseStats.attack) {
    bonus.attack = Math.floor(baseStats.attack * starMultiplier) - baseStats.attack
  }
  if (baseStats.defense) {
    bonus.defense = Math.floor(baseStats.defense * starMultiplier) - baseStats.defense
  }
  if (baseStats.hp) {
    bonus.hp = Math.floor(baseStats.hp * starMultiplier) - baseStats.hp
  }
  // 퍼센트 스탯은 스타포스로 증가하지 않음

  return bonus
}

// 장비의 총 스탯 계산 (기본 + 스타포스 + 잠재옵션)
export function calculateEquipmentStats(equipment: UserEquipment): CharacterStats {
  const { equipmentBase, starLevel, potentials } = equipment
  const starMultiplier = 1 + (starLevel * 0.05) + (starLevel * starLevel * 0.002)

  // 기본 스탯 × 스타포스 배율
  const baseWithMultipliers: CharacterStats = {
    attack: Math.floor((equipmentBase.baseStats.attack || 0) * starMultiplier),
    defense: Math.floor((equipmentBase.baseStats.defense || 0) * starMultiplier),
    hp: Math.floor((equipmentBase.baseStats.hp || 0) * starMultiplier),
    critRate: equipmentBase.baseStats.critRate || 0,
    critDamage: equipmentBase.baseStats.critDamage || 0,
    penetration: equipmentBase.baseStats.penetration || 0,
  }

  // 잠재옵션 적용 (해제된 슬롯만)
  for (const line of potentials) {
    if (!line.isUnlocked) continue  // 해제되지 않은 슬롯은 스탯 미적용

    if (line.isPercentage) {
      // 퍼센트 보너스: 기본 스탯 기준
      const baseValue = baseWithMultipliers[line.stat] || 0
      baseWithMultipliers[line.stat] = baseValue + Math.floor(baseValue * line.value / 100)
    } else {
      // 고정 보너스
      baseWithMultipliers[line.stat] = (baseWithMultipliers[line.stat] || 0) + line.value
    }
  }

  return baseWithMultipliers
}

// 장비 이름 생성 (레벨 기반 이름 + 스타)
export function getEquipmentDisplayName(equipment: UserEquipment): string {
  const { equipmentBase, starLevel } = equipment
  const levelName = getEquipmentName(equipmentBase, starLevel)
  const starSuffix = starLevel > 0 ? ` +${starLevel}` : ''
  return `${levelName}${starSuffix}`
}

// 판매 가격 계산
export function getEquipmentSellPrice(equipment: UserEquipment): number {
  const { starLevel, potentials } = equipment
  const basePrice = 100  // 기본 판매가

  // 스타 레벨 보너스
  const levelBonus = 1 + starLevel * 5 + Math.pow(starLevel, 2)

  // 해제된 잠재옵션 슬롯 개수에 따른 보너스
  const unlockedSlots = potentials.filter(p => p.isUnlocked).length
  const potentialBonus = 1 + unlockedSlots * 0.5

  return Math.floor(basePrice * levelBonus * potentialBonus)
}

// 판매 시 잠재옵션 경고 필요 여부 (해제된 슬롯이 있으면 경고)
export function shouldWarnOnSell(equipment: UserEquipment): boolean {
  return equipment.potentials.some(p => p.isUnlocked)
}
