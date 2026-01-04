/**
 * PvP Matchmaking Component
 *
 * 상대 검색, 공격덱 선택, 배틀 실행을 담당합니다.
 */

import { useState } from 'react'
import type { CharacterStats } from '../../types/stats'
import type { OwnedCard, CardSlots } from '../../types/cardDeck'
import type { EquippedItems } from '../../types/equipment'
import type { BattleCard } from '../../types/battleCard'
import type { PvPOpponent, BattleSnapshot } from '../../types/pvpBattle'
import { ownedCardToBattleCard, TIER_ORDER } from '../../types/cardDeck'
import { generateAICardsMatchingPlayer } from '../../hooks/usePvPBattle'
import { BATTLE_CARD_TIER_COLORS } from '../../types/battleCard'
import { calculateTotalGoldBonus } from '../../utils/pvpBattle'
import { PvPRealtimeBattle } from './PvPRealtimeBattle'

// =============================================
// 타입 정의
// =============================================

interface PvPMatchmakingProps {
  playerStats: CharacterStats
  playerName: string
  playerAvatarUrl?: string  // 플레이어 프로필 이미지
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
    startBattle: (snapshot: BattleSnapshot, attackerCards: BattleCard[], defenderCards: BattleCard[]) => Promise<any>
    cancelSearch: () => void
    resetBattle: () => void
  }
  myRating: number
  onGoldUpdate?: (amount: number) => void
  ensureDefenseDeck?: (stats: CharacterStats, equipment: EquippedItems, combatPower: number) => Promise<boolean>
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
// 메인 컴포넌트
// =============================================

export function PvPMatchmaking({
  playerStats,
  playerName,
  playerAvatarUrl,
  combatPower,
  equipment,
  ownedCards,
  pvpBattle,
  myRating,
  onGoldUpdate,
  ensureDefenseDeck,
}: PvPMatchmakingProps) {
  const [selectedCards, setSelectedCards] = useState<CardSlots>([null, null, null])
  // AI 상대일 때, 플레이어 카드에 맞춰 재생성된 AI 카드
  const [matchedAICards, setMatchedAICards] = useState<BattleCard[]>([])

  // 상대 찾기 + 자동 방어덱 등록
  const handleSearchOpponent = async () => {
    // 자동 방어덱 등록 (없으면 생성, 있으면 스탯 업데이트)
    if (ensureDefenseDeck) {
      await ensureDefenseDeck(playerStats, equipment, combatPower)
    }
    // 상대 검색
    await searchOpponent(combatPower)
  }


  const {
    status,
    opponent,
    error,
    isLoading,
    searchOpponent,
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

  // 취소 핸들러 (AI 카드 초기화 포함)
  const handleCancel = () => {
    setMatchedAICards([])
    cancelSearch()
  }

  // 대전 시작 - 실시간 배틀로 전환
  const handleStartBattle = async () => {
    // 공격 카드 변환
    const attackCards = selectedCards
      .filter((c): c is OwnedCard => c !== null)
      .map(ownedCardToBattleCard)

    // AI 상대일 경우, 플레이어 카드에 맞춰 AI 카드 재생성
    // 30%: 더 높은 등급, 60%: 비슷한 등급, 10%: 더 낮은 등급
    if (opponent?.isAI) {
      const matchedCards = generateAICardsMatchingPlayer(attackCards)
      setMatchedAICards(matchedCards)
    }

    const snapshot: BattleSnapshot = {
      oderId: '',
      username: playerName,
      stats: playerStats,
      combatPower,
      equipment,
      cards: attackCards,
      tier: 'bronze',
      rating: myRating,
    }

    // startBattle 호출하면 status가 'fighting'으로 변경됨
    // 실제 배틀은 PvPRealtimeBattle 컴포넌트에서 처리
    await startBattle(snapshot, attackCards, [])
  }

  // 검색 중
  if (status === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        {/* 애니메이션 영역 */}
        <div className="relative w-32 h-32 mb-6">
          {/* 외곽 링 */}
          <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />

          {/* 중간 링 */}
          <div className="absolute inset-3 border-4 border-blue-500/30 rounded-full" />
          <div className="absolute inset-3 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />

          {/* 내부 링 */}
          <div className="absolute inset-6 border-4 border-cyan-500/30 rounded-full" />
          <div className="absolute inset-6 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"
            style={{ animationDuration: '0.8s' }} />

          {/* 중앙 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl animate-pulse">⚔️</span>
          </div>
        </div>

        {/* 텍스트 */}
        <div className="text-center space-y-2 mb-6">
          <p className="text-white font-bold text-xl">상대를 찾는 중...</p>
          <p className="text-gray-400 text-sm">전투력 {combatPower.toLocaleString()} ±300 범위</p>
          <div className="flex items-center justify-center gap-1 text-purple-400">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </div>
        </div>

        {/* 취소 버튼 */}
        <button
          onClick={handleCancel}
          className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 border border-gray-600 transition-colors"
        >
          ❌ 취소
        </button>
      </div>
    )
  }

  // 배틀 진행 중 - 실시간 배틀
  if (status === 'fighting' && opponent) {
    const playerCards = selectedCards
      .filter((c): c is OwnedCard => c !== null)
      .map(ownedCardToBattleCard)

    // 골드 보너스 카드 효과 계산
    const goldBonusPercent = calculateTotalGoldBonus(playerCards)
    const goldMultiplier = 1 + goldBonusPercent / 100

    // 보상 계산 (AI는 50%, 골드 보너스 적용)
    const aiMultiplier = opponent.isAI ? 0.5 : 1
    const winGold = Math.floor(500 * aiMultiplier * goldMultiplier)
    const loseGold = Math.floor(100 * aiMultiplier * goldMultiplier)
    const drawGold = Math.floor(250 * aiMultiplier * goldMultiplier)

    // 상대 카드 결정:
    // 1. AI 상대이면서 플레이어 카드에 맞춰 재생성된 카드가 있으면 사용
    // 2. 그렇지 않으면 상대의 실제 방어덱 카드 사용
    // 3. 없으면 AI 카드 (레거시) 또는 빈 배열
    const opponentCards = opponent.isAI && matchedAICards.length > 0
      ? matchedAICards
      : opponent.defenseCards || opponent.aiCards || []

    return (
      <PvPRealtimeBattle
        playerName={playerName}
        playerAvatarUrl={playerAvatarUrl}
        playerStats={playerStats}
        playerCards={playerCards}
        opponentName={opponent.username}
        opponentStats={opponent.stats}
        opponentCards={opponentCards}
        opponentIsAI={opponent.isAI}
        winReward={winGold}
        loseReward={loseGold}
        drawReward={drawGold}
        onBattleEnd={(result) => {
          // 보상 처리
          const reward = result.winner === 'player' ? winGold
            : result.winner === 'opponent' ? loseGold
            : drawGold
          if (onGoldUpdate) onGoldUpdate(reward)
          setMatchedAICards([]) // AI 카드 초기화
          resetBattle()
        }}
      />
    )
  }

  // 상대 선택됨 - 덱 선택 (VS 화면)
  if (status === 'preparing' && opponent) {
    const selectedCardCount = selectedCards.filter(Boolean).length

    return (
      <div className="space-y-4">
        {/* VS 헤더 */}
        <div className="bg-gradient-to-r from-cyan-900/50 via-gray-800 to-red-900/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            {/* 플레이어 */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-2 border-2 border-cyan-400 shadow-lg shadow-cyan-500/30 overflow-hidden">
                {playerAvatarUrl ? (
                  <img src={playerAvatarUrl} alt={playerName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <p className="text-cyan-400 font-bold">{playerName}</p>
              <p className="text-yellow-400 text-sm font-medium">{combatPower.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">전투력</p>
            </div>

            {/* VS */}
            <div className="px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center border-2 border-orange-400 shadow-lg shadow-orange-500/50 animate-pulse">
                <span className="text-white font-black text-xl">VS</span>
              </div>
            </div>

            {/* 상대 */}
            <div className="flex-1 text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 border-2 shadow-lg ${
                opponent.isAI
                  ? 'bg-gradient-to-br from-yellow-500 to-amber-600 border-yellow-400 shadow-yellow-500/30'
                  : 'bg-gradient-to-br from-red-500 to-orange-600 border-red-400 shadow-red-500/30'
              }`}>
                <span className="text-3xl">{opponent.isAI ? '🤖' : '👤'}</span>
              </div>
              <p className="text-red-400 font-bold">{opponent.username}</p>
              <p className="text-yellow-400 text-sm font-medium">{opponent.combatPower.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">전투력</p>
            </div>
          </div>

          {/* AI 알림 */}
          {opponent.isAI && (
            <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-400 text-xs text-center">
                🤖 AI 상대입니다 (보상 50%, 레이팅 변동 없음)
              </p>
            </div>
          )}
        </div>

        {/* 스탯 비교 */}
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
          <h4 className="text-white font-bold text-sm mb-3 text-center">📊 스탯 비교</h4>
          <div className="space-y-2">
            {[
              { label: '공격력', player: playerStats.attack, opp: opponent.stats.attack, color: 'red' },
              { label: '방어력', player: playerStats.defense, opp: opponent.stats.defense, color: 'blue' },
              { label: 'HP', player: playerStats.hp, opp: opponent.stats.hp, color: 'green' },
              { label: '공격속도', player: playerStats.attackSpeed, opp: opponent.stats.attackSpeed, color: 'cyan', suffix: '%' },
            ].map(stat => {
              const playerWins = stat.player > stat.opp
              const oppWins = stat.opp > stat.player
              return (
                <div key={stat.label} className="flex items-center text-xs">
                  <span className={`w-16 text-right font-bold ${playerWins ? `text-${stat.color}-400` : 'text-gray-400'}`}>
                    {stat.player}{stat.suffix || ''}
                  </span>
                  <div className="flex-1 mx-2 h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full bg-${stat.color}-500`}
                      style={{ width: `${(stat.player / (stat.player + stat.opp)) * 100}%` }}
                    />
                    <div
                      className="h-full bg-gray-500"
                      style={{ width: `${(stat.opp / (stat.player + stat.opp)) * 100}%` }}
                    />
                  </div>
                  <span className={`w-16 font-bold ${oppWins ? `text-${stat.color}-400` : 'text-gray-400'}`}>
                    {stat.opp}{stat.suffix || ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 공격덱 선택 */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-bold">🃏 공격덱 선택</h4>
            <span className="text-sm text-gray-400">{selectedCardCount}/3</span>
          </div>
          <CardSelector
            cards={ownedCards}
            selectedSlots={selectedCards}
            onSelect={handleCardSelect}
          />
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 border border-gray-600 transition-colors"
          >
            ← 취소
          </button>
          <button
            onClick={handleStartBattle}
            disabled={isLoading}
            className="flex-[2] px-4 py-4 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white font-bold text-lg rounded-lg hover:scale-105 transition-transform disabled:opacity-50 shadow-lg shadow-orange-500/30"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                준비 중...
              </span>
            ) : (
              '⚔️ 대전 시작!'
            )}
          </button>
        </div>

        <p className="text-gray-500 text-xs text-center">
          💡 카드를 선택하지 않아도 대전할 수 있습니다
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
        onClick={handleSearchOpponent}
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
        전투력 ±300 범위에서 상대를 검색합니다<br />
        상대가 없으면 AI와 대전합니다
      </p>

      {/* 보유 카드 수 */}
      <div className="text-center text-gray-400 text-sm">
        보유 카드: {ownedCards.length}장
      </div>
    </div>
  )
}
