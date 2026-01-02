import { useState, useCallback } from 'react'
import type { BattleCard, BattleCardSlot } from '../types/battleCard'
import { generateCardSlots, rerollCardSlot } from '../types/battleCard'

interface UseBattleCardsReturn {
  // 상태
  cardSlots: BattleCardSlot[]
  selectedCard: BattleCard | null
  isSelectingCards: boolean

  // 액션
  startCardSelection: () => void
  rerollCard: (index: number) => boolean
  selectCard: (index: number) => void
  cancelSelection: () => void
  resetCards: () => void

  // 유틸
  canReroll: (index: number) => boolean
}

export function useBattleCards(): UseBattleCardsReturn {
  const [cardSlots, setCardSlots] = useState<BattleCardSlot[]>([])
  const [selectedCard, setSelectedCard] = useState<BattleCard | null>(null)
  const [isSelectingCards, setIsSelectingCards] = useState(false)

  // 카드 선택 시작 (3장 생성)
  const startCardSelection = useCallback(() => {
    setCardSlots(generateCardSlots())
    setSelectedCard(null)
    setIsSelectingCards(true)
  }, [])

  // 특정 카드 리롤 (1회 제한)
  const rerollCard = useCallback((index: number): boolean => {
    if (index < 0 || index >= cardSlots.length) return false
    if (cardSlots[index].hasRerolled) return false

    setCardSlots(prev => rerollCardSlot(prev, index))
    return true
  }, [cardSlots])

  // 카드 선택
  const selectCard = useCallback((index: number) => {
    if (index < 0 || index >= cardSlots.length) return

    setSelectedCard(cardSlots[index].card)
    setIsSelectingCards(false)
  }, [cardSlots])

  // 선택 취소
  const cancelSelection = useCallback(() => {
    setCardSlots([])
    setSelectedCard(null)
    setIsSelectingCards(false)
  }, [])

  // 초기화
  const resetCards = useCallback(() => {
    setCardSlots([])
    setSelectedCard(null)
    setIsSelectingCards(false)
  }, [])

  // 리롤 가능 여부
  const canReroll = useCallback((index: number): boolean => {
    if (index < 0 || index >= cardSlots.length) return false
    return !cardSlots[index].hasRerolled
  }, [cardSlots])

  return {
    cardSlots,
    selectedCard,
    isSelectingCards,
    startCardSelection,
    rerollCard,
    selectCard,
    cancelSelection,
    resetCards,
    canReroll,
  }
}
