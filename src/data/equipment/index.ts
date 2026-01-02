import type { EquipmentBase, EquipmentSlot } from '../../types/equipment'
import { HATS } from './hats'
import { TOPS } from './tops'
import { BOTTOMS } from './bottoms'
import { WEAPONS } from './weapons'
import { GLOVES } from './gloves'
import { SHOES } from './shoes'
import { EARRINGS } from './earrings'

// 모든 장비 데이터
export const ALL_EQUIPMENT: EquipmentBase[] = [
  ...HATS,
  ...TOPS,
  ...BOTTOMS,
  ...WEAPONS,
  ...GLOVES,
  ...SHOES,
  ...EARRINGS,
]

// 슬롯별 장비 데이터
export const EQUIPMENT_BY_SLOT: Record<EquipmentSlot, EquipmentBase[]> = {
  hat: HATS,
  top: TOPS,
  bottom: BOTTOMS,
  weapon: WEAPONS,
  gloves: GLOVES,
  shoes: SHOES,
  earring: EARRINGS,
}

// ID로 장비 찾기
export function getEquipmentById(id: string): EquipmentBase | undefined {
  return ALL_EQUIPMENT.find(eq => eq.id === id)
}

// 슬롯의 랜덤 장비 가져오기
export function getRandomEquipmentBySlot(slot: EquipmentSlot): EquipmentBase {
  const pool = EQUIPMENT_BY_SLOT[slot]
  return pool[Math.floor(Math.random() * pool.length)]
}

// 전체에서 랜덤 장비 가져오기
export function getRandomEquipment(): EquipmentBase {
  return ALL_EQUIPMENT[Math.floor(Math.random() * ALL_EQUIPMENT.length)]
}

// 슬롯 개수
export const EQUIPMENT_COUNTS: Record<EquipmentSlot, number> = {
  hat: HATS.length,
  top: TOPS.length,
  bottom: BOTTOMS.length,
  weapon: WEAPONS.length,
  gloves: GLOVES.length,
  shoes: SHOES.length,
  earring: EARRINGS.length,
}

// 총 장비 개수
export const TOTAL_EQUIPMENT_COUNT = ALL_EQUIPMENT.length

// Re-export individual arrays
export { HATS, TOPS, BOTTOMS, WEAPONS, GLOVES, SHOES, EARRINGS }
