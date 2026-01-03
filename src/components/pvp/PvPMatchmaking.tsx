/**
 * PvP Matchmaking Component
 *
 * 상대 검색, 공격덱 선택, 배틀 실행을 담당합니다.
 */

import { useState, useEffect } from 'react'
import type { CharacterStats } from '../../types/stats'
import type { OwnedCard, CardSlots } from '../../types/cardDeck'
import type { EquippedItems } from '../../types/equipment'
import type { BattleCard } from '../../types/battleCard'
import type { PvPOpponent, BattleSnapshot } from '../../types/pvpBattle'
import { ownedCardToBattleCard, TIER_ORDER } from '../../types/cardDeck'
import { BATTLE_CARD_TIER_COLORS } from '../../types/battleCard'
import { PvPBattleReplay } from './PvPBattleReplay'

// =============================================
// 타입 정의
// =============================================

interface PvPMatchmakingProps {
  playerStats: CharacterStats
  playerName: string
  combatPower: number
  equipment: EquippedItems
  ownedCards: OwnedCard[]
  pvpBattle: {
    status: string
    opponent: PvPOpponent | null
    attackDeck: BattleCard[]
    currentBattle: any
    error: string | null
    isLoading: boolean
    searchOpponent: (combatPower: number) => Promise<boolean>
    selectAttackDeck: (cards: CardSlots) => void
    startBattle: (snapshot: BattleSnapshot, defenderCards: BattleCard[]) => Promise<any>
    cancelSearch: () => void
    resetBattle: () => void
  }
  myRating: number
  onGoldUpdate?: (amount: number) => void
}

// =============================================
// 카드 선택 컴포넌트
// =============================================

function CardSelector({
  cards,
  selectedSlots,
  onSelect,
}: {
  cards: OwnedCard[]
  selectedSlots: CardSlots
  onSelect: (slotIndex: number, card: OwnedCard | null) => void
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null)

  // 카드를 티어순으로 정렬
  const sortedCards = [...cards].sort((a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier])

  // 이미 선택된 카드 ID
  const selectedIds = selectedSlots.filter(Boolean).map(c => c!.id)

  return (
    <div className="space-y-4">
      {/* 선택된 슬롯 */}
      <div className="flex gap-3 justify-center">
        {[0, 1, 2].map(slotIndex => {
          const card = selectedSlots[slotIndex]
          const isActive = activeSlot === slotIndex

          return (
            <div
              key={slotIndex}
              onClick={() => setActiveSlot(isActive ? null : slotIndex)}
              className={`w-24 h-32 rounded-lg border-2 cursor-pointer transition-all ${
                isActive
                  ? 'border-yellow-400 bg-yellow-900/20'
                  : card
                    ? `${BATTLE_CARD_TIER_COLORS[card.tier]} border-current`
                    : 'border-gray-600 border-dashed bg-gray-700/30'
              }`}
            >
              {card ? (
                <div className="h-full flex flex-col items-center justify-center p-2">
                  <span className="text-2xl mb-1">
                    {ownedCardToBattleCard(card).emoji}
                  </span>
                  <p className="text-xs text-center text-white font-medium line-clamp-2">
                    {ownedCardToBattleCard(card).name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {ownedCardToBattleCard(card).description}
                  </p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-gray-500 text-sm">슬롯 {slotIndex + 1}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 슬롯 선택 안내 */}
      {activeSlot !== null && (
        <div className="text-center text-sm text-yellow-400">
          슬롯 {activeSlot + 1}에 넣을 카드를 선택하세요
          {selectedSlots[activeSlot] && (
            <button
              onClick={() => {
                onSelect(activeSlot, null)
                setActiveSlot(null)
              }}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              (비우기)
            </button>
          )}
        </div>
      )}

      {/* 카드 목록 */}
      {activeSlot !== null && (
        <div className="max-h-48 overflow-y-auto bg-gray-700/30 rounded-lg p-2">
          <div className="grid grid-cols-3 gap-2">
            {sortedCards.map(card => {
              const isSelected = selectedIds.includes(card.id)
              const battleCard = ownedCardToBattleCard(card)

              return (
                <button
                  key={card.id}
                  onClick={() => {
                    if (!isSelected) {
                      onSelect(activeSlot, card)
                      setActiveSlot(null)
                    }
                  }}
                  disabled={isSelected}
                  className={`p-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'opacity-40 cursor-not-allowed bg-gray-600'
                      : `${BATTLE_CARD_TIER_COLORS[card.tier]} hover:scale-105 cursor-pointer`
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
      )}
    </div>
  )
}

// =============================================
// 상대 정보 표시
// =============================================

function OpponentInfo({ opponent }: { opponent: PvPOpponent }) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
          <div>
            <p className="text-white font-bold">{opponent.username}</p>
            <p className="text-gray-400 text-sm">{opponent.tier} | {opponent.rating} RP</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 font-bold">{opponent.combatPower.toLocaleString()}</p>
          <p className="text-gray-400 text-xs">전투력</p>
        </div>
      </div>

      {/* 상대 스탯 */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-800/50 rounded p-2 text-center">
          <p className="text-red-400 font-bold">{opponent.stats.attack}</p>
          <p className="text-gray-500">공격력</p>
        </div>
        <div className="bg-gray-800/50 rounded p-2 text-center">
          <p className="text-blue-400 font-bold">{opponent.stats.defense}</p>
          <p className="text-gray-500">방어력</p>
        </div>
        <div className="bg-gray-800/50 rounded p-2 text-center">
          <p className="text-green-400 font-bold">{opponent.stats.hp}</p>
          <p className="text-gray-500">HP</p>
        </div>
        <div className="bg-gray-800/50 rounded p-2 text-center">
          <p className="text-cyan-400 font-bold">{opponent.stats.attackSpeed}%</p>
          <p className="text-gray-500">공속</p>
        </div>
      </div>

      <p className="text-gray-500 text-xs text-center mt-2">
        방어덱 카드: {opponent.cardCount}장
      </p>
    </div>
  )
}

// =============================================
// 메인 컴포넌트
// =============================================

export function PvPMatchmaking({
  playerStats,
  playerName,
  combatPower,
  equipment,
  ownedCards,
  pvpBattle,
  myRating,
  onGoldUpdate,
}: PvPMatchmakingProps) {
  const [selectedCards, setSelectedCards] = useState<CardSlots>([null, null, null])

  const {
    status,
    opponent,
    currentBattle,
    error,
    isLoading,
    searchOpponent,
    selectAttackDeck,
    startBattle,
    cancelSearch,
    resetBattle,
  } = pvpBattle

  // 카드 선택 핸들러
  const handleCardSelect = (slotIndex: number, card: OwnedCard | null) => {
    const newSlots = [...selectedCards] as CardSlots
    newSlots[slotIndex] = card
    setSelectedCards(newSlots)
  }

  // 대전 시작
  const handleStartBattle = async () => {
    selectAttackDeck(selectedCards)

    const snapshot: BattleSnapshot = {
      oderId: '', // 서버에서 채워짐
      username: playerName,
      stats: playerStats,
      combatPower,
      equipment,
      cards: selectedCards
        .filter((c): c is OwnedCard => c !== null)
        .map(ownedCardToBattleCard),
      tier: 'bronze', // TODO: 실제 티어
      rating: myRating,
    }

    // 상대 방어덱 카드 조회 필요 - 지금은 빈 배열로 시작
    // 실제로는 상대 방어덱을 조회해야 함
    const result = await startBattle(snapshot, [])

    if (result && onGoldUpdate) {
      onGoldUpdate(result.attackerReward)
    }
  }

  // 검색 중
  if (status === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-purple-400 rounded-full animate-spin mb-4" />
        <p className="text-white font-bold text-lg mb-2">상대를 찾는 중...</p>
        <p className="text-gray-400 text-sm mb-4">전투력 ±300 범위에서 검색 중</p>
        <button
          onClick={cancelSearch}
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
        >
          취소
        </button>
      </div>
    )
  }

  // 배틀 진행/완료
  if (status === 'fighting' || status === 'finished') {
    return (
      <PvPBattleReplay
        battle={currentBattle}
        isPlaying={status === 'fighting'}
        onClose={resetBattle}
        onClaimReward={(amount) => {
          if (onGoldUpdate) onGoldUpdate(amount)
          resetBattle()
        }}
      />
    )
  }

  // 상대 선택됨 - 덱 선택
  if (status === 'preparing' && opponent) {
    return (
      <div className="space-y-4">
        <OpponentInfo opponent={opponent} />

        <div className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-white font-bold mb-3 text-center">공격덱 선택</h4>
          <CardSelector
            cards={ownedCards}
            selectedSlots={selectedCards}
            onSelect={handleCardSelect}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={cancelSearch}
            className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
          >
            취소
          </button>
          <button
            onClick={handleStartBattle}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
          >
            {isLoading ? '준비 중...' : '대전 시작!'}
          </button>
        </div>

        <p className="text-gray-500 text-xs text-center">
          카드를 선택하지 않아도 대전할 수 있습니다
        </p>
      </div>
    )
  }

  // 대기 상태 - 매칭 시작
  return (
    <div className="space-y-4">
      {/* 내 스탯 */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <h4 className="text-white font-bold mb-3">내 스탯</h4>
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
        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <p className="text-yellow-400 font-bold">{playerStats.critRate}%</p>
            <p className="text-gray-500">치명타</p>
          </div>
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <p className="text-orange-400 font-bold">{playerStats.critDamage}%</p>
            <p className="text-gray-500">치명뎀</p>
          </div>
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <p className="text-purple-400 font-bold">{playerStats.penetration}%</p>
            <p className="text-gray-500">관통력</p>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* 매칭 버튼 */}
      <button
        onClick={() => searchOpponent(combatPower)}
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-lg rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            검색 중...
          </span>
        ) : (
          '상대 찾기'
        )}
      </button>

      <p className="text-gray-500 text-xs text-center">
        전투력 ±300 범위에서 상대를 검색합니다
      </p>

      {/* 보유 카드 수 */}
      <div className="text-center text-gray-400 text-sm">
        보유 카드: {ownedCards.length}장
      </div>
    </div>
  )
}
