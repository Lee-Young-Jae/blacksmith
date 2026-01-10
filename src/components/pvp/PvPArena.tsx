/**
 * PvP Arena - 메인 PvP 컴포넌트
 *
 * PvP 시스템의 모든 기능을 통합한 메인 컴포넌트입니다.
 * - 매칭/대전
 * - 방어덱 설정
 * - 리더보드
 * - 대전 기록
 */

import { useState } from 'react'
import type { CharacterStats } from '../../types/stats'
import type { EquippedItems } from '../../types/equipment'
import { PvPMatchmaking } from './PvPMatchmaking'
import { DefenseDeckSetup } from './DefenseDeckSetup'
import { PvPLeaderboard } from './PvPLeaderboard'
import { PvPBattleHistory } from './PvPBattleHistory'
import { CardGacha } from './CardGacha'
import { CardFusion } from './CardFusion'
import { usePvPBattle } from '../../hooks/usePvPBattle'
import { useCardDeck } from '../../hooks/useCardDeck'
import { usePvPRanking } from '../../hooks/usePvPRanking'
import { GiCrossedSwords, GiShield, GiCardPlay, GiTrophy, GiScrollUnfurled, GiTicket } from 'react-icons/gi'
import type { IconType } from 'react-icons'
import { AvatarWithBorder } from '../achievements/ProfileBorder'

// =============================================
// 타입 정의
// =============================================

type PvPTab = 'matchmaking' | 'defense' | 'cards' | 'leaderboard' | 'history'

interface PvPArenaProps {
  playerStats: CharacterStats
  playerName: string
  playerAvatarUrl?: string  // 플레이어 프로필 이미지
  playerEquippedBorder?: string | null  // 플레이어 장착 업적 테두리 ID
  combatPower: number
  equipment: EquippedItems
  gold: number
  onGoldUpdate?: (amount: number) => void
}

const TABS: { id: PvPTab; label: string; Icon: IconType }[] = [
  { id: 'matchmaking', label: '대전', Icon: GiCrossedSwords },
  { id: 'defense', label: '방어덱', Icon: GiShield },
  { id: 'cards', label: '카드', Icon: GiCardPlay },
  { id: 'leaderboard', label: '랭킹', Icon: GiTrophy },
  { id: 'history', label: '기록', Icon: GiScrollUnfurled },
]

// =============================================
// 컴포넌트
// =============================================

type CardSubTab = 'gacha' | 'fusion'

export function PvPArena({
  playerStats,
  playerName,
  playerAvatarUrl,
  playerEquippedBorder,
  combatPower,
  equipment,
  gold,
  onGoldUpdate,
}: PvPArenaProps) {
  const [activeTab, setActiveTab] = useState<PvPTab>('matchmaking')
  const [cardSubTab, setCardSubTab] = useState<CardSubTab>('gacha')

  // Hooks
  const pvpBattle = usePvPBattle()
  const cardDeck = useCardDeck()
  const pvpRanking = usePvPRanking()

  // 탭 변경 시 데이터 새로고침
  const handleTabChange = (tab: PvPTab) => {
    setActiveTab(tab)

    if (tab === 'leaderboard') {
      pvpRanking.loadLeaderboard()
    } else if (tab === 'history') {
      pvpBattle.loadBattleLogs()
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 w-full max-w-2xl">
      {/* 헤더 - 내 정보 */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-3">
          <AvatarWithBorder
            avatarUrl={playerAvatarUrl}
            username={playerName}
            borderId={playerEquippedBorder}
            size="sm"
            fallbackIcon={<span className="text-2xl">⚔️</span>}
          />
          <div>
            <p className="text-white font-bold">{playerName}</p>
            <p className="text-gray-400 text-sm">전투력 {combatPower.toLocaleString()}</p>
          </div>
        </div>

        {/* 랭킹 및 티켓 정보 */}
        <div className="flex items-center gap-4">
          {/* 티켓 */}
          <div className="text-center">
            <div className="flex items-center gap-1">
              <GiTicket className="text-lg text-cyan-400" />
              <span className="text-cyan-400 font-bold">{pvpRanking.totalTickets}</span>
            </div>
            <p className="text-gray-500 text-xs">티켓</p>
          </div>

          {/* 랭킹 정보 */}
          {pvpRanking.myRanking && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-lg">{pvpRanking.getMyTierInfo()?.emoji}</span>
                <span className={`font-bold ${pvpRanking.getMyTierInfo()?.color}`}>
                  {pvpRanking.getMyTierInfo()?.name}
                </span>
              </div>
              <p className="text-yellow-400 text-sm font-medium">
                {pvpRanking.myRanking.rating} RP
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 티켓 안내 (티켓이 있을 때만 표시) */}
      {pvpRanking.totalTickets > 0 && (
        <div className="mb-4 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
          <p className="text-cyan-400 text-sm text-center">
            🎫 티켓은 특별 가챠, 시즌 상점에서 사용할 수 있습니다. (준비 중)
          </p>
        </div>
      )}

      {/* 읽지 않은 방어전 알림 */}
      {pvpBattle.unreadDefenseBattles > 0 && (
        <div
          className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg cursor-pointer hover:bg-red-900/50 transition-colors"
          onClick={() => {
            setActiveTab('history')
            pvpBattle.markDefenseBattlesRead()
          }}
        >
          <p className="text-red-400 text-sm text-center">
            <span className="font-bold">{pvpBattle.unreadDefenseBattles}건</span>의 새로운 방어전 결과가 있습니다!
          </p>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            }`}
          >
            <tab.Icon className="text-lg" />
            <span className="text-sm">{tab.label}</span>
            {tab.id === 'history' && pvpBattle.unreadDefenseBattles > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pvpBattle.unreadDefenseBattles}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="min-h-[400px]">
        {activeTab === 'matchmaking' && (
          <PvPMatchmaking
            playerStats={playerStats}
            playerName={playerName}
            playerAvatarUrl={playerAvatarUrl}
            playerBorderId={playerEquippedBorder}
            combatPower={combatPower}
            equipment={equipment}
            ownedCards={cardDeck.ownedCards}
            pvpBattle={pvpBattle}
            myRating={pvpRanking.myRanking?.rating || 1000}
            onGoldUpdate={onGoldUpdate}
            ensureDefenseDeck={cardDeck.ensureDefenseDeck}
          />
        )}

        {activeTab === 'defense' && (
          <DefenseDeckSetup
            playerStats={playerStats}
            combatPower={combatPower}
            equipment={equipment}
            ownedCards={cardDeck.ownedCards}
            defenseDeck={cardDeck.defenseDeck}
            onSave={cardDeck.saveDefenseDeck}
            onUpdateStrategy={cardDeck.updateAIStrategy}
            isLoading={cardDeck.isLoading}
          />
        )}

        {activeTab === 'leaderboard' && (
          <PvPLeaderboard
            leaderboard={pvpRanking.leaderboard}
            myRanking={pvpRanking.myRanking}
            currentSeason={pvpRanking.currentSeason}
            isLoading={pvpRanking.isLoading}
            onRefresh={() => pvpRanking.loadLeaderboard()}
            canClaimWeekly={pvpRanking.canClaimWeekly()}
            onClaimWeekly={pvpRanking.claimWeeklyReward}
          />
        )}

        {activeTab === 'cards' && (
          <div className="space-y-4">
            {/* 카드 서브탭 */}
            <div className="flex gap-2">
              <button
                onClick={() => setCardSubTab('gacha')}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  cardSubTab === 'gacha'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                🎰 뽑기
              </button>
              <button
                onClick={() => setCardSubTab('fusion')}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  cardSubTab === 'fusion'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                🔮 합성
              </button>
            </div>

            {/* 카드 서브탭 컨텐츠 */}
            {cardSubTab === 'gacha' && (
              <CardGacha
                gold={gold}
                ownedCardCount={cardDeck.ownedCards.length}
                onPullSingle={cardDeck.pullCard}
                onPullMulti={cardDeck.pullMultiCards}
                onUpdateGold={async (newGold: number) => {
                  if (onGoldUpdate) {
                    onGoldUpdate(newGold - gold)
                  }
                }}
              />
            )}

            {cardSubTab === 'fusion' && (
              <CardFusion
                ownedCards={cardDeck.ownedCards}
                onFuse={cardDeck.fuseCards}
                getFusableCount={cardDeck.getFusableCount}
              />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <PvPBattleHistory
            battleLogs={pvpBattle.battleLogs}
            isLoading={pvpBattle.isLoading}
            onRefresh={() => pvpBattle.loadBattleLogs()}
            onRevenge={async (opponentId: string) => {
              const success = await pvpBattle.startRevengeBattle(opponentId)
              if (success) {
                setActiveTab('matchmaking')
              }
              return success
            }}
          />
        )}
      </div>
    </div>
  )
}
