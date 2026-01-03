/**
 * Card Gacha Component
 *
 * PvP 카드 가챠 UI
 */

import { useState } from 'react'
import type { OwnedCard } from '../../types/cardDeck'
import { ownedCardToBattleCard } from '../../types/cardDeck'
import { BATTLE_CARD_TIER_COLORS, BATTLE_CARD_TIER_NAMES } from '../../types/battleCard'
import { CARD_GACHA_SINGLE_COST, CARD_GACHA_MULTI_COST } from '../../hooks/useCardDeck'

// =============================================
// 타입 정의
// =============================================

interface CardGachaProps {
  gold: number
  ownedCardCount: number
  onPullSingle: () => Promise<OwnedCard | null>
  onPullMulti: (count: number) => Promise<OwnedCard[]>
  onUpdateGold: (newGold: number) => Promise<void>
}

// =============================================
// 결과 카드 표시
// =============================================

function GachaResultCard({ card }: { card: OwnedCard }) {
  const battleCard = ownedCardToBattleCard(card)

  return (
    <div className={`p-3 rounded-lg border-2 ${BATTLE_CARD_TIER_COLORS[card.tier]} animate-fade-in`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{battleCard.emoji}</span>
        <div>
          <p className="font-bold text-white text-sm">{battleCard.name}</p>
          <p className="text-xs text-gray-400">{BATTLE_CARD_TIER_NAMES[card.tier]}</p>
        </div>
      </div>
      <p className="text-xs text-gray-300">{battleCard.description}</p>
    </div>
  )
}

// =============================================
// 메인 컴포넌트
// =============================================

export function CardGacha({
  gold,
  ownedCardCount,
  onPullSingle,
  onPullMulti,
  onUpdateGold,
}: CardGachaProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [lastResults, setLastResults] = useState<OwnedCard[]>([])

  const canPullSingle = gold >= CARD_GACHA_SINGLE_COST
  const canPullMulti = gold >= CARD_GACHA_MULTI_COST

  const handlePullSingle = async () => {
    if (!canPullSingle || isAnimating) return

    setIsAnimating(true)
    setLastResults([])

    try {
      await onUpdateGold(gold - CARD_GACHA_SINGLE_COST)
      const card = await onPullSingle()

      if (card) {
        setLastResults([card])
      }
    } catch (err) {
      console.error('Failed to pull card:', err)
    } finally {
      setIsAnimating(false)
    }
  }

  const handlePullMulti = async () => {
    if (!canPullMulti || isAnimating) return

    setIsAnimating(true)
    setLastResults([])

    try {
      await onUpdateGold(gold - CARD_GACHA_MULTI_COST)
      const cards = await onPullMulti(10)
      setLastResults(cards)
    } catch (err) {
      console.error('Failed to pull cards:', err)
    } finally {
      setIsAnimating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 설명 */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
          <span className="text-xl">🎴</span>
          카드 뽑기
        </h4>
        <p className="text-gray-400 text-sm">
          PvP에서 사용할 카드를 뽑으세요! 카드는 공격덱과 방어덱에 장착하여 전투에서 활용할 수 있습니다.
        </p>
      </div>

      {/* 보유 현황 */}
      <div className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎴</span>
          <span className="text-gray-400">보유 카드</span>
        </div>
        <span className="text-white font-bold">{ownedCardCount}장</span>
      </div>

      {/* 확률 안내 */}
      <div className="bg-gray-700/30 rounded-lg p-3">
        <h5 className="text-gray-300 text-sm font-medium mb-2">등급 확률</h5>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-gray-600/50 rounded p-2">
            <p className="text-gray-400 font-bold">일반</p>
            <p className="text-gray-500">60%</p>
          </div>
          <div className="bg-blue-900/30 rounded p-2">
            <p className="text-blue-400 font-bold">레어</p>
            <p className="text-blue-500">25%</p>
          </div>
          <div className="bg-purple-900/30 rounded p-2">
            <p className="text-purple-400 font-bold">에픽</p>
            <p className="text-purple-500">12%</p>
          </div>
          <div className="bg-orange-900/30 rounded p-2">
            <p className="text-orange-400 font-bold">전설</p>
            <p className="text-orange-500">3%</p>
          </div>
        </div>
      </div>

      {/* 뽑기 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handlePullSingle}
          disabled={!canPullSingle || isAnimating}
          className={`p-4 rounded-lg font-bold transition-all ${
            canPullSingle && !isAnimating
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-105'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="text-lg mb-1">1장 뽑기</div>
          <div className="flex items-center justify-center gap-1 text-sm">
            <span>🪙</span>
            <span>{CARD_GACHA_SINGLE_COST.toLocaleString()}</span>
          </div>
        </button>

        <button
          onClick={handlePullMulti}
          disabled={!canPullMulti || isAnimating}
          className={`p-4 rounded-lg font-bold transition-all ${
            canPullMulti && !isAnimating
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:scale-105'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="text-lg mb-1">10장 뽑기</div>
          <div className="flex items-center justify-center gap-1 text-sm">
            <span>🪙</span>
            <span>{CARD_GACHA_MULTI_COST.toLocaleString()}</span>
            <span className="text-green-400 text-xs ml-1">(10% 할인)</span>
          </div>
        </button>
      </div>

      {/* 애니메이션 */}
      {isAnimating && (
        <div className="flex flex-col items-center py-8">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
          <p className="text-purple-400 font-medium">카드를 뽑는 중...</p>
        </div>
      )}

      {/* 결과 표시 */}
      {!isAnimating && lastResults.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-white font-bold text-center">획득한 카드</h5>
          <div className={`grid gap-2 ${lastResults.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {lastResults.map(card => (
              <GachaResultCard key={card.id} card={card} />
            ))}
          </div>
          <button
            onClick={() => setLastResults([])}
            className="w-full py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
          >
            확인
          </button>
        </div>
      )}
    </div>
  )
}
