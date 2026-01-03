import type { CharacterStats } from './stats'
import type { BattleCard, BattleCardTier, BattleCardEffectType, BattleCardEffect } from './battleCard'
import { EFFECT_TYPE_INFO, CARD_NAMES, formatCardDescription } from './battleCard'
import type { EquippedItems } from './equipment'

// =============================================
// 보유 카드 (인벤토리)
// =============================================

export interface OwnedCard {
  id: string
  oderId: string
  cardType: BattleCardEffectType
  tier: BattleCardTier
  value: number
  isPercentage: boolean
  createdAt: Date
}

// DB Row 타입
export interface OwnedCardRow {
  id: string
  user_id: string
  card_type: string
  tier: string
  value: number
  is_percentage: boolean
  created_at: string
}

// OwnedCard를 BattleCard로 변환
export function ownedCardToBattleCard(owned: OwnedCard): BattleCard {
  const info = EFFECT_TYPE_INFO[owned.cardType]
  const name = CARD_NAMES[owned.cardType]?.[owned.tier] || owned.cardType

  const effect: BattleCardEffect = {
    type: owned.cardType,
    value: owned.value,
    isPercentage: owned.isPercentage,
  }

  return {
    id: owned.id,
    name,
    description: formatCardDescription(effect),
    tier: owned.tier,
    effect,
    emoji: info?.emoji || '🃏',
  }
}

// =============================================
// 덱 설정
// =============================================

// 3장의 카드 슬롯
export type CardSlots = [OwnedCard | null, OwnedCard | null, OwnedCard | null]

export interface DeckSetup {
  cards: CardSlots
}

// 빈 덱
export const EMPTY_DECK: DeckSetup = {
  cards: [null, null, null],
}

// =============================================
// 방어 덱
// =============================================

export type AIStrategy = 'aggressive' | 'defensive' | 'balanced'

export const AI_STRATEGIES: Record<AIStrategy, {
  name: string
  description: string
  emoji: string
}> = {
  aggressive: {
    name: '공격적',
    description: '높은 데미지를 우선시합니다',
    emoji: '⚔️',
  },
  defensive: {
    name: '방어적',
    description: '생존을 우선시합니다',
    emoji: '🛡️',
  },
  balanced: {
    name: '균형',
    description: '상황에 따라 판단합니다',
    emoji: '⚖️',
  },
}

export interface DefenseDeck {
  userId: string

  // 장비 스냅샷
  equipmentSnapshot: EquippedItems

  // 스탯 스냅샷
  totalStats: CharacterStats

  // 카드 3장
  cards: CardSlots

  // AI 전략
  aiStrategy: AIStrategy

  // 전투력
  combatPower: number

  updatedAt: Date
}

// DB Row 타입
export interface DefenseDeckRow {
  user_id: string
  equipment_snapshot: Record<string, unknown>
  total_stats: Record<string, number>
  card_slot_1: string | null
  card_slot_2: string | null
  card_slot_3: string | null
  ai_strategy: string
  combat_power: number
  updated_at: string
}

// =============================================
// 공격 덱 (임시, 배틀 시 선택)
// =============================================

export interface AttackDeckSelection {
  selectedCards: CardSlots
  availableCards: OwnedCard[]
}

// =============================================
// 카드 필터/정렬
// =============================================

export type CardSortBy = 'tier' | 'type' | 'value' | 'createdAt'
export type CardSortOrder = 'asc' | 'desc'

export interface CardFilter {
  tier?: BattleCardTier | null
  type?: BattleCardEffectType | null
  minValue?: number
  maxValue?: number
}

// 티어 순서 (정렬용)
export const TIER_ORDER: Record<BattleCardTier, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
}

// 카드 정렬 함수
export function sortCards(
  cards: OwnedCard[],
  sortBy: CardSortBy,
  order: CardSortOrder = 'desc'
): OwnedCard[] {
  const sorted = [...cards].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'tier':
        comparison = TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
        break
      case 'type':
        comparison = a.cardType.localeCompare(b.cardType)
        break
      case 'value':
        comparison = a.value - b.value
        break
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime()
        break
    }

    return order === 'desc' ? -comparison : comparison
  })

  return sorted
}

// 카드 필터 함수
export function filterCards(cards: OwnedCard[], filter: CardFilter): OwnedCard[] {
  return cards.filter(card => {
    if (filter.tier && card.tier !== filter.tier) return false
    if (filter.type && card.cardType !== filter.type) return false
    if (filter.minValue !== undefined && card.value < filter.minValue) return false
    if (filter.maxValue !== undefined && card.value > filter.maxValue) return false
    return true
  })
}

// =============================================
// 카드 분해 (골드 변환)
// =============================================

export const CARD_DISENCHANT_VALUES: Record<BattleCardTier, number> = {
  common: 50,
  rare: 150,
  epic: 500,
  legendary: 2000,
}

export function getDisenchantValue(card: OwnedCard): number {
  return CARD_DISENCHANT_VALUES[card.tier]
}

// =============================================
// 카드 획득 소스
// =============================================

export type CardSource =
  | 'gacha'           // 가챠에서 획득
  | 'pvp_win'         // PvP 승리 보상
  | 'pvp_weekly'      // 주간 보상
  | 'pvp_season'      // 시즌 보상
  | 'daily_quest'     // 일일 퀘스트
  | 'achievement'     // 업적

// 소스별 카드 드랍률 (티어별)
export const CARD_DROP_RATES_BY_SOURCE: Record<CardSource, Record<BattleCardTier, number>> = {
  gacha: {
    common: 0.60,
    rare: 0.25,
    epic: 0.12,
    legendary: 0.03,
  },
  pvp_win: {
    common: 0.70,
    rare: 0.22,
    epic: 0.07,
    legendary: 0.01,
  },
  pvp_weekly: {
    common: 0.40,
    rare: 0.35,
    epic: 0.20,
    legendary: 0.05,
  },
  pvp_season: {
    common: 0.20,
    rare: 0.35,
    epic: 0.30,
    legendary: 0.15,
  },
  daily_quest: {
    common: 0.70,
    rare: 0.25,
    epic: 0.05,
    legendary: 0.00,
  },
  achievement: {
    common: 0.30,
    rare: 0.40,
    epic: 0.25,
    legendary: 0.05,
  },
}

// 카드 드랍 확률로 티어 결정
export function rollCardTier(source: CardSource): BattleCardTier {
  const rates = CARD_DROP_RATES_BY_SOURCE[source]
  const roll = Math.random()
  let cumulative = 0

  for (const tier of ['legendary', 'epic', 'rare', 'common'] as BattleCardTier[]) {
    cumulative += rates[tier]
    if (roll < cumulative) return tier
  }

  return 'common'
}
