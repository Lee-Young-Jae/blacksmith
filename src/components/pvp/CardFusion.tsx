/**
 * Card Fusion Component
 *
 * 카드 합성 UI - 하위 등급 카드를 합성하여 상위 등급 카드 획득
 */

import { useState, useCallback } from 'react'
import type { OwnedCard, FusableTier } from '../../types/cardDeck'
import { ownedCardToBattleCard, FUSION_REQUIREMENTS, FUSION_RESULT_NAMES } from '../../types/cardDeck'
import { BATTLE_CARD_TIER_COLORS, BATTLE_CARD_TIER_NAMES } from '../../types/battleCard'

// =============================================
// 타입 정의
// =============================================

interface CardFusionProps {
  ownedCards: OwnedCard[]
  onFuse: (tier: FusableTier, cardIds: string[]) => Promise<OwnedCard | null>
  getFusableCount: (tier: FusableTier) => number
}

type FusionTierTab = FusableTier

const FUSION_TIERS: FusionTierTab[] = ['common', 'rare', 'epic']

const TIER_STYLES: Record<FusionTierTab, {
  bg: string
  border: string
  text: string
  gradient: string
}> = {
  common: {
    bg: 'bg-gray-800/50',
    border: 'border-gray-500',
    text: 'text-gray-400',
    gradient: 'from-gray-600 to-gray-700',
  },
  rare: {
    bg: 'bg-blue-900/30',
    border: 'border-blue-500',
    text: 'text-blue-400',
    gradient: 'from-blue-600 to-blue-700',
  },
  epic: {
    bg: 'bg-purple-900/30',
    border: 'border-purple-500',
    text: 'text-purple-400',
    gradient: 'from-purple-600 to-purple-700',
  },
}

const RESULT_TIER_STYLES: Record<string, {
  bg: string
  border: string
  text: string
  glow: string
}> = {
  rare: {
    bg: 'bg-blue-900/50',
    border: 'border-blue-400',
    text: 'text-blue-300',
    glow: 'shadow-blue-500/50',
  },
  epic: {
    bg: 'bg-purple-900/50',
    border: 'border-purple-400',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/50',
  },
  legendary: {
    bg: 'bg-orange-900/50',
    border: 'border-orange-400',
    text: 'text-orange-300',
    glow: 'shadow-orange-500/50',
  },
}

// =============================================
// 카드 선택 아이템
// =============================================

function SelectableCard({
  card,
  isSelected,
  onToggle,
}: {
  card: OwnedCard
  isSelected: boolean
  onToggle: () => void
}) {
  const battleCard = ownedCardToBattleCard(card)

  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg border-2 transition-all text-left ${
        isSelected
          ? 'border-yellow-400 bg-yellow-900/30 ring-2 ring-yellow-400/50'
          : `${BATTLE_CARD_TIER_COLORS[card.tier]} hover:bg-gray-700/50`
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{battleCard.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-xs truncate">{battleCard.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{battleCard.description}</p>
        </div>
        {isSelected && (
          <span className="text-yellow-400 text-lg shrink-0">✓</span>
        )}
      </div>
    </button>
  )
}

// =============================================
// 결과 카드 표시
// =============================================

function FusionResultCard({ card }: { card: OwnedCard }) {
  const battleCard = ownedCardToBattleCard(card)
  const style = RESULT_TIER_STYLES[card.tier] || RESULT_TIER_STYLES.rare

  return (
    <div className={`p-4 rounded-xl border-2 ${style.border} ${style.bg} shadow-lg ${style.glow} animate-bounce-in`}>
      <div className="text-center mb-3">
        <span className="text-4xl">{battleCard.emoji}</span>
      </div>
      <div className="text-center">
        <p className={`font-bold text-lg ${style.text}`}>{battleCard.name}</p>
        <p className="text-sm text-orange-400 font-medium">{BATTLE_CARD_TIER_NAMES[card.tier]}</p>
        <p className="text-xs text-gray-300 mt-2">{battleCard.description}</p>
      </div>
    </div>
  )
}

// =============================================
// 메인 컴포넌트
// =============================================

export function CardFusion({
  ownedCards,
  onFuse,
  getFusableCount,
}: CardFusionProps) {
  const [selectedTier, setSelectedTier] = useState<FusionTierTab>('common')
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [isFusing, setIsFusing] = useState(false)
  const [fusionResult, setFusionResult] = useState<OwnedCard | null>(null)

  const requirement = FUSION_REQUIREMENTS[selectedTier]
  const tierCards = ownedCards.filter(c => c.tier === selectedTier)
  const style = TIER_STYLES[selectedTier]

  // 카드 선택/해제
  const toggleCard = useCallback((cardId: string) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else if (newSet.size < requirement.required) {
        newSet.add(cardId)
      }
      return newSet
    })
  }, [requirement.required])

  // 전체 선택 (필요한 수만큼)
  const selectAll = useCallback(() => {
    const ids = tierCards.slice(0, requirement.required).map(c => c.id)
    setSelectedCardIds(new Set(ids))
  }, [tierCards, requirement.required])

  // 선택 해제
  const clearSelection = useCallback(() => {
    setSelectedCardIds(new Set())
  }, [])

  // 탭 변경 시 선택 초기화
  const handleTabChange = useCallback((tier: FusionTierTab) => {
    setSelectedTier(tier)
    setSelectedCardIds(new Set())
    setFusionResult(null)
  }, [])

  // 합성 실행
  const handleFuse = async () => {
    if (selectedCardIds.size !== requirement.required) return
    if (isFusing) return

    setIsFusing(true)
    setFusionResult(null)

    try {
      const result = await onFuse(selectedTier, Array.from(selectedCardIds))
      if (result) {
        setFusionResult(result)
        setSelectedCardIds(new Set())
      }
    } catch (err) {
      console.error('Fusion failed:', err)
    } finally {
      setIsFusing(false)
    }
  }

  const canExecuteFusion = selectedCardIds.size === requirement.required && !isFusing

  return (
    <div className="space-y-4">
      {/* 설명 */}
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
          <span className="text-xl">🔮</span>
          카드 합성
        </h4>
        <p className="text-gray-400 text-sm">
          같은 등급의 카드를 모아 상위 등급 카드로 합성하세요! 결과는 완전 랜덤입니다.
        </p>
      </div>

      {/* 합성 비용 안내 */}
      <div className="bg-gray-700/30 rounded-lg p-3">
        <h5 className="text-gray-300 text-sm font-medium mb-2">합성 비용</h5>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`rounded p-2 ${TIER_STYLES.common.bg} border ${TIER_STYLES.common.border}`}>
            <p className={`font-bold ${TIER_STYLES.common.text}`}>일반 5장</p>
            <p className="text-blue-400">→ 레어</p>
          </div>
          <div className={`rounded p-2 ${TIER_STYLES.rare.bg} border ${TIER_STYLES.rare.border}`}>
            <p className={`font-bold ${TIER_STYLES.rare.text}`}>레어 6장</p>
            <p className="text-purple-400">→ 에픽</p>
          </div>
          <div className={`rounded p-2 ${TIER_STYLES.epic.bg} border ${TIER_STYLES.epic.border}`}>
            <p className={`font-bold ${TIER_STYLES.epic.text}`}>에픽 8장</p>
            <p className="text-orange-400">→ 전설</p>
          </div>
        </div>
      </div>

      {/* 티어 탭 */}
      <div className="flex gap-2">
        {FUSION_TIERS.map(tier => {
          const tierStyle = TIER_STYLES[tier]
          const count = getFusableCount(tier)
          const needed = FUSION_REQUIREMENTS[tier].required
          const isActive = selectedTier === tier

          return (
            <button
              key={tier}
              onClick={() => handleTabChange(tier)}
              className={`flex-1 py-3 px-2 rounded-lg border-2 transition-all ${
                isActive
                  ? `${tierStyle.bg} ${tierStyle.border} ${tierStyle.text}`
                  : 'bg-gray-800/50 border-gray-600 text-gray-500 hover:border-gray-500'
              }`}
            >
              <div className="text-sm font-bold">{FUSION_RESULT_NAMES[tier]}</div>
              <div className={`text-xs ${count >= needed ? 'text-green-400' : 'text-gray-500'}`}>
                {count} / {needed}장
              </div>
            </button>
          )
        })}
      </div>

      {/* 합성 결과 표시 */}
      {fusionResult && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-yellow-400 font-bold text-lg mb-2">합성 성공!</p>
          </div>
          <FusionResultCard card={fusionResult} />
          <button
            onClick={() => setFusionResult(null)}
            className="w-full py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
          >
            확인
          </button>
        </div>
      )}

      {/* 합성 중 애니메이션 */}
      {isFusing && (
        <div className="flex flex-col items-center py-8">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-3xl">🔮</span>
          </div>
          <p className="text-amber-400 font-medium mt-4">합성 중...</p>
        </div>
      )}

      {/* 카드 선택 영역 */}
      {!isFusing && !fusionResult && (
        <>
          {/* 선택 현황 + 버튼 */}
          <div className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${style.text}`}>🎴</span>
              <span className="text-gray-400">
                선택: <span className={selectedCardIds.size === requirement.required ? 'text-green-400' : 'text-white'}>
                  {selectedCardIds.size}
                </span> / {requirement.required}장
              </span>
            </div>
            <div className="flex gap-2">
              {tierCards.length >= requirement.required && selectedCardIds.size < requirement.required && (
                <button
                  onClick={selectAll}
                  className="px-3 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500"
                >
                  자동선택
                </button>
              )}
              {selectedCardIds.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* 카드 목록 */}
          {tierCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-2 block">🃏</span>
              <p>{FUSION_RESULT_NAMES[selectedTier]} 등급 카드가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
              {tierCards.map(card => (
                <SelectableCard
                  key={card.id}
                  card={card}
                  isSelected={selectedCardIds.has(card.id)}
                  onToggle={() => toggleCard(card.id)}
                />
              ))}
            </div>
          )}

          {/* 합성 버튼 */}
          <button
            onClick={handleFuse}
            disabled={!canExecuteFusion}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              canExecuteFusion
                ? `bg-gradient-to-r ${style.gradient} text-white hover:scale-105 shadow-lg`
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canExecuteFusion ? (
              <div className="flex items-center justify-center gap-2">
                <span>🔮</span>
                <span>합성하기</span>
                <span className="text-sm">
                  → {FUSION_RESULT_NAMES[requirement.resultTier]}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>🔮</span>
                <span>
                  {tierCards.length < requirement.required
                    ? `${requirement.required - tierCards.length}장 더 필요`
                    : `${requirement.required - selectedCardIds.size}장 더 선택하세요`
                  }
                </span>
              </div>
            )}
          </button>
        </>
      )}
    </div>
  )
}
