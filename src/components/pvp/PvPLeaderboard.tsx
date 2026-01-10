/**
 * PvP Leaderboard Component
 *
 * 랭킹 리더보드와 시즌 정보를 표시합니다.
 */

import { useState } from 'react'
import type {
  LeaderboardEntry,
  PvPRanking,
  PvPSeason,
  LeagueTier,
  WeeklyReward,
} from '../../types/league'
import { TIER_INFO, LEAGUE_TIERS } from '../../types/league'
import { GiTrophy, GiMedal, GiRibbonMedal } from 'react-icons/gi'
import { AvatarWithBorder } from '../achievements/ProfileBorder'

// =============================================
// 타입 정의
// =============================================

interface PvPLeaderboardProps {
  leaderboard: LeaderboardEntry[]
  myRanking: PvPRanking | null
  currentSeason: PvPSeason | null
  isLoading: boolean
  onRefresh: () => void
  canClaimWeekly: boolean
  onClaimWeekly: () => Promise<WeeklyReward | null>
}

// =============================================
// 티어 뱃지 컴포넌트
// =============================================

function TierBadge({ tier }: { tier: LeagueTier }) {
  const info = TIER_INFO[tier]

  // 유효하지 않은 티어인 경우 기본값 사용
  if (!info) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-400">
        🎮 {tier || '없음'}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${info.bgColor} ${info.color}`}>
      {info.emoji} {info.name}
    </span>
  )
}

// =============================================
// 랭킹 항목 컴포넌트
// =============================================

function LeaderboardItem({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry
  isMe: boolean
}) {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { Icon: GiTrophy, color: 'text-yellow-400' }
    if (rank === 2) return { Icon: GiMedal, color: 'text-gray-300' }
    if (rank === 3) return { Icon: GiRibbonMedal, color: 'text-orange-400' }
    return { Icon: null, color: 'text-gray-400' }
  }

  const rankDisplay = getRankDisplay(entry.rank)
  const winRate = entry.wins + entry.losses > 0
    ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
    : 0

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${
      isMe ? 'bg-amber-900/30 ring-1 ring-amber-500' : 'bg-stone-700/30'
    }`}>
      {/* 순위 */}
      <div className={`w-10 text-center font-bold ${rankDisplay.color}`}>
        {rankDisplay.Icon ? (
          <rankDisplay.Icon className="text-xl mx-auto" />
        ) : (
          <span>#{entry.rank}</span>
        )}
      </div>

      {/* 아바타 + 테두리 */}
      <AvatarWithBorder
        avatarUrl={entry.avatarUrl}
        username={entry.username}
        borderId={entry.equippedBorder}
        size="sm"
      />

      {/* 유저 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${isMe ? 'text-amber-300' : 'text-amber-100'}`}>
            {entry.username}
            {isMe && <span className="text-amber-400 text-xs ml-1">(나)</span>}
          </span>
          <TierBadge tier={entry.tier} />
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-200/60">
          <span>{entry.wins}승 {entry.losses}패</span>
          <span>({winRate}%)</span>
          {entry.winStreak > 2 && (
            <span className="text-orange-400">{entry.winStreak}연승</span>
          )}
        </div>
      </div>

      {/* 레이팅 */}
      <div className="text-right">
        <p className="text-amber-400 font-bold">{entry.rating}</p>
        <p className="text-amber-200/50 text-xs">RP</p>
      </div>
    </div>
  )
}

// =============================================
// 메인 컴포넌트
// =============================================

export function PvPLeaderboard({
  leaderboard,
  myRanking,
  currentSeason,
  isLoading,
  onRefresh,
  canClaimWeekly,
  onClaimWeekly,
}: PvPLeaderboardProps) {
  const [selectedTier, setSelectedTier] = useState<LeagueTier | 'all'>('all')
  const [claimingWeekly, setClaimingWeekly] = useState(false)

  // 주간 보상 수령
  const handleClaimWeekly = async () => {
    setClaimingWeekly(true)
    await onClaimWeekly()
    setClaimingWeekly(false)
  }

  // 티어별 필터링
  const filteredLeaderboard = selectedTier === 'all'
    ? leaderboard
    : leaderboard.filter(e => e.tier === selectedTier)

  return (
    <div className="space-y-4">
      {/* 시즌 정보 */}
      {currentSeason && (
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl p-4 border border-amber-700/30">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-amber-100 font-bold">{currentSeason.name}</h4>
              <p className="text-amber-200/60 text-sm">
                {currentSeason.endDate.toLocaleDateString()} 종료
              </p>
            </div>
            <div className="text-right">
              {myRanking && (
                <>
                  <TierBadge tier={myRanking.tier} />
                  <p className="text-amber-400 font-bold mt-1">{myRanking.rating} RP</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 주간 보상 */}
      {myRanking && TIER_INFO[myRanking.tier] && (
        <div className={`rounded-xl p-4 ${
          canClaimWeekly
            ? 'bg-yellow-900/30 border border-yellow-500/50'
            : 'bg-stone-700/30 border border-amber-700/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-amber-100 font-bold text-sm">주간 보상</h4>
              <p className="text-amber-200/60 text-xs">
                {TIER_INFO[myRanking.tier].weeklyReward.gold.toLocaleString()} 골드
                {TIER_INFO[myRanking.tier].weeklyReward.tickets > 0 && (
                  <span> + {TIER_INFO[myRanking.tier].weeklyReward.tickets} 티켓</span>
                )}
              </p>
            </div>
            <button
              onClick={handleClaimWeekly}
              disabled={!canClaimWeekly || claimingWeekly}
              className={`px-4 py-2 rounded-xl font-medium text-sm ${
                canClaimWeekly
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-stone-600 text-amber-200/50 cursor-not-allowed'
              }`}
            >
              {claimingWeekly ? '수령 중...' : canClaimWeekly ? '수령하기' : '수령 완료'}
            </button>
          </div>
        </div>
      )}

      {/* 내 랭킹 요약 */}
      {myRanking && (
        <div className="bg-stone-800/50 rounded-xl p-4 border border-amber-700/30">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-green-400 font-bold text-lg">{myRanking.wins}</p>
              <p className="text-amber-200/50 text-xs">승리</p>
            </div>
            <div>
              <p className="text-red-400 font-bold text-lg">{myRanking.losses}</p>
              <p className="text-amber-200/50 text-xs">패배</p>
            </div>
            <div>
              <p className="text-amber-200/60 font-bold text-lg">{myRanking.draws}</p>
              <p className="text-amber-200/50 text-xs">무승부</p>
            </div>
            <div>
              <p className="text-orange-400 font-bold text-lg">{myRanking.winStreak}</p>
              <p className="text-amber-200/50 text-xs">연승</p>
            </div>
          </div>
        </div>
      )}

      {/* 티어 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedTier('all')}
          className={`px-3 py-1.5 rounded-xl text-sm whitespace-nowrap ${
            selectedTier === 'all'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
              : 'bg-stone-700/60 text-amber-200/60 hover:bg-stone-600/60 hover:text-amber-100'
          }`}
        >
          전체
        </button>
        {LEAGUE_TIERS.map(tier => {
          const info = TIER_INFO[tier]
          return (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-xl text-sm whitespace-nowrap ${
                selectedTier === tier
                  ? `${info.bgColor} ${info.color} ring-1 ${info.borderColor}`
                  : 'bg-stone-700/60 text-amber-200/60 hover:bg-stone-600/60 hover:text-amber-100'
              }`}
            >
              {info.emoji} {info.name}
            </button>
          )
        })}
      </div>

      {/* 새로고침 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 bg-stone-700/60 text-amber-200/60 rounded-xl text-sm hover:bg-stone-600/60 hover:text-amber-100"
        >
          {isLoading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* 리더보드 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-stone-600 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : filteredLeaderboard.length > 0 ? (
          filteredLeaderboard.map(entry => (
            <LeaderboardItem
              key={entry.userId}
              entry={entry}
              isMe={myRanking?.userId === entry.userId}
            />
          ))
        ) : (
          <div className="text-center py-8 text-amber-200/50">
            해당 티어에 랭킹이 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
