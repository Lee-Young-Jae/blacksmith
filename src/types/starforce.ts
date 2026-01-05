// 강화 결과 타입
export type EnhanceResult = 'success' | 'maintain' | 'destroy'

// 스타포스 설정
export interface StarForceConfig {
  level: number
  successRate: number
  maintainRate: number
  destroyRate: number
  attackBonus: number
  costMultiplier: number
  isSpecialLevel: boolean
}

// 찬스타임 상태
export interface ChanceTimeState {
  isActive: boolean
  consecutiveFails: number
}

// 강화 결과 이벤트
export interface EnhanceEvent {
  weaponId: string
  weaponName: string
  fromLevel: number
  toLevel: number
  result: EnhanceResult
  wasChanceTime: boolean
  timestamp: Date
}

// 실시간 피드 아이템
export interface EnhancementFeedItem {
  id: string
  userId?: string  // 묵념 전송을 위한 유저 ID (목 데이터는 없음)
  username: string
  weaponName: string
  fromLevel: number
  toLevel: number
  result: EnhanceResult
  wasChanceTime: boolean
  timestamp: Date
}
