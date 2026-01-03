import type { CharacterStats } from './stats'
import type { BattleCard } from './battleCard'
import type { EquippedItems } from './equipment'

// =============================================
// 배틀 라운드
// =============================================

export interface BattleRound {
  round: number

  // 이번 라운드 선공자
  firstAttacker: 'attacker' | 'defender'

  // 공격자 행동
  attackerAction: {
    damage: number
    isCrit: boolean
    cardUsed: BattleCard | null
    cardEffect: string | null  // 카드 효과 설명
  }

  // 방어자 행동
  defenderAction: {
    damage: number
    isCrit: boolean
    cardUsed: BattleCard | null
    cardEffect: string | null
  }

  // 라운드 후 HP 상태
  attackerHpBefore: number
  attackerHpAfter: number
  defenderHpBefore: number
  defenderHpAfter: number

  // 특수 이벤트
  events: RoundEvent[]
}

export type RoundEventType =
  | 'critical_hit'
  | 'damage_reflect'
  | 'heal'
  | 'immunity'
  | 'stun'
  | 'double_attack'
  | 'first_strike'

export interface RoundEvent {
  type: RoundEventType
  source: 'attacker' | 'defender'
  value: number
  description: string
}

// =============================================
// 배틀 결과
// =============================================

export type PvPBattleResult = 'attacker_win' | 'defender_win' | 'draw'

export interface PvPBattle {
  id: string
  attackerId: string
  defenderId: string

  // 참가자 정보
  attackerName: string
  defenderName: string

  // 초기 스탯
  attackerStats: CharacterStats
  defenderStats: CharacterStats

  // 사용 카드
  attackerCards: BattleCard[]
  defenderCards: BattleCard[]

  // 실시간 배틀 액션 (새 시스템)
  actions: RealtimeBattleAction[]
  battleDuration: number  // 실제 배틀 소요 시간 (ms)

  // 레거시: 라운드 기반 (호환성)
  rounds: BattleRound[]
  totalRounds: number

  // 선공 정보 (레거시)
  firstAttacker: 'attacker' | 'defender'
  attackerSpeed: number
  defenderSpeed: number

  // 공격 횟수 통계
  attackerAttackCount: number
  defenderAttackCount: number

  // 최종 결과
  result: PvPBattleResult
  winnerId: string | null

  // 최종 HP
  attackerFinalHp: number
  defenderFinalHp: number

  // 보상 및 레이팅
  attackerReward: number
  defenderReward: number
  attackerRatingChange: number
  defenderRatingChange: number

  // 메타데이터
  isRevenge: boolean
  createdAt: Date
}

// =============================================
// 배틀 스냅샷 (저장용)
// =============================================

export interface BattleSnapshot {
  oderId: string
  username: string
  stats: CharacterStats
  combatPower: number
  equipment: EquippedItems
  cards: BattleCard[]
  tier: string
  rating: number
}

// =============================================
// 배틀 상태 (진행 중)
// =============================================

export type PvPBattleStatus =
  | 'idle'           // 대기
  | 'searching'      // 상대 검색 중
  | 'preparing'      // 덱 선택 중
  | 'ready'          // 준비 완료
  | 'fighting'       // 전투 중 (애니메이션)
  | 'finished'       // 완료

export interface PvPBattleState {
  status: PvPBattleStatus
  opponent: PvPOpponent | null
  attackDeck: BattleCard[]
  currentRound: number
  battle: PvPBattle | null
  error: string | null
}

// =============================================
// 상대 정보
// =============================================

export interface PvPOpponent {
  userId: string
  username: string
  rating: number
  tier: string
  combatPower: number
  stats: CharacterStats
  cardCount: number  // 방어덱 카드 수 (비공개이므로 개수만)
  isAI?: boolean     // AI 상대 여부 (폴백용)
}

// =============================================
// 배틀 로그 (기록 조회용)
// =============================================

export interface PvPBattleLog {
  id: string
  opponentId: string
  opponentName: string
  opponentTier: string

  // 내가 공격자인지 방어자인지
  isAttacker: boolean

  result: PvPBattleResult
  myResult: 'win' | 'lose' | 'draw'

  ratingChange: number
  goldReward: number
  totalRounds: number

  isRevenge: boolean
  canRevenge: boolean  // 방어전이고 아직 복수 안했으면 true

  createdAt: Date
}

// =============================================
// 실시간 배틀 액션 (새 시스템)
// =============================================

export interface RealtimeBattleAction {
  timestamp: number          // ms 단위 시간
  actor: 'attacker' | 'defender'
  type: 'attack' | 'heal' | 'effect'
  damage: number
  isCrit: boolean
  cardUsed: BattleCard | null
  actorHpAfter: number       // 공격자의 HP (힐/반사 후)
  targetHpAfter: number      // 피격자의 HP
  description: string
}

// =============================================
// 배틀 설정
// =============================================

export const PVP_BATTLE_CONFIG = {
  // 실시간 배틀 설정
  BATTLE_DURATION: 15000,      // 배틀 총 시간 (15초)
  BASE_ATTACK_INTERVAL: 2000,  // 기본 공격 간격 (2초) - 공속 100 기준
  MIN_ATTACK_INTERVAL: 500,    // 최소 공격 간격 (0.5초)

  // 카드 발동 주기 (5초마다)
  CARD_TRIGGER_INTERVAL: 5000,

  // 데미지 랜덤 범위 (±10%)
  DAMAGE_VARIANCE: 0.10,

  // 일일 대전 제한
  DAILY_BATTLE_LIMIT: 10,

  // 복수전 보너스 배율
  REVENGE_BONUS_MULTIPLIER: 1.5,

  // 기본 보상
  BASE_WIN_REWARD: 500,
  BASE_LOSE_REWARD: 100,
  BASE_DRAW_REWARD: 250,

  // 애니메이션 속도 (1000ms 배틀 시간 = 100ms 애니메이션)
  ANIMATION_SPEED_RATIO: 0.1,
} as const

// =============================================
// 데미지 계산 결과
// =============================================

export interface DamageResult {
  baseDamage: number
  finalDamage: number
  isCrit: boolean
  critMultiplier: number
  defenseReduction: number
  penetrationBonus: number
  cardBonus: number
  reflectedDamage: number
}

// =============================================
// 유틸리티 타입
// =============================================

// 선공 결정 결과
export interface TurnOrderResult {
  firstAttacker: 'attacker' | 'defender'
  attackerSpeed: number
  defenderSpeed: number
  attackerRoll: number
  defenderRoll: number
}

// ELO 레이팅 변경 결과
export interface RatingChangeResult {
  winnerChange: number
  loserChange: number
  drawChange: { attacker: number, defender: number }
}
