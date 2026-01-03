/**
 * PvP Battle History Component
 *
 * 대전 기록을 표시합니다.
 */

import type { PvPBattleLog } from '../../types/pvpBattle'

// =============================================
// 타입 정의
// =============================================

interface PvPBattleHistoryProps {
  battleLogs: PvPBattleLog[]
  isLoading: boolean
  onRefresh: () => void
  onRevenge: (opponentId: string) => Promise<boolean>
}

// =============================================
// 배틀 로그 항목 컴포넌트
// =============================================

function BattleLogItem({
  log,
  onRevenge,
}: {
  log: PvPBattleLog
  onRevenge: () => void
}) {
  const resultColor = log.myResult === 'win'
    ? 'text-green-400'
    : log.myResult === 'lose'
      ? 'text-red-400'
      : 'text-gray-400'

  const resultText = log.myResult === 'win'
    ? '승리'
    : log.myResult === 'lose'
      ? '패배'
      : '무승부'

  const resultEmoji = log.myResult === 'win'
    ? '🎉'
    : log.myResult === 'lose'
      ? '😢'
      : '🤝'

  const bgColor = log.myResult === 'win'
    ? 'bg-green-900/20'
    : log.myResult === 'lose'
      ? 'bg-red-900/20'
      : 'bg-gray-700/30'

  const timeAgo = getTimeAgo(log.createdAt)

  return (
    <div className={`rounded-lg p-3 ${bgColor}`}>
      <div className="flex items-center justify-between">
        {/* 결과 및 상대 정보 */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{resultEmoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${resultColor}`}>{resultText}</span>
              <span className="text-gray-400 text-sm">vs</span>
              <span className="text-white font-medium">{log.opponentName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{log.isAttacker ? '공격전' : '방어전'}</span>
              <span>|</span>
              <span>{log.totalRounds}라운드</span>
              {log.isRevenge && (
                <>
                  <span>|</span>
                  <span className="text-orange-400">복수전</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 보상 및 레이팅 */}
        <div className="text-right">
          <p className="text-yellow-400 font-medium text-sm">
            +{log.goldReward.toLocaleString()} 골드
          </p>
          <p className={`text-xs ${log.ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {log.ratingChange >= 0 ? '+' : ''}{log.ratingChange} RP
          </p>
        </div>
      </div>

      {/* 복수전 버튼 및 시간 */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-gray-500 text-xs">{timeAgo}</span>
        {log.canRevenge && (
          <button
            onClick={onRevenge}
            className="px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-500"
          >
            복수전
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================
// 시간 경과 표시 함수
// =============================================

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString()
}

// =============================================
// 메인 컴포넌트
// =============================================

export function PvPBattleHistory({
  battleLogs,
  isLoading,
  onRefresh,
  onRevenge,
}: PvPBattleHistoryProps) {
  // 통계 계산
  const stats = {
    total: battleLogs.length,
    wins: battleLogs.filter(l => l.myResult === 'win').length,
    losses: battleLogs.filter(l => l.myResult === 'lose').length,
    draws: battleLogs.filter(l => l.myResult === 'draw').length,
    attacks: battleLogs.filter(l => l.isAttacker).length,
    defenses: battleLogs.filter(l => !l.isAttacker).length,
  }

  const winRate = stats.total > 0
    ? Math.round((stats.wins / stats.total) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* 통계 */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-white font-bold text-lg">{stats.total}</p>
            <p className="text-gray-500 text-xs">총 대전</p>
          </div>
          <div>
            <p className="text-green-400 font-bold text-lg">{stats.wins}</p>
            <p className="text-gray-500 text-xs">승리</p>
          </div>
          <div>
            <p className="text-red-400 font-bold text-lg">{stats.losses}</p>
            <p className="text-gray-500 text-xs">패배</p>
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-lg">{winRate}%</p>
            <p className="text-gray-500 text-xs">승률</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-gray-800/50 rounded p-2">
            <span className="text-blue-400">{stats.attacks}</span>
            <span className="text-gray-500"> 공격전</span>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <span className="text-orange-400">{stats.defenses}</span>
            <span className="text-gray-500"> 방어전</span>
          </div>
        </div>
      </div>

      {/* 새로고침 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg text-sm hover:bg-gray-600"
        >
          {isLoading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* 배틀 로그 목록 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : battleLogs.length > 0 ? (
          battleLogs.map(log => (
            <BattleLogItem
              key={log.id}
              log={log}
              onRevenge={() => onRevenge(log.opponentId)}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">대전 기록이 없습니다</p>
            <p className="text-gray-600 text-sm">대전 탭에서 첫 대전을 시작해보세요!</p>
          </div>
        )}
      </div>
    </div>
  )
}
