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
}> = {
  attack_boost: { name: '공격력 증가', emoji: '⚔️', minTier: 'common' },
  defense_boost: { name: '방어력 증가', emoji: '🛡️', minTier: 'common' },
  crit_rate_boost: { name: '치명타 확률', emoji: '🎯', minTier: 'common' },
  crit_damage_boost: { name: '치명타 데미지', emoji: '💥', minTier: 'common' },
  penetration_boost: { name: '관통력 증가', emoji: '🗡️', minTier: 'common' },
  guaranteed_crit: { name: '확정 치명타', emoji: '⚡', minTier: 'epic' },
  damage_reflect: { name: '데미지 반사', emoji: '🪞', minTier: 'rare' },
  first_strike: { name: '선제 공격', emoji: '💨', minTier: 'common' },
  gold_bonus: { name: '골드 보너스', emoji: '💰', minTier: 'common' },
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
  },
}

// 등급별로 나올 수 있는 효과 타입
export const TIER_AVAILABLE_EFFECTS: Record<BattleCardTier, BattleCardEffectType[]> = {
  common: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'first_strike', 'gold_bonus'],
  rare: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'damage_reflect', 'first_strike', 'gold_bonus'],
  epic: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus'],
  legendary: ['attack_boost', 'defense_boost', 'crit_rate_boost', 'crit_damage_boost', 'penetration_boost', 'guaranteed_crit', 'damage_reflect', 'first_strike', 'gold_bonus'],
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

  // 효과가 % 기반인지 결정
  const isPercentage = !['first_strike', 'guaranteed_crit'].includes(effectType)

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
