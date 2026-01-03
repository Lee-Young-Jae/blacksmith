/**
 * Defense Deck Setup Component
 *
 * 방어덱 설정을 담당합니다.
 * - 카드 3장 선택
 * - AI 전략 선택
 * - 현재 스탯/장비 스냅샷 저장
 */

import { useState, useEffect } from 'react'
import type { CharacterStats } from '../../types/stats'
import type { OwnedCard, CardSlots, DefenseDeck, AIStrategy } from '../../types/cardDeck'
import type { EquippedItems } from '../../types/equipment'
import { ownedCardToBattleCard, AI_STRATEGIES, TIER_ORDER } from '../../types/cardDeck'
import { BATTLE_CARD_TIER_COLORS } from '../../types/battleCard'

// =============================================
// 타입 정의
// =============================================

interface DefenseDeckSetupProps {
  playerStats: CharacterStats
  combatPower: number
  equipment: EquippedItems
  ownedCards: OwnedCard[]
  defenseDeck: DefenseDeck | null
  onSave: (
    cards: CardSlots,
    stats: CharacterStats,
    equipment: EquippedItems,
    combatPower: number,
    aiStrategy?: AIStrategy
  ) => Promise<boolean>
  onUpdateStrategy: (strategy: AIStrategy) => Promise<boolean>
  isLoading: boolean
}

// =============================================
// AI 전략 선택 컴포넌트
// =============================================

function StrategySelector({
  current,
  onChange,
}: {
  current: AIStrategy
  onChange: (strategy: AIStrategy) => void
}) {
  const strategies: AIStrategy[] = ['aggressive', 'defensive', 'balanced']

  return (
    <div className="grid grid-cols-3 gap-2">
      {strategies.map(strategy => {
        const info = AI_STRATEGIES[strategy]
        const isActive = current === strategy

        return (
          <button
            key={strategy}
            onClick={() => onChange(strategy)}
            className={`p-3 rounded-lg transition-all ${
              isActive
                ? 'bg-purple-600 ring-2 ring-purple-400'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <div className="text-2xl mb-1">{info.emoji}</div>
            <p className="text-white font-medium text-sm">{info.name}</p>
            <p className="text-gray-400 text-xs">{info.description}</p>
          </button>
        )
      })}
    </div>
  )
}

// =============================================
// 카드 슬롯 컴포넌트
// =============================================

function CardSlot({
  card,
  slotIndex,
  isActive,
  onClick,
  onRemove,
}: {
  card: OwnedCard | null
  slotIndex: number
  isActive: boolean
  onClick: () => void
  onRemove: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`relative w-28 h-36 rounded-lg border-2 cursor-pointer transition-all ${
        isActive
          ? 'border-yellow-400 bg-yellow-900/20 scale-105'
          : card
            ? `${BATTLE_CARD_TIER_COLORS[card.tier]} border-current`
            : 'border-gray-600 border-dashed bg-gray-700/30 hover:bg-gray-700/50'
      }`}
    >
      {card ? (
        <>
          <div className="h-full flex flex-col items-center justify-center p-2">
            <span className="text-3xl mb-1">
              {ownedCardToBattleCard(card).emoji}
            </span>
            <p className="text-xs text-center text-white font-medium line-clamp-2">
              {ownedCardToBattleCard(card).name}
            </p>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              {ownedCardToBattleCard(card).description}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm hover:bg-red-400"
          >
            x
          </button>
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center">
          <span className="text-3xl text-gray-600 mb-1">+</span>
          <span className="text-gray-500 text-sm">슬롯 {slotIndex + 1}</span>
        </div>
      )}
    </div>
  )
}

// =============================================
// 메인 컴포넌트
// =============================================

export function DefenseDeckSetup({
  playerStats,
  combatPower,
  equipment,
  ownedCards,
  defenseDeck,
  onSave,
  onUpdateStrategy,
  isLoading,
}: DefenseDeckSetupProps) {
  const [selectedCards, setSelectedCards] = useState<CardSlots>([null, null, null])
  const [strategy, setStrategy] = useState<AIStrategy>('balanced')
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // 기존 방어덱 로드
  useEffect(() => {
    if (defenseDeck) {
      setSelectedCards(defenseDeck.cards)
      setStrategy(defenseDeck.aiStrategy)
    }
  }, [defenseDeck])

  // 카드 정렬
  const sortedCards = [...ownedCards].sort((a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier])
  const selectedIds = selectedCards.filter(Boolean).map(c => c!.id)

  // 카드 선택 핸들러
  const handleSelectCard = (card: OwnedCard) => {
    if (activeSlot === null) return

    const newCards = [...selectedCards] as CardSlots
    newCards[activeSlot] = card
    setSelectedCards(newCards)
    setActiveSlot(null)
  }

  // 카드 제거 핸들러
  const handleRemoveCard = (slotIndex: number) => {
    const newCards = [...selectedCards] as CardSlots
    newCards[slotIndex] = null
    setSelectedCards(newCards)
  }

  // 저장 핸들러
  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    const success = await onSave(selectedCards, playerStats, equipment, combatPower, strategy)

    setIsSaving(false)
    if (success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
  }

  // 전략 변경 핸들러
  const handleStrategyChange = async (newStrategy: AIStrategy) => {
    setStrategy(newStrategy)
    if (defenseDeck) {
      await onUpdateStrategy(newStrategy)
    }
  }

  const hasChanges = defenseDeck
    ? JSON.stringify(selectedCards.map(c => c?.id)) !== JSON.stringify(defenseDeck.cards.map(c => c?.id))
      || strategy !== defenseDeck.aiStrategy
    : selectedCards.some(Boolean)

  return (
    <div className="space-y-6">
      {/* 설명 */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
        <p className="text-blue-300 text-sm">
          방어덱은 다른 플레이어가 당신을 공격할 때 사용됩니다.
          현재 장비와 스탯이 함께 저장됩니다.
        </p>
      </div>

      {/* 현재 스탯 */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-bold">현재 스탯 (저장됨)</h4>
          <span className="text-yellow-400 font-bold">{combatPower.toLocaleString()} 전투력</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <p className="text-red-400 font-bold">{playerStats.attack}</p>
            <p className="text-gray-500">공격력</p>
          </div>
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <p className="text-blue-400 font-bold">{playerStats.defense}</p>
            <p className="text-gray-500">방어력</p>
          </div>
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <p className="text-green-400 font-bold">{playerStats.hp}</p>
            <p className="text-gray-500">HP</p>
          </div>
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <p className="text-cyan-400 font-bold">{playerStats.attackSpeed}%</p>
            <p className="text-gray-500">공속</p>
          </div>
        </div>
      </div>

      {/* AI 전략 선택 */}
      <div>
        <h4 className="text-white font-bold mb-3">AI 전략</h4>
        <StrategySelector current={strategy} onChange={handleStrategyChange} />
      </div>

      {/* 카드 슬롯 */}
      <div>
        <h4 className="text-white font-bold mb-3">방어 카드 (최대 3장)</h4>
        <div className="flex gap-4 justify-center">
          {[0, 1, 2].map(slotIndex => (
            <CardSlot
              key={slotIndex}
              card={selectedCards[slotIndex]}
              slotIndex={slotIndex}
              isActive={activeSlot === slotIndex}
              onClick={() => setActiveSlot(activeSlot === slotIndex ? null : slotIndex)}
              onRemove={() => handleRemoveCard(slotIndex)}
            />
          ))}
        </div>
      </div>

      {/* 카드 선택 패널 */}
      {activeSlot !== null && (
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-yellow-400 text-sm mb-2">슬롯 {activeSlot + 1}에 넣을 카드 선택</p>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {sortedCards.map(card => {
                const isSelected = selectedIds.includes(card.id)
                const battleCard = ownedCardToBattleCard(card)

                return (
                  <button
                    key={card.id}
                    onClick={() => !isSelected && handleSelectCard(card)}
                    disabled={isSelected}
                    className={`p-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'opacity-40 cursor-not-allowed bg-gray-600'
                        : `${BATTLE_CARD_TIER_COLORS[card.tier]} hover:scale-105`
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{battleCard.emoji}</span>
                      <span className="text-xs font-medium truncate">{battleCard.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{battleCard.description}</p>
                  </button>
                )
              })}
            </div>
            {sortedCards.length === 0 && (
              <p className="text-gray-500 text-center py-4">보유한 카드가 없습니다</p>
            )}
          </div>
        </div>
      )}

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={isSaving || isLoading}
        className={`w-full py-3 font-bold rounded-lg transition-all ${
          saveSuccess
            ? 'bg-green-500 text-white'
            : hasChanges
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:scale-105'
              : 'bg-gray-700 text-gray-400'
        }`}
      >
        {isSaving ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            저장 중...
          </span>
        ) : saveSuccess ? (
          '저장 완료!'
        ) : (
          '방어덱 저장'
        )}
      </button>

      {/* 마지막 업데이트 */}
      {defenseDeck && (
        <p className="text-gray-500 text-xs text-center">
          마지막 업데이트: {defenseDeck.updatedAt.toLocaleString()}
        </p>
      )}
    </div>
  )
}
