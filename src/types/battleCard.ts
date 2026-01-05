// 배틀 카드 등급
export type BattleCardTier = 'common' | 'rare' | 'epic' | 'legendary'

// 카드 발동 타입
export type CardActivationType = 'passive' | 'active'

export const BATTLE_CARD_TIERS: BattleCardTier[] = ['common', 'rare', 'epic', 'legendary']

export const BATTLE_CARD_TIER_NAMES: Record<BattleCardTier, string> = {
  common: '일반',
  rare: '레어',
  epic: '에픽',
  legendary: '전설',
}

export const BATTLE_CARD_TIER_COLORS: Record<BattleCardTier, string> = {
  common: 'text-gray-400 border-gray-500 bg-gray-800/50',
  rare: 'text-blue-400 border-blue-500 bg-blue-900/30',
  epic: 'text-purple-400 border-purple-500 bg-purple-900/30',
  legendary: 'text-orange-400 border-orange-500 bg-orange-900/30',
}

// 등급별 출현 확률
export const BATTLE_CARD_TIER_RATES: Record<BattleCardTier, number> = {
  common: 0.60,     // 60%
  rare: 0.25,       // 25%
  epic: 0.12,       // 12%
  legendary: 0.03,  // 3%
}

// 카드 효과 종류
export type BattleCardEffectType =
  | 'attack_boost'       // 공격력 증가
  | 'defense_boost'      // 방어력 증가
  | 'crit_rate_boost'    // 치명타 확률 증가
  | 'crit_damage_boost'  // 치명타 데미지 증가
  | 'penetration_boost'  // 관통력 증가
  | 'guaranteed_crit'    // 확정 치명타 (지속시간 동안)
  | 'damage_reflect'     // 데미지 반사
  | 'first_strike'       // 번개 일섬 (상대 최대 HP 비례 즉시 데미지)
  | 'gold_bonus'         // 골드 보너스
  // PvP 전용 효과
  | 'hp_recovery'        // HP 회복
  | 'speed_boost'        // 광폭화 (공격속도 증가)
  | 'immunity'           // 무적 (지속시간 동안 피해 무효)
  | 'lifesteal'          // 흡혈 (데미지의 일부 HP 회복)
  | 'double_attack'      // 폭풍 연타 (지속시간 동안 2배 데미지)
  | 'stun'               // 기절 (상대 행동 불가)
  | 'silence'            // 침묵 (상대 스킬 사용 불가, 공격은 가능)
  // 회복 카운터 효과
  | 'anti_heal'          // 치유 감소 (상대 회복량 감소)
  | 'berserker'          // 광전사 (체력 낮을수록 공격속도 증가)
  | 'execute'            // 처형 (저체력 상대에게 추가 데미지)
  | 'shield_bash'        // 방패 강타 (방어력 기반 즉시 데미지)
  | 'cooldown_reset'     // 쿨타임 초기화 (액티브 스킬 사용 시 확률적 쿨타임 초기화)

// 카드 효과 데이터
export interface BattleCardEffect {
  type: BattleCardEffectType
  value: number           // 효과 수치 (%, 고정값 등)
  isPercentage: boolean   // % 인지 고정값인지
}

// 배틀 카드
export interface BattleCard {
  id: string
  name: string
  description: string
  tier: BattleCardTier
  effect: BattleCardEffect
  emoji: string
  // 발동 타입 관련
  activationType: CardActivationType  // 'passive' = 자동, 'active' = 수동
  cooldown: number                    // 쿨다운 (초) - active만 해당
  duration: number                    // 효과 지속시간 (초) - 0이면 즉시 효과
}

// 카드 슬롯 (리롤 상태 포함)
export interface BattleCardSlot {
  card: BattleCard
  hasRerolled: boolean
}

// 효과 타입별 기본 정보
// 밸런스 기준: 30초 배틀, 약 14-16회 공격, 모든 스킬의 총 가치가 비슷하도록 설계
export const EFFECT_TYPE_INFO: Record<BattleCardEffectType, {
  name: string
  emoji: string
  minTier: BattleCardTier
  isPvPOnly: boolean
  activationType: CardActivationType
  cooldown: number      // 쿨다운 (초)
  duration: number      // 지속시간 (초), 0 = 즉시 효과
}> = {
  // =============================================
  // 패시브 효과들 (배틀 내내 적용)
  // 가치 기준: 전설 기준 약 100-150 총 가치
  // =============================================
  attack_boost: { name: '공격력 증가', emoji: '⚔️', minTier: 'common', isPvPOnly: false, activationType: 'passive', cooldown: 0, duration: 0 },
  defense_boost: { name: '방어력 증가', emoji: '🛡️', minTier: 'common', isPvPOnly: false, activationType: 'passive', cooldown: 0, duration: 0 },
  crit_rate_boost: { name: '치명타 확률', emoji: '🎯', minTier: 'common', isPvPOnly: false, activationType: 'passive', cooldown: 0, duration: 0 },
  crit_damage_boost: { name: '치명타 데미지', emoji: '💥', minTier: 'common', isPvPOnly: false, activationType: 'passive', cooldown: 0, duration: 0 },
  penetration_boost: { name: '관통력 증가', emoji: '🗡️', minTier: 'common', isPvPOnly: false, activationType: 'passive', cooldown: 0, duration: 0 },
  damage_reflect: { name: '데미지 반사', emoji: '🪞', minTier: 'rare', isPvPOnly: false, activationType: 'passive', cooldown: 0, duration: 0 },
  gold_bonus: { name: '골드 보너스', emoji: '💰', minTier: 'common', isPvPOnly: false, activationType: 'passive', cooldown: 0, duration: 0 },
  lifesteal: { name: '영혼 흡수', emoji: '🧛', minTier: 'rare', isPvPOnly: true, activationType: 'passive', cooldown: 0, duration: 0 },

  // =============================================
  // 액티브 효과들 (버튼으로 발동)
  // 밸런스: 쿨다운 대비 효과 가치 균등화
  // =============================================
  // 번개 일섬: 상대 최대 HP 비례 즉시 데미지 (CD 8초, 약 3-4회 사용)
  first_strike: { name: '번개 일섬', emoji: '⚡', minTier: 'common', isPvPOnly: false, activationType: 'active', cooldown: 8, duration: 0 },

  // 확정 치명타: 4초간 모든 공격 치명타 (CD 10초, 약 3회 사용)
  guaranteed_crit: { name: '확정 치명타', emoji: '⚡', minTier: 'epic', isPvPOnly: false, activationType: 'active', cooldown: 10, duration: 4 },

  // HP 회복: 즉시 회복 (CD 12초, 약 2-3회 사용)
  hp_recovery: { name: 'HP 회복', emoji: '💚', minTier: 'rare', isPvPOnly: true, activationType: 'active', cooldown: 12, duration: 0 },

  // 광폭화: 5초간 공격속도 증가 (CD 10초, 약 3회 사용)
  speed_boost: { name: '광폭화', emoji: '🔥', minTier: 'rare', isPvPOnly: true, activationType: 'active', cooldown: 10, duration: 5 },

  // 무적: 2.5초간 피해 무효 (CD 12초, 약 2-3회 사용)
  immunity: { name: '무적', emoji: '✨', minTier: 'epic', isPvPOnly: true, activationType: 'active', cooldown: 12, duration: 2.5 },

  // 폭풍 연타: 4초간 2배 데미지 (CD 12초, 약 2-3회 사용)
  double_attack: { name: '폭풍 연타', emoji: '🌪️', minTier: 'legendary', isPvPOnly: true, activationType: 'active', cooldown: 12, duration: 4 },

  // 기절: 1.5초간 상대 행동 불가 (CD 12초, 약 2-3회 사용)
  stun: { name: '기절', emoji: '💫', minTier: 'legendary', isPvPOnly: true, activationType: 'active', cooldown: 12, duration: 1.5 },

  // 침묵: 3~4초간 상대 스킬 사용 불가 (공격은 가능) (CD 10초)
  silence: { name: '침묵', emoji: '🤐', minTier: 'epic', isPvPOnly: true, activationType: 'active', cooldown: 10, duration: 3 },

  // =============================================
  // 회복 카운터 효과들 (패시브)
  // =============================================
  // 치유 감소: 상대 회복량 감소 (회복 메타 카운터)
  anti_heal: { name: '치유 감소', emoji: '🩸', minTier: 'rare', isPvPOnly: true, activationType: 'passive', cooldown: 0, duration: 0 },

  // 광전사: 체력 낮을수록 공격속도 증가 (공격적 플레이 장려)
  berserker: { name: '광전사', emoji: '😈', minTier: 'rare', isPvPOnly: true, activationType: 'passive', cooldown: 0, duration: 0 },

  // 처형: 저체력 상대에게 추가 데미지 (마무리 특화)
  execute: { name: '처형', emoji: '💀', minTier: 'epic', isPvPOnly: true, activationType: 'passive', cooldown: 0, duration: 0 },

  // 방패 강타: 방어력 기반 즉시 데미지 (CD 8초, 약 3-4회 사용)
  shield_bash: { name: '방패 강타', emoji: '🛡️', minTier: 'common', isPvPOnly: true, activationType: 'active', cooldown: 8, duration: 0 },

  // 쿨타임 초기화: 액티브 스킬 사용 시 확률적으로 쿨타임 초기화 (패시브)
  cooldown_reset: { name: '시간 왜곡', emoji: '⏰', minTier: 'common', isPvPOnly: true, activationType: 'passive', cooldown: 0, duration: 0 },
}

// =============================================
// 등급별 효과 수치 (밸런스 조정됨)
// =============================================
// 밸런스 계산 기준:
// - 30초 배틀, 약 14-16회 공격
// - 기준 공격당 데미지: ~70 (100 * 0.7 감소율)
// - 기준 총 데미지: ~1050 (15 * 70)
// - 목표: 전설 등급 스킬의 총 가치가 약 200-300 수준으로 균등
// =============================================
export const TIER_EFFECT_VALUES: Record<BattleCardTier, Record<BattleCardEffectType, number>> = {
  common: {
    // 패시브: 5% = 15회 * 70 * 0.05 = +52.5 가치
    attack_boost: 5,
    defense_boost: 5,
    crit_rate_boost: 3,
    crit_damage_boost: 10,
    penetration_boost: 3,
    guaranteed_crit: 0,      // common에서는 나오지 않음
    damage_reflect: 0,       // common에서는 나오지 않음
    // 번개 일섬: 상대 최대 HP의 5% 즉시 데미지
    first_strike: 5,
    gold_bonus: 20,
    // PvP 전용 (common에서는 나오지 않음)
    hp_recovery: 0,
    speed_boost: 0,
    immunity: 0,
    lifesteal: 0,
    double_attack: 0,
    stun: 0,
    silence: 0,
    // 회복 카운터 (common에서는 나오지 않음)
    anti_heal: 0,
    berserker: 0,
    execute: 0,
    // 방패 강타: 방어력의 30% 즉시 데미지
    shield_bash: 30,
    // 쿨타임 초기화: 15% 확률
    cooldown_reset: 15,
  },
  rare: {
    // 패시브: 10% = +105 가치
    attack_boost: 10,
    defense_boost: 10,
    crit_rate_boost: 6,
    crit_damage_boost: 20,
    penetration_boost: 6,
    guaranteed_crit: 0,
    // 반사: 8 고정 데미지 반사 (15회 = 120 가치)
    damage_reflect: 8,
    // 번개 일섬: 상대 최대 HP의 8% 즉시 데미지
    first_strike: 8,
    gold_bonus: 40,
    // PvP 전용
    // HP 회복: 남은 HP의 15% 회복
    hp_recovery: 15,
    // 광폭화: 15% 속도 = 5초간 약 +1회 공격 = +70 가치
    speed_boost: 15,
    immunity: 0,
    // 영혼 흡수: 치명타 시에만 발동, 10% 흡혈 (너프됨)
    lifesteal: 10,
    double_attack: 0,
    stun: 0,
    silence: 0,
    // 회복 카운터
    // 치유 감소: 상대 회복량 40% 감소 (버프됨)
    anti_heal: 40,
    // 광전사: 체력 50%→0% 시 공격속도 0%→+20% (선형)
    berserker: 20,
    execute: 0,  // rare에서는 나오지 않음
    // 방패 강타: 방어력의 40% 즉시 데미지
    shield_bash: 40,
    // 쿨타임 초기화: 20% 확률
    cooldown_reset: 20,
  },
  epic: {
    // 패시브: 15% = +157.5 가치
    attack_boost: 15,
    defense_boost: 15,
    crit_rate_boost: 10,
    crit_damage_boost: 35,
    penetration_boost: 10,
    // 확정 치명타: 3초간 (에픽)
    guaranteed_crit: 3,
    // 반사: 12 고정 데미지 반사 (15회 = 180 가치)
    damage_reflect: 12,
    // 번개 일섬: 상대 최대 HP의 12% 즉시 데미지
    first_strike: 12,
    gold_bonus: 60,
    // PvP 전용
    // HP 회복: 남은 HP의 20% 회복
    hp_recovery: 20,
    // 광폭화: 20% = 5초간 약 +1.3회 공격
    speed_boost: 20,
    // 무적: 2초간 (에픽)
    immunity: 2,
    // 영혼 흡수: 치명타 시에만 발동, 15% 흡혈 (너프됨)
    lifesteal: 15,
    double_attack: 0,
    stun: 0,
    // 침묵: 3초간 상대 스킬 사용 불가 (에픽)
    silence: 3,
    // 회복 카운터
    // 치유 감소: 상대 회복량 70% 감소 (버프됨)
    anti_heal: 70,
    // 광전사: 체력 50%→0% 시 공격속도 0%→+30% (선형)
    berserker: 30,
    // 처형: 상대 체력 50% 이하일 때 데미지 +30% (버프됨)
    execute: 30,
    // 방패 강타: 방어력의 50% 즉시 데미지
    shield_bash: 50,
    // 쿨타임 초기화: 25% 확률
    cooldown_reset: 25,
  },
  legendary: {
    // 패시브: 25% = +262.5 가치
    attack_boost: 25,
    defense_boost: 40,  // 버프됨 (25% → 40%)
    crit_rate_boost: 15,
    crit_damage_boost: 50,
    penetration_boost: 15,
    // 확정 치명타: 5초간 (전설)
    guaranteed_crit: 5,
    // 반사: 18 고정 데미지 반사 (15회 = 270 가치)
    damage_reflect: 18,
    // 번개 일섬: 상대 최대 HP의 15% 즉시 데미지
    first_strike: 15,
    gold_bonus: 100,
    // PvP 전용
    // HP 회복: 남은 HP의 30% 회복
    hp_recovery: 30,
    // 광폭화: 30% = 5초간 약 +2회 공격 = +140 가치
    speed_boost: 30,
    // 무적: 3초간 (전설)
    immunity: 3,
    // 영혼 흡수: 치명타 시에만 발동, 20% 흡혈 (너프됨)
    lifesteal: 20,
    // 폭풍 연타: 4초간 2배 = 약 2회 * 70 = +140 가치
    double_attack: 100,
    // 기절: 1.5초 = 상대 1회 공격+스킬 봉쇄 = 70 가치 + 전략적 가치
    stun: 100,
    // 침묵: 4초간 상대 스킬 사용 불가 (전설)
    silence: 4,
    // 회복 카운터
    // 치유 감소: 상대 회복량 100% 감소 (완전 봉쇄, 버프됨)
    anti_heal: 100,
    // 광전사: 체력 50%→0% 시 공격속도 0%→+50% (선형)
    berserker: 50,
    // 처형: 상대 체력 50% 이하일 때 데미지 +50% (버프됨)
    execute: 50,
    // 방패 강타: 방어력의 60% 즉시 데미지
    shield_bash: 60,
    // 쿨타임 초기화: 30% 확률
    cooldown_reset: 30,
  },
}

// 등급별로 나올 수 있는 효과 타입 (AI 대전용)
export const TIER_AVAILABLE_EFFECTS: Record<BattleCardTier, BattleCardEffectType[]> = {
  common: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'first_strike', 'gold_bonus'],
  rare: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'damage_reflect', 'first_strike', 'gold_bonus'],
  epic: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus'],
  legendary: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus'],
}

// 등급별로 나올 수 있는 효과 타입 (PvP용 - 플레이어, 골드 보너스 포함)
export const TIER_AVAILABLE_EFFECTS_PVP: Record<BattleCardTier, BattleCardEffectType[]> = {
  common: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'first_strike', 'gold_bonus', 'shield_bash', 'cooldown_reset'],
  rare: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'damage_reflect', 'first_strike', 'gold_bonus', 'hp_recovery', 'speed_boost', 'lifesteal', 'anti_heal', 'berserker', 'shield_bash', 'cooldown_reset'],
  epic: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus', 'hp_recovery', 'speed_boost', 'immunity', 'lifesteal', 'silence', 'anti_heal', 'berserker', 'execute', 'shield_bash', 'cooldown_reset'],
  legendary: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus', 'hp_recovery', 'speed_boost', 'immunity', 'lifesteal', 'double_attack', 'stun', 'silence', 'anti_heal', 'berserker', 'execute', 'shield_bash', 'cooldown_reset'],
}

// 등급별로 나올 수 있는 효과 타입 (AI 상대용 - 골드 보너스 제외)
export const TIER_AVAILABLE_EFFECTS_AI: Record<BattleCardTier, BattleCardEffectType[]> = {
  common: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'first_strike', 'shield_bash', 'cooldown_reset'],
  rare: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'damage_reflect', 'first_strike', 'hp_recovery', 'speed_boost', 'lifesteal', 'anti_heal', 'berserker', 'shield_bash', 'cooldown_reset'],
  epic: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'hp_recovery', 'speed_boost', 'immunity', 'lifesteal', 'silence', 'anti_heal', 'berserker', 'execute', 'shield_bash', 'cooldown_reset'],
  legendary: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'hp_recovery', 'speed_boost', 'immunity', 'lifesteal', 'double_attack', 'stun', 'silence', 'anti_heal', 'berserker', 'execute', 'shield_bash', 'cooldown_reset'],
}

// 카드 이름 생성
export const CARD_NAMES: Record<BattleCardEffectType, Record<BattleCardTier, string>> = {
  attack_boost: {
    common: '공격의 문장',
    rare: '전사의 문장',
    epic: '영웅의 문장',
    legendary: '파괴신의 문장',
  },
  defense_boost: {
    common: '방어의 문장',
    rare: '수호의 문장',
    epic: '철벽의 문장',
    legendary: '불멸의 문장',
  },
  crit_rate_boost: {
    common: '집중의 문장',
    rare: '명중의 문장',
    epic: '급소 타격',
    legendary: '필중의 문장',
  },
  crit_damage_boost: {
    common: '강타의 문장',
    rare: '맹공의 문장',
    epic: '치명타 강화',
    legendary: '일격필살',
  },
  penetration_boost: {
    common: '꿰뚫기',
    rare: '갑옷 파쇄',
    epic: '방어 무시',
    legendary: '절대 관통',
  },
  guaranteed_crit: {
    common: '',
    rare: '',
    epic: '확정 치명타',
    legendary: '운명의 일격',
  },
  damage_reflect: {
    common: '',
    rare: '가시 방패',
    epic: '복수의 거울',
    legendary: '인과응보',
  },
  first_strike: {
    common: '전격 타격',
    rare: '뇌전 일격',
    epic: '뇌신의 일격',
    legendary: '번개 일섬',
  },
  gold_bonus: {
    common: '행운의 동전',
    rare: '황금 주머니',
    epic: '보물 상자',
    legendary: '미다스의 손',
  },
  // PvP 전용 카드 이름
  hp_recovery: {
    common: '',
    rare: '응급 치료',
    epic: '치유의 빛',
    legendary: '생명의 축복',
  },
  speed_boost: {
    common: '',
    rare: '신속의 문장',
    epic: '질풍의 문장',
    legendary: '섬광',
  },
  immunity: {
    common: '',
    rare: '',
    epic: '보호막',
    legendary: '절대 방어',
  },
  lifesteal: {
    common: '',
    rare: '흡혈의 송곳니',
    epic: '생명 착취',
    legendary: '영혼 흡수',
  },
  double_attack: {
    common: '',
    rare: '',
    epic: '',
    legendary: '폭풍 연타',
  },
  stun: {
    common: '',
    rare: '',
    epic: '',
    legendary: '기절의 일격',
  },
  silence: {
    common: '',
    rare: '',
    epic: '침묵의 낙인',
    legendary: '영원한 침묵',
  },
  anti_heal: {
    common: '',
    rare: '상처의 저주',
    epic: '치유 봉인',
    legendary: '죽음의 낙인',
  },
  berserker: {
    common: '',
    rare: '광전사의 혼',
    epic: '피의 광기',
    legendary: '불멸의 투혼',
  },
  execute: {
    common: '',
    rare: '',
    epic: '처형자의 낫',
    legendary: '사신의 선고',
  },
  shield_bash: {
    common: '방패 밀기',
    rare: '방패 강타',
    epic: '철벽 돌진',
    legendary: '불굴의 수호자',
  },
  cooldown_reset: {
    common: '시간의 조각',
    rare: '시간 균열',
    epic: '시간 왜곡',
    legendary: '시간의 지배자',
  },
}

// 랜덤 등급 롤
export function rollRandomTier(): BattleCardTier {
  const roll = Math.random()
  let cumulative = 0

  for (const tier of BATTLE_CARD_TIERS) {
    cumulative += BATTLE_CARD_TIER_RATES[tier]
    if (roll < cumulative) return tier
  }

  return 'common'
}

// 랜덤 카드 생성
export function generateRandomCard(): BattleCard {
  const tier = rollRandomTier()
  const availableEffects = TIER_AVAILABLE_EFFECTS[tier]
  const effectType = availableEffects[Math.floor(Math.random() * availableEffects.length)]
  const value = TIER_EFFECT_VALUES[tier][effectType]
  const info = EFFECT_TYPE_INFO[effectType]

  // 효과가 % 기반인지 결정 (guaranteed_crit, double_attack, stun, immunity, silence, shield_bash는 고정값)
  const isPercentage = !['guaranteed_crit', 'double_attack', 'stun', 'immunity', 'silence', 'execute', 'shield_bash'].includes(effectType)

  const effect: BattleCardEffect = {
    type: effectType,
    value,
    isPercentage,
  }

  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: CARD_NAMES[effectType][tier],
    description: formatCardDescription(effect),
    tier,
    effect,
    emoji: info.emoji,
    activationType: info.activationType,
    cooldown: info.cooldown,
    duration: info.duration,
  }
}

// 카드 설명 포맷팅 (실시간 배틀에 맞는 설명)
export function formatCardDescription(effect: BattleCardEffect): string {
  const info = EFFECT_TYPE_INFO[effect.type]

  switch (effect.type) {
    // 패시브 효과들
    case 'attack_boost':
      return `공격력 +${effect.value}%`
    case 'defense_boost':
      return `방어력 +${effect.value}%`
    case 'crit_rate_boost':
      return `치명타 확률 +${effect.value}%`
    case 'crit_damage_boost':
      return `치명타 데미지 +${effect.value}%`
    case 'penetration_boost':
      return `관통력 +${effect.value}%`
    case 'damage_reflect':
      return `공격당할 때마다 ${effect.value} 반사 데미지`
    case 'gold_bonus':
      return `획득 골드 +${effect.value}%`
    case 'lifesteal':
      return `치명타 시 ${effect.value}% HP 흡수`

    // 액티브 효과들 (실시간 배틀용 설명)
    case 'first_strike':
      return `상대 최대 HP의 ${effect.value}% 즉시 데미지`
    case 'guaranteed_crit':
      return `${effect.value}초간 치명타 확정`
    case 'hp_recovery':
      return `남은 HP의 ${effect.value}% 회복`
    case 'speed_boost':
      return `${info.duration}초간 공격속도 +${effect.value}%`
    case 'immunity':
      return `${effect.value}초간 피해 무효`
    case 'double_attack':
      return `${info.duration}초간 2배 데미지`
    case 'stun':
      return `${info.duration}초간 상대 행동 불가`
    case 'silence':
      return `${effect.value}초간 상대 스킬 사용 불가`
    // 회복 카운터 효과들
    case 'anti_heal':
      return `상대 회복량 ${effect.value}% 감소`
    case 'berserker':
      return `HP 50% 이하 시 체력 비례 공속 최대 +${effect.value}%`
    case 'execute':
      return `상대 HP 50% 이하 시 데미지 +${effect.value}%`
    case 'shield_bash':
      return `방어력의 ${effect.value}% 즉시 데미지`
    case 'cooldown_reset':
      return `스킬 사용 시 ${effect.value}% 확률로 쿨타임 초기화`
    default:
      return info.name
  }
}

// 3장의 카드 슬롯 생성
export function generateCardSlots(): BattleCardSlot[] {
  return [
    { card: generateRandomCard(), hasRerolled: false },
    { card: generateRandomCard(), hasRerolled: false },
    { card: generateRandomCard(), hasRerolled: false },
  ]
}

// 특정 슬롯 리롤
export function rerollCardSlot(slots: BattleCardSlot[], index: number): BattleCardSlot[] {
  if (index < 0 || index >= slots.length) return slots
  if (slots[index].hasRerolled) return slots

  const newSlots = [...slots]
  newSlots[index] = {
    card: generateRandomCard(),
    hasRerolled: true,
  }
  return newSlots
}

// =============================================
// PvP 전용 카드 생성 함수
// =============================================

// PvP용 랜덤 카드 생성 (PvP 전용 효과 포함)
export function generateRandomPvPCard(): BattleCard {
  const tier = rollRandomTier()
  const availableEffects = TIER_AVAILABLE_EFFECTS_PVP[tier]
  const effectType = availableEffects[Math.floor(Math.random() * availableEffects.length)]
  const value = TIER_EFFECT_VALUES[tier][effectType]
  const info = EFFECT_TYPE_INFO[effectType]

  const isPercentage = !['guaranteed_crit', 'double_attack', 'stun', 'immunity', 'silence', 'execute', 'shield_bash'].includes(effectType)

  const effect: BattleCardEffect = {
    type: effectType,
    value,
    isPercentage,
  }

  return {
    id: `pvp-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: CARD_NAMES[effectType][tier] || info.name,
    description: formatCardDescription(effect),
    tier,
    effect,
    emoji: info.emoji,
    activationType: info.activationType,
    cooldown: info.cooldown,
    duration: info.duration,
  }
}

// 특정 티어의 PvP 카드 생성
export function generatePvPCardByTier(tier: BattleCardTier): BattleCard {
  const availableEffects = TIER_AVAILABLE_EFFECTS_PVP[tier]
  const effectType = availableEffects[Math.floor(Math.random() * availableEffects.length)]
  const value = TIER_EFFECT_VALUES[tier][effectType]
  const info = EFFECT_TYPE_INFO[effectType]

  const isPercentage = !['guaranteed_crit', 'double_attack', 'stun', 'immunity', 'silence', 'execute', 'shield_bash'].includes(effectType)

  const effect: BattleCardEffect = {
    type: effectType,
    value,
    isPercentage,
  }

  return {
    id: `pvp-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: CARD_NAMES[effectType][tier] || info.name,
    description: formatCardDescription(effect),
    tier,
    effect,
    emoji: info.emoji,
    activationType: info.activationType,
    cooldown: info.cooldown,
    duration: info.duration,
  }
}

// AI 상대용 카드 생성 (골드 보너스 제외)
export function generateAICard(): BattleCard {
  const tier = rollRandomTier()
  const availableEffects = TIER_AVAILABLE_EFFECTS_AI[tier]
  const effectType = availableEffects[Math.floor(Math.random() * availableEffects.length)]
  const value = TIER_EFFECT_VALUES[tier][effectType]
  const info = EFFECT_TYPE_INFO[effectType]

  const isPercentage = !['guaranteed_crit', 'double_attack', 'stun', 'immunity', 'silence', 'execute', 'shield_bash'].includes(effectType)

  const effect: BattleCardEffect = {
    type: effectType,
    value,
    isPercentage,
  }

  return {
    id: `ai-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: CARD_NAMES[effectType][tier] || info.name,
    description: formatCardDescription(effect),
    tier,
    effect,
    emoji: info.emoji,
    activationType: info.activationType,
    cooldown: info.cooldown,
    duration: info.duration,
  }
}

// AI 상대용 특정 티어 카드 생성 (골드 보너스 제외)
export function generateAICardByTier(tier: BattleCardTier): BattleCard {
  const availableEffects = TIER_AVAILABLE_EFFECTS_AI[tier]
  const effectType = availableEffects[Math.floor(Math.random() * availableEffects.length)]
  const value = TIER_EFFECT_VALUES[tier][effectType]
  const info = EFFECT_TYPE_INFO[effectType]

  const isPercentage = !['guaranteed_crit', 'double_attack', 'stun', 'immunity', 'silence', 'execute', 'shield_bash'].includes(effectType)

  const effect: BattleCardEffect = {
    type: effectType,
    value,
    isPercentage,
  }

  return {
    id: `ai-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: CARD_NAMES[effectType][tier] || info.name,
    description: formatCardDescription(effect),
    tier,
    effect,
    emoji: info.emoji,
    activationType: info.activationType,
    cooldown: info.cooldown,
    duration: info.duration,
  }
}

// 특정 효과의 카드 생성
export function generateCardByEffect(effectType: BattleCardEffectType, tier: BattleCardTier): BattleCard {
  const value = TIER_EFFECT_VALUES[tier][effectType]
  const info = EFFECT_TYPE_INFO[effectType]

  // 해당 티어에서 이 효과를 사용할 수 없으면 가장 낮은 가능 티어로 변경
  if (value === 0) {
    const minTier = info.minTier
    const minValue = TIER_EFFECT_VALUES[minTier][effectType]
    const isPercentage = !['guaranteed_crit', 'double_attack', 'stun', 'immunity', 'silence', 'execute', 'shield_bash'].includes(effectType)

    return {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: CARD_NAMES[effectType][minTier] || info.name,
      description: formatCardDescription({ type: effectType, value: minValue, isPercentage }),
      tier: minTier,
      effect: { type: effectType, value: minValue, isPercentage },
      emoji: info.emoji,
      activationType: info.activationType,
      cooldown: info.cooldown,
      duration: info.duration,
    }
  }

  const isPercentage = !['guaranteed_crit', 'double_attack', 'stun', 'immunity', 'silence', 'execute', 'shield_bash'].includes(effectType)

  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: CARD_NAMES[effectType][tier] || info.name,
    description: formatCardDescription({ type: effectType, value, isPercentage }),
    tier,
    effect: { type: effectType, value, isPercentage },
    emoji: info.emoji,
    activationType: info.activationType,
    cooldown: info.cooldown,
    duration: info.duration,
  }
}
