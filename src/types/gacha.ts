import type { EquipmentSlot, EquipmentBase } from './equipment'

// 가챠 비용 (간단한 고정 비용)
export const GACHA_SINGLE_COST = 300      // 1회 뽑기
export const GACHA_MULTI_COST = 2700      // 10회 뽑기 (10% 할인)

// 가챠 결과
export interface GachaResult {
  equipment: EquipmentBase
  slot: EquipmentSlot
  isNew: boolean           // 처음 획득한 장비인지
}

// 10연차 결과
export interface GachaMultiResult {
  results: GachaResult[]
  totalCost: number
  newPullCount: number
}
