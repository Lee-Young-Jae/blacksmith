/**
 * Card Deck Hook
 *
 * 카드 인벤토리 및 덱 관리를 담당합니다.
 * - 보유 카드 조회
 * - 방어덱 설정/조회
 * - 카드 분해 (골드 변환)
 * - 덱 슬롯 관리
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CharacterStats } from '../types/stats'
import type { BattleCard, BattleCardTier, BattleCardEffectType } from '../types/battleCard'
import { generateRandomPvPCard } from '../types/battleCard'
import type {
  OwnedCard,
  OwnedCardRow,
  CardSlots,
  DeckSetup,
  DefenseDeck,
  DefenseDeckRow,
  AIStrategy,
  CardFilter,
  CardSortBy,
  CardSortOrder,
} from '../types/cardDeck'
import {
  ownedCardToBattleCard,
  sortCards,
  filterCards,
  getDisenchantValue,
  EMPTY_DECK,
} from '../types/cardDeck'
import type { EquippedItems } from '../types/equipment'

// =============================================
// 타입 정의
// =============================================

// 카드 가챠 비용
export const CARD_GACHA_SINGLE_COST = 500
export const CARD_GACHA_MULTI_COST = 4500 // 10장 (10% 할인)

interface UseCardDeckReturn {
  // 상태
  ownedCards: OwnedCard[]
  defenseDeck: DefenseDeck | null
  attackDeckSetup: DeckSetup
  isLoading: boolean
  error: string | null

  // 카드 가챠
  pullCard: () => Promise<OwnedCard | null>
  pullMultiCards: (count: number) => Promise<OwnedCard[]>

  // 카드 인벤토리
  loadOwnedCards: () => Promise<void>
  addCard: (cardType: BattleCardEffectType, tier: BattleCardTier, value: number, isPercentage: boolean) => Promise<OwnedCard | null>
  disenchantCard: (cardId: string) => Promise<number>
  disenchantMultiple: (cardIds: string[]) => Promise<number>

  // 필터/정렬
  getFilteredCards: (filter: CardFilter) => OwnedCard[]
  getSortedCards: (sortBy: CardSortBy, order?: CardSortOrder) => OwnedCard[]

  // 방어덱 관리
  loadDefenseDeck: () => Promise<void>
  saveDefenseDeck: (
    cards: CardSlots,
    stats: CharacterStats,
    equipment: EquippedItems,
    combatPower: number,
    aiStrategy?: AIStrategy
  ) => Promise<boolean>
  updateAIStrategy: (strategy: AIStrategy) => Promise<boolean>

  // 공격덱 선택 (임시)
  setAttackDeckSlot: (slotIndex: number, card: OwnedCard | null) => void
  clearAttackDeck: () => void
  getAttackDeckCards: () => BattleCard[]

  // 유틸
  getCardById: (cardId: string) => OwnedCard | undefined
  getTotalDisenchantValue: (cardIds: string[]) => number
}

// =============================================
// Hook 구현
// =============================================

export function useCardDeck(): UseCardDeckReturn {
  const { user } = useAuth()

  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([])
  const [defenseDeck, setDefenseDeck] = useState<DefenseDeck | null>(null)
  const [attackDeckSetup, setAttackDeckSetup] = useState<DeckSetup>(EMPTY_DECK)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // =============================================
  // 보유 카드 조회
  // =============================================

  const loadOwnedCards = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('user_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const cards: OwnedCard[] = (data as OwnedCardRow[]).map(row => ({
        id: row.id,
        oderId: row.user_id,
        cardType: row.card_type as BattleCardEffectType,
        tier: row.tier as BattleCardTier,
        value: row.value,
        isPercentage: row.is_percentage,
        createdAt: new Date(row.created_at),
      }))

      setOwnedCards(cards)
    } catch (err) {
      console.error('Failed to load owned cards:', err)
      setError('카드 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // =============================================
  // 카드 추가
  // =============================================

  const addCard = useCallback(async (
    cardType: BattleCardEffectType,
    tier: BattleCardTier,
    value: number,
    isPercentage: boolean
  ): Promise<OwnedCard | null> => {
    if (!user) return null

    try {
      const { data, error: insertError } = await supabase
        .from('user_cards')
        .insert({
          user_id: user.id,
          card_type: cardType,
          tier,
          value,
          is_percentage: isPercentage,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const row = data as OwnedCardRow
      const newCard: OwnedCard = {
        id: row.id,
        oderId: row.user_id,
        cardType: row.card_type as BattleCardEffectType,
        tier: row.tier as BattleCardTier,
        value: row.value,
        isPercentage: row.is_percentage,
        createdAt: new Date(row.created_at),
      }

      setOwnedCards(prev => [newCard, ...prev])
      return newCard
    } catch (err) {
      console.error('Failed to add card:', err)
      return null
    }
  }, [user])

  // =============================================
  // 카드 가챠
  // =============================================

  const pullCard = useCallback(async (): Promise<OwnedCard | null> => {
    if (!user) return null

    try {
      // 랜덤 PvP 카드 생성
      const randomCard = generateRandomPvPCard()

      // DB에 저장
      const newCard = await addCard(
        randomCard.effect.type,
        randomCard.tier,
        randomCard.effect.value,
        randomCard.effect.isPercentage
      )

      return newCard
    } catch (err) {
      console.error('Failed to pull card:', err)
      return null
    }
  }, [user, addCard])

  const pullMultiCards = useCallback(async (count: number): Promise<OwnedCard[]> => {
    if (!user) return []

    const results: OwnedCard[] = []

    try {
      for (let i = 0; i < count; i++) {
        const card = await pullCard()
        if (card) {
          results.push(card)
        }
      }

      return results
    } catch (err) {
      console.error('Failed to pull multiple cards:', err)
      return results
    }
  }, [user, pullCard])

  // =============================================
  // 카드 분해
  // =============================================

  const disenchantCard = useCallback(async (cardId: string): Promise<number> => {
    if (!user) return 0

    const card = ownedCards.find(c => c.id === cardId)
    if (!card) return 0

    const goldValue = getDisenchantValue(card)

    try {
      // 카드 삭제
      const { error: deleteError } = await supabase
        .from('user_cards')
        .delete()
        .eq('id', cardId)

      if (deleteError) throw deleteError

      // 골드 지급
      const { error: goldError } = await supabase.rpc('add_gold', {
        p_user_id: user.id,
        p_amount: goldValue,
      })

      if (goldError) {
        // RPC 함수가 없으면 직접 업데이트
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('gold')
          .eq('id', user.id)
          .single()

        if (profileData) {
          await supabase
            .from('user_profiles')
            .update({ gold: profileData.gold + goldValue })
            .eq('id', user.id)
        }
      }

      setOwnedCards(prev => prev.filter(c => c.id !== cardId))
      return goldValue
    } catch (err) {
      console.error('Failed to disenchant card:', err)
      return 0
    }
  }, [user, ownedCards])

  const disenchantMultiple = useCallback(async (cardIds: string[]): Promise<number> => {
    if (!user || cardIds.length === 0) return 0

    const cardsToDisenchant = ownedCards.filter(c => cardIds.includes(c.id))
    const totalGold = cardsToDisenchant.reduce((sum, card) => sum + getDisenchantValue(card), 0)

    try {
      // 카드 삭제
      const { error: deleteError } = await supabase
        .from('user_cards')
        .delete()
        .in('id', cardIds)

      if (deleteError) throw deleteError

      // 골드 지급
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('gold')
        .eq('id', user.id)
        .single()

      if (profileData) {
        await supabase
          .from('user_profiles')
          .update({ gold: profileData.gold + totalGold })
          .eq('id', user.id)
      }

      setOwnedCards(prev => prev.filter(c => !cardIds.includes(c.id)))
      return totalGold
    } catch (err) {
      console.error('Failed to disenchant cards:', err)
      return 0
    }
  }, [user, ownedCards])

  // =============================================
  // 필터/정렬
  // =============================================

  const getFilteredCards = useCallback((filter: CardFilter): OwnedCard[] => {
    return filterCards(ownedCards, filter)
  }, [ownedCards])

  const getSortedCards = useCallback((sortBy: CardSortBy, order: CardSortOrder = 'desc'): OwnedCard[] => {
    return sortCards(ownedCards, sortBy, order)
  }, [ownedCards])

  // =============================================
  // 방어덱 조회
  // =============================================

  const loadDefenseDeck = useCallback(async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const { data, error: fetchError } = await supabase
        .from('user_defense_deck')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // 방어덱이 없음
          setDefenseDeck(null)
          return
        }
        throw fetchError
      }

      const row = data as DefenseDeckRow

      // 카드 슬롯 조회
      const cardIds = [row.card_slot_1, row.card_slot_2, row.card_slot_3].filter(Boolean) as string[]

      let cardSlots: CardSlots = [null, null, null]

      if (cardIds.length > 0) {
        const { data: cardsData } = await supabase
          .from('user_cards')
          .select('*')
          .in('id', cardIds)

        if (cardsData) {
          const cardsMap = new Map<string, OwnedCard>()
          for (const cardRow of cardsData as OwnedCardRow[]) {
            cardsMap.set(cardRow.id, {
              id: cardRow.id,
              oderId: cardRow.user_id,
              cardType: cardRow.card_type as BattleCardEffectType,
              tier: cardRow.tier as BattleCardTier,
              value: cardRow.value,
              isPercentage: cardRow.is_percentage,
              createdAt: new Date(cardRow.created_at),
            })
          }

          cardSlots = [
            row.card_slot_1 ? cardsMap.get(row.card_slot_1) || null : null,
            row.card_slot_2 ? cardsMap.get(row.card_slot_2) || null : null,
            row.card_slot_3 ? cardsMap.get(row.card_slot_3) || null : null,
          ]
        }
      }

      setDefenseDeck({
        userId: row.user_id,
        equipmentSnapshot: row.equipment_snapshot as unknown as EquippedItems,
        totalStats: row.total_stats as unknown as CharacterStats,
        cards: cardSlots,
        aiStrategy: row.ai_strategy as AIStrategy,
        combatPower: row.combat_power,
        updatedAt: new Date(row.updated_at),
      })
    } catch (err) {
      console.error('Failed to load defense deck:', err)
      setError('방어덱을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // =============================================
  // 방어덱 저장
  // =============================================

  const saveDefenseDeck = useCallback(async (
    cards: CardSlots,
    stats: CharacterStats,
    equipment: EquippedItems,
    combatPower: number,
    aiStrategy: AIStrategy = 'balanced'
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const deckData = {
        user_id: user.id,
        equipment_snapshot: equipment,
        total_stats: stats,
        card_slot_1: cards[0]?.id || null,
        card_slot_2: cards[1]?.id || null,
        card_slot_3: cards[2]?.id || null,
        ai_strategy: aiStrategy,
        combat_power: combatPower,
        updated_at: new Date().toISOString(),
      }

      const { error: upsertError } = await supabase
        .from('user_defense_deck')
        .upsert(deckData, { onConflict: 'user_id' })

      if (upsertError) throw upsertError

      setDefenseDeck({
        userId: user.id,
        equipmentSnapshot: equipment,
        totalStats: stats,
        cards,
        aiStrategy,
        combatPower,
        updatedAt: new Date(),
      })

      return true
    } catch (err) {
      console.error('Failed to save defense deck:', err)
      setError('방어덱 저장에 실패했습니다.')
      return false
    }
  }, [user])

  // =============================================
  // AI 전략 업데이트
  // =============================================

  const updateAIStrategy = useCallback(async (strategy: AIStrategy): Promise<boolean> => {
    if (!user || !defenseDeck) return false

    try {
      const { error: updateError } = await supabase
        .from('user_defense_deck')
        .update({ ai_strategy: strategy })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      setDefenseDeck(prev => prev ? { ...prev, aiStrategy: strategy } : null)
      return true
    } catch (err) {
      console.error('Failed to update AI strategy:', err)
      return false
    }
  }, [user, defenseDeck])

  // =============================================
  // 공격덱 선택 (임시)
  // =============================================

  const setAttackDeckSlot = useCallback((slotIndex: number, card: OwnedCard | null) => {
    if (slotIndex < 0 || slotIndex > 2) return

    setAttackDeckSetup(prev => {
      const newCards = [...prev.cards] as CardSlots
      newCards[slotIndex] = card
      return { cards: newCards }
    })
  }, [])

  const clearAttackDeck = useCallback(() => {
    setAttackDeckSetup(EMPTY_DECK)
  }, [])

  const getAttackDeckCards = useCallback((): BattleCard[] => {
    return attackDeckSetup.cards
      .filter((card): card is OwnedCard => card !== null)
      .map(ownedCardToBattleCard)
  }, [attackDeckSetup])

  // =============================================
  // 유틸
  // =============================================

  const getCardById = useCallback((cardId: string): OwnedCard | undefined => {
    return ownedCards.find(c => c.id === cardId)
  }, [ownedCards])

  const getTotalDisenchantValue = useCallback((cardIds: string[]): number => {
    return ownedCards
      .filter(c => cardIds.includes(c.id))
      .reduce((sum, card) => sum + getDisenchantValue(card), 0)
  }, [ownedCards])

  // =============================================
  // 초기 로드
  // =============================================

  useEffect(() => {
    if (user) {
      loadOwnedCards()
      loadDefenseDeck()
    }
  }, [user, loadOwnedCards, loadDefenseDeck])

  return {
    ownedCards,
    defenseDeck,
    attackDeckSetup,
    isLoading,
    error,
    pullCard,
    pullMultiCards,
    loadOwnedCards,
    addCard,
    disenchantCard,
    disenchantMultiple,
    getFilteredCards,
    getSortedCards,
    loadDefenseDeck,
    saveDefenseDeck,
    updateAIStrategy,
    setAttackDeckSlot,
    clearAttackDeck,
    getAttackDeckCards,
    getCardById,
    getTotalDisenchantValue,
  }
}
