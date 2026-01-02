// Re-export all types
export * from './weapon'
export * from './starforce'
export * from './battle'

// 골드 시스템 설정
export interface GoldConfig {
  dailyGold: number
  baseEnhanceCost: number
  battleBaseReward: number
  sellBasePrice: number
}

export const GOLD_CONFIG: GoldConfig = {
  dailyGold: 10000,
  baseEnhanceCost: 100,
  battleBaseReward: 500,
  sellBasePrice: 50,
}
