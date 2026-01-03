// 배틀 카드 등급
export type BattleCardTier = 'common' | 'rare' | 'epic' | 'legendary'

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
  | 'guaranteed_crit'    // 확정 치명타
  | 'damage_reflect'     // 데미지 반사
  | 'first_strike'       // 선제 공격
  | 'gold_bonus'         // 골드 보너스
  // PvP 전용 효과
  | 'hp_recovery'        // HP 회복
  | 'speed_boost'        // 공격속도 증가 (선공권)
  | 'immunity'           // 이번 턴 피해 무효
  | 'lifesteal'          // 흡혈 (데미지의 일부 HP 회복)
  | 'double_attack'      // 연속 공격 (2회 공격)
  | 'stun'               // 스턴 (상대 다음 턴 스킵)

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
}

// 카드 슬롯 (리롤 상태 포함)
export interface BattleCardSlot {
  card: BattleCard
  hasRerolled: boolean
}

// 효과 타입별 기본 정보
export const EFFECT_TYPE_INFO: Record<BattleCardEffectType, {
  name: string
  emoji: string
  minTier: BattleCardTier
  isPvPOnly: boolean  // PvP 전용 여부
}> = {
  attack_boost: { name: '공격력 증가', emoji: '⚔️', minTier: 'common', isPvPOnly: false },
  defense_boost: { name: '방어력 증가', emoji: '🛡️', minTier: 'common', isPvPOnly: false },
  crit_rate_boost: { name: '치명타 확률', emoji: '🎯', minTier: 'common', isPvPOnly: false },
  crit_damage_boost: { name: '치명타 데미지', emoji: '💥', minTier: 'common', isPvPOnly: false },
  penetration_boost: { name: '관통력 증가', emoji: '🗡️', minTier: 'common', isPvPOnly: false },
  guaranteed_crit: { name: '확정 치명타', emoji: '⚡', minTier: 'epic', isPvPOnly: false },
  damage_reflect: { name: '데미지 반사', emoji: '🪞', minTier: 'rare', isPvPOnly: false },
  first_strike: { name: '선제 공격', emoji: '💨', minTier: 'common', isPvPOnly: false },
  gold_bonus: { name: '골드 보너스', emoji: '💰', minTier: 'common', isPvPOnly: false },
  // PvP 전용 효과
  hp_recovery: { name: 'HP 회복', emoji: '💚', minTier: 'rare', isPvPOnly: true },
  speed_boost: { name: '공격속도 증가', emoji: '⚡', minTier: 'rare', isPvPOnly: true },
  immunity: { name: '피해 면역', emoji: '🛡️', minTier: 'epic', isPvPOnly: true },
  lifesteal: { name: '흡혈', emoji: '🧛', minTier: 'rare', isPvPOnly: true },
  double_attack: { name: '연속 공격', emoji: '⚔️', minTier: 'legendary', isPvPOnly: true },
  stun: { name: '스턴', emoji: '💫', minTier: 'legendary', isPvPOnly: true },
}

// 등급별 효과 수치
export const TIER_EFFECT_VALUES: Record<BattleCardTier, Record<BattleCardEffectType, number>> = {
  common: {
    attack_boost: 5,
    defense_boost: 5,
    crit_rate_boost: 3,
    crit_damage_boost: 10,
    penetration_boost: 3,
    guaranteed_crit: 0,      // common에서는 나오지 않음
    damage_reflect: 0,       // common에서는 나오지 않음
    first_strike: 20,        // 고정 데미지
    gold_bonus: 20,
    // PvP 전용 (common에서는 나오지 않음)
    hp_recovery: 0,
    speed_boost: 0,
    immunity: 0,
    lifesteal: 0,
    double_attack: 0,
    stun: 0,
  },
  rare: {
    attack_boost: 10,
    defense_boost: 10,
    crit_rate_boost: 6,
    crit_damage_boost: 20,
    penetration_boost: 6,
    guaranteed_crit: 0,      // rare에서는 나오지 않음
    damage_reflect: 10,
    first_strike: 40,
    gold_bonus: 40,
    // PvP 전용
    hp_recovery: 20,         // HP 20% 회복
    speed_boost: 10,         // 공격속도 +10%
    immunity: 0,             // rare에서는 나오지 않음
    lifesteal: 15,           // 데미지의 15% 흡혈
    double_attack: 0,        // rare에서는 나오지 않음
    stun: 0,                 // rare에서는 나오지 않음
  },
  epic: {
    attack_boost: 15,
    defense_boost: 15,
    crit_rate_boost: 10,
    crit_damage_boost: 35,
    penetration_boost: 10,
    guaranteed_crit: 100,    // 100% 확정
    damage_reflect: 20,
    first_strike: 70,
    gold_bonus: 60,
    // PvP 전용
    hp_recovery: 35,         // HP 35% 회복
    speed_boost: 20,         // 공격속도 +20%
    immunity: 100,           // 이번 턴 피해 완전 무효
    lifesteal: 25,           // 데미지의 25% 흡혈
    double_attack: 0,        // epic에서는 나오지 않음
    stun: 0,                 // epic에서는 나오지 않음
  },
  legendary: {
    attack_boost: 25,
    defense_boost: 25,
    crit_rate_boost: 15,
    crit_damage_boost: 50,
    penetration_boost: 15,
    guaranteed_crit: 100,
    damage_reflect: 30,
    first_strike: 100,
    gold_bonus: 100,
    // PvP 전용
    hp_recovery: 50,         // HP 50% 회복
    speed_boost: 30,         // 공격속도 +30%
    immunity: 100,           // 이번 턴 피해 완전 무효
    lifesteal: 40,           // 데미지의 40% 흡혈
    double_attack: 100,      // 2회 공격 (100% 확률)
    stun: 100,               // 스턴 (100% 확률)
  },
}

// 등급별로 나올 수 있는 효과 타입 (AI 대전용)
export const TIER_AVAILABLE_EFFECTS: Record<BattleCardTier, BattleCardEffectType[]> = {
  common: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'first_strike', 'gold_bonus'],
  rare: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'damage_reflect', 'first_strike', 'gold_bonus'],
  epic: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus'],
  legendary: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus'],
}

// 등급별로 나올 수 있는 효과 타입 (PvP용 - 모든 효과 포함)
export const TIER_AVAILABLE_EFFECTS_PVP: Record<BattleCardTier, BattleCardEffectType[]> = {
  common: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'first_strike', 'gold_bonus'],
  rare: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'damage_reflect', 'first_strike', 'gold_bonus', 'hp_recovery', 'speed_boost', 'lifesteal'],
  epic: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus', 'hp_recovery', 'speed_boost', 'immunity', 'lifesteal'],
  legendary: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus', 'hp_recovery', 'speed_boost', 'immunity', 'lifesteal', 'double_attack', 'stun'],
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
    common: '선제 타격',
    rare: '기습',
    epic: '전격전',
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
    rare: '치유의 빛',
    epic: '생명의 축복',
    legendary: '불사의 영약',
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
    legendary: '쌍검술',
  },
  stun: {
    common: '',
    rare: '',
    epic: '',
    legendary: '기절의 일격',
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

  // 효과가 % 기반인지 결정 (first_strike, guaranteed_crit, double_attack, stun, immunity는 고정값)
  const isPercentage = !['first_strike', 'guaranteed_crit', 'double_attack', 'stun', 'immunity'].includes(effectType)

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
  }
}

// 카드 설명 포맷팅
export function formatCardDescription(effect: BattleCardEffect): string {
  const info = EFFECT_TYPE_INFO[effect.type]

  switch (effect.type) {
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
    case 'guaranteed_crit':
      return '첫 공격 치명타 확정'
    case 'damage_reflect':
      return `받은 데미지 ${effect.value}% 반사`
    case 'first_strike':
      return `선제 공격 +${effect.value} 데미지`
    case 'gold_bonus':
      return `획득 골드 +${effect.value}%`
    // PvP 전용 효과
    case 'hp_recovery':
      return `HP ${effect.value}% 회복`
    case 'speed_boost':
      return `공격속도 +${effect.value}%`
    case 'immunity':
      return '이번 턴 피해 무효'
    case 'lifesteal':
      return `데미지의 ${effect.value}% HP 회복`
    case 'double_attack':
      return '이번 턴 2회 공격'
    case 'stun':
      return '상대 다음 턴 스킵'
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

  const isPercentage = !['first_strike', 'guaranteed_crit', 'double_attack', 'stun', 'immunity'].includes(effectType)

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
  }
}

// 특정 티어의 PvP 카드 생성
export function generatePvPCardByTier(tier: BattleCardTier): BattleCard {
  const availableEffects = TIER_AVAILABLE_EFFECTS_PVP[tier]
  const effectType = availableEffects[Math.floor(Math.random() * availableEffects.length)]
  const value = TIER_EFFECT_VALUES[tier][effectType]
  const info = EFFECT_TYPE_INFO[effectType]

  const isPercentage = !['first_strike', 'guaranteed_crit', 'double_attack', 'stun', 'immunity'].includes(effectType)

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
    const isPercentage = !['first_strike', 'guaranteed_crit', 'double_attack', 'stun', 'immunity'].includes(effectType)

    return {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: CARD_NAMES[effectType][minTier] || info.name,
      description: formatCardDescription({ type: effectType, value: minValue, isPercentage }),
      tier: minTier,
      effect: { type: effectType, value: minValue, isPercentage },
      emoji: info.emoji,
    }
  }

  const isPercentage = !['first_strike', 'guaranteed_crit', 'double_attack', 'stun', 'immunity'].includes(effectType)

  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: CARD_NAMES[effectType][tier] || info.name,
    description: formatCardDescription({ type: effectType, value, isPercentage }),
    tier,
    effect: { type: effectType, value, isPercentage },
    emoji: info.emoji,
  }
}
