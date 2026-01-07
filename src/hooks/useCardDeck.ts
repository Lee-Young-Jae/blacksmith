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
  FusableTier,
} from '../types/cardDeck'
import {
  ownedCardToBattleCard,
  sortCards,
  filterCards,
  getDisenchantValue,
  EMPTY_DECK,
  FUSION_REQUIREMENTS,
  canFuseCards,
  getFusableCardCount,
  getCardsNeededForFusion,
} from '../types/cardDeck'
import { generatePvPCardByTier } from '../types/battleCard'
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

  // 카드 합성
  fuseCards: (tier: FusableTier, cardIds: string[]) => Promise<OwnedCard | null>
  canFuse: (tier: FusableTier) => boolean
  getFusableCount: (tier: FusableTier) => number
  getCardsNeeded: (tier: FusableTier) => number

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
  ensureDefenseDeck: (
    stats: CharacterStats,
    equipment: EquippedItems,
    combatPower: number
  ) => Promise<boolean>

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
  // 카드 합성
  // =============================================

  const fuseCards = useCallback(async (
    tier: FusableTier,
    cardIds: string[]
  ): Promise<OwnedCard | null> => {
    if (!user) return null

    const requirement = FUSION_REQUIREMENTS[tier]

    // 필요한 카드 수 확인
    if (cardIds.length !== requirement.required) {
      setError(`${tier} 카드 ${requirement.required}장이 필요합니다.`)
      return null
    }

    // 선택된 카드들이 모두 해당 티어인지 확인
    const selectedCards = ownedCards.filter(c => cardIds.includes(c.id))
    if (selectedCards.length !== requirement.required) {
      setError('선택된 카드를 찾을 수 없습니다.')
      return null
    }

    const allSameTier = selectedCards.every(c => c.tier === tier)
    if (!allSameTier) {
      setError(`모든 카드가 ${tier} 등급이어야 합니다.`)
      return null
    }

    try {
      // 1. 재료 카드들 삭제
      const { error: deleteError } = await supabase
        .from('user_cards')
        .delete()
        .in('id', cardIds)

      if (deleteError) throw deleteError

      // 2. 새 카드 생성 (상위 등급, 랜덤 효과)
      const newCard = generatePvPCardByTier(requirement.resultTier)

      // 3. DB에 저장
      const { data, error: insertError } = await supabase
        .from('user_cards')
        .insert({
          user_id: user.id,
          card_type: newCard.effect.type,
          tier: newCard.tier,
          value: newCard.effect.value,
          is_percentage: newCard.effect.isPercentage,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const row = data as OwnedCardRow
      const resultCard: OwnedCard = {
        id: row.id,
        oderId: row.user_id,
        cardType: row.card_type as BattleCardEffectType,
        tier: row.tier as BattleCardTier,
        value: row.value,
        isPercentage: row.is_percentage,
        createdAt: new Date(row.created_at),
      }

      // 4. 로컬 상태 업데이트 (재료 삭제 + 결과물 추가)
      setOwnedCards(prev => [
        resultCard,
        ...prev.filter(c => !cardIds.includes(c.id))
      ])

      return resultCard
    } catch (err) {
      console.error('Failed to fuse cards:', err)
      setError('카드 합성에 실패했습니다.')
      return null
    }
  }, [user, ownedCards])

  // 합성 가능 여부
  const canFuse = useCallback((tier: FusableTier): boolean => {
    return canFuseCards(ownedCards, tier)
  }, [ownedCards])

  // 합성 가능한 카드 수
  const getFusableCount = useCallback((tier: FusableTier): number => {
    return getFusableCardCount(ownedCards, tier)
  }, [ownedCards])

  // 합성에 필요한 추가 카드 수
  const getCardsNeeded = useCallback((tier: FusableTier): number => {
    return getCardsNeededForFusion(ownedCards, tier)
  }, [ownedCards])

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
  // 자동 방어덱 등록 (없으면 생성)
  // =============================================

  const ensureDefenseDeck = useCallback(async (
    stats: CharacterStats,
    equipment: EquippedItems,
    combatPower: number
  ): Promise<boolean> => {
    if (!user) return false

    try {
      // 이미 방어덱이 있는지 확인
      const { data: existingDeck, error: checkError } = await supabase
        .from('user_defense_deck')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      // 이미 있으면 스탯만 업데이트
      if (existingDeck) {
        const { error: updateError } = await supabase
          .from('user_defense_deck')
          .update({
            total_stats: stats,
            equipment_snapshot: equipment,
            combat_power: combatPower,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        if (updateError) throw updateError

        // 로컬 상태 업데이트
        setDefenseDeck(prev => prev ? {
          ...prev,
          totalStats: stats,
          equipmentSnapshot: equipment,
          combatPower,
          updatedAt: new Date(),
        } : null)

        return true
      }

      // 없으면 새로 생성 (카드 없이)
      const emptyCards: CardSlots = [null, null, null]
      const success = await saveDefenseDeck(emptyCards, stats, equipment, combatPower, 'balanced')

      if (success) {
        console.log('🛡️ 자동 방어덱 등록 완료 - 전투력:', combatPower)

        // 초기 랭킹 레코드도 생성 (없으면)
        const { data: existingRanking } = await supabase
          .from('pvp_rankings')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!existingRanking) {
          await supabase
            .from('pvp_rankings')
            .insert({
              user_id: user.id,
              rating: 400,
              tier: 'bronze',
              wins: 0,
              losses: 0,
              draws: 0,
              weekly_battles: 0,
            })
          console.log('📊 초기 랭킹 레코드 생성 완료')
        }
      }

      return success
    } catch (err) {
      console.error('Failed to ensure defense deck:', err)
      return false
    }
  }, [user, saveDefenseDeck])

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
    fuseCards,
    canFuse,
    getFusableCount,
    getCardsNeeded,
    getFilteredCards,
    getSortedCards,
    loadDefenseDeck,
    saveDefenseDeck,
    updateAIStrategy,
    ensureDefenseDeck,
    setAttackDeckSlot,
    clearAttackDeck,
    getAttackDeckCards,
    getCardById,
    getTotalDisenchantValue,
  }
}
