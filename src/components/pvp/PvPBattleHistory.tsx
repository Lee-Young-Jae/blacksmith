/**
 * PvP Battle History Component
 *
 * 대전 기록을 표시합니다.
 */

import { useState } from 'react'
import type { PvPBattleLog, BattleSnapshot } from '../../types/pvpBattle'
import {
  EQUIPMENT_SLOT_NAMES,
  EQUIPMENT_SLOT_EMOJIS,
  EQUIPMENT_SLOTS,
  getEquipmentDisplayName,
  getEquipmentAtLevel,
} from '../../types/equipment'
import type { EquipmentSlot, UserEquipment } from '../../types/equipment'
import { POTENTIAL_TIER_COLORS, POTENTIAL_TIER_NAMES, STAT_NAMES } from '../../types/potential'
import { GiTrophyCup, GiBrokenHeart, GiShakingHands } from 'react-icons/gi'
import type { IconType } from 'react-icons'

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
// 장비 상세 카드 컴포넌트
// =============================================

function EquipmentCard({ slot, item }: { slot: EquipmentSlot; item: UserEquipment }) {
  const [showPotentials, setShowPotentials] = useState(false)

  if (!item || !item.equipmentBase) return null

  const displayName = getEquipmentDisplayName(item)
  const levelData = getEquipmentAtLevel(item.equipmentBase, item.starLevel)
  const unlockedPotentials = item.potentials?.filter(p => p.isUnlocked) || []

  return (
    <div className="bg-gray-800/50 rounded-lg p-2 space-y-1">
      {/* 장비 헤더 */}
      <div className="flex items-center gap-2">
        {/* 이미지 또는 이모지 */}
        {levelData.image ? (
          <img
            src={levelData.image}
            alt={displayName}
            className="w-10 h-10 object-contain rounded bg-gray-900/50"
          />
        ) : (
          <div className="w-10 h-10 flex items-center justify-center bg-gray-900/50 rounded text-xl">
            {item.equipmentBase.emoji || EQUIPMENT_SLOT_EMOJIS[slot]}
          </div>
        )}

        {/* 이름 및 정보 */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{displayName}</p>
          <p className="text-gray-500 text-xs">{EQUIPMENT_SLOT_NAMES[slot]}</p>
        </div>

        {/* 스타 레벨 뱃지 */}
        {item.starLevel > 0 && (
          <div className="text-yellow-400 text-xs font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded">
            ★{item.starLevel}
          </div>
        )}
      </div>

      {/* 잠재옵션 토글 */}
      {unlockedPotentials.length > 0 && (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowPotentials(!showPotentials)
            }}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            잠재옵션 {unlockedPotentials.length}개 {showPotentials ? '▲' : '▼'}
          </button>

          {showPotentials && (
            <div className="mt-1 space-y-0.5">
              {unlockedPotentials.map((potential, idx) => {
                const tierColorClass = POTENTIAL_TIER_COLORS[potential.tier]?.split(' ')[0] || 'text-gray-400'
                const statName = STAT_NAMES[potential.stat]
                return (
                  <div key={idx} className={`text-xs ${tierColorClass}`}>
                    {statName}: {potential.isPercentage ? `+${potential.value}%` : `+${potential.value}`}
                    <span className="text-gray-600 ml-1">({POTENTIAL_TIER_NAMES[potential.tier]})</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// 상대방 상세 정보 컴포넌트
// =============================================

function OpponentDetails({ snapshot }: { snapshot: BattleSnapshot }) {
  const [showEquipment, setShowEquipment] = useState(false)
  const stats = snapshot.stats

  const equippedSlots = EQUIPMENT_SLOTS.filter(
    slot => snapshot.equipment?.[slot]?.equipmentBase
  )

  return (
    <div className="mt-3 pt-3 border-t border-gray-600/50 space-y-3">
      {/* 전투력 및 레이팅 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">전투력</span>
          <span className="text-yellow-400 font-bold">{snapshot.combatPower.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">레이팅</span>
          <span className="text-purple-400 font-bold">{snapshot.rating} RP</span>
        </div>
      </div>

      {/* 주요 스탯 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-800/50 rounded p-2 text-center">
          <p className="text-red-400 font-bold">{stats.hp.toLocaleString()}</p>
          <p className="text-gray-500">HP</p>
        </div>
        <div className="bg-gray-800/50 rounded p-2 text-center">
          <p className="text-orange-400 font-bold">{stats.attack}</p>
          <p className="text-gray-500">공격력</p>
        </div>
        <div className="bg-gray-800/50 rounded p-2 text-center">
          <p className="text-blue-400 font-bold">{stats.defense}</p>
          <p className="text-gray-500">방어력</p>
        </div>
      </div>

      {/* 세부 스탯 */}
      <div className="grid grid-cols-4 gap-1 text-xs">
        <div className="text-center">
          <span className="text-gray-500">크리티컬 </span>
          <span className="text-yellow-400">{stats.critRate}%</span>
        </div>
        <div className="text-center">
          <span className="text-gray-500">크뎀 </span>
          <span className="text-yellow-400">{stats.critDamage}%</span>
        </div>
        <div className="text-center">
          <span className="text-gray-500">관통력 </span>
          <span className="text-cyan-400">{stats.penetration}%</span>
        </div>
        <div className="text-center">
          <span className="text-gray-500">공속 </span>
          <span className="text-green-400">{stats.attackSpeed}</span>
        </div>
      </div>

      {/* 장비 목록 */}
      {equippedSlots.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowEquipment(!showEquipment)
            }}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
          >
            <span>장착 장비</span>
            <span className="text-purple-400 font-medium">{equippedSlots.length}개</span>
            <span className={`text-gray-500 text-xs transition-transform ${showEquipment ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showEquipment && (
            <div className="grid grid-cols-1 gap-2">
              {equippedSlots.map(slot => (
                <EquipmentCard
                  key={slot}
                  slot={slot}
                  item={snapshot.equipment![slot]!}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 사용 카드 */}
      {snapshot.cards && snapshot.cards.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">사용 카드</span>
          <span className="text-purple-400 font-medium">{snapshot.cards.length}장</span>
        </div>
      )}
    </div>
  )
}

// =============================================
// 배틀 로그 항목 컴포넌트
// =============================================

function BattleLogItem({
  log,
  onRevenge,
  isExpanded,
  onToggle,
  isRevengeLoading,
}: {
  log: PvPBattleLog
  onRevenge: () => Promise<boolean>
  isExpanded: boolean
  onToggle: () => void
  isRevengeLoading: boolean
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

  const ResultIcon: IconType = log.myResult === 'win'
    ? GiTrophyCup
    : log.myResult === 'lose'
      ? GiBrokenHeart
      : GiShakingHands

  const resultIconColor = log.myResult === 'win'
    ? 'text-green-400'
    : log.myResult === 'lose'
      ? 'text-red-400'
      : 'text-gray-400'

  const bgColor = log.myResult === 'win'
    ? 'bg-green-900/20'
    : log.myResult === 'lose'
      ? 'bg-red-900/20'
      : 'bg-gray-700/30'

  const timeAgo = getTimeAgo(log.createdAt)
  const hasSnapshot = !!log.opponentSnapshot

  return (
    <div className={`rounded-lg p-3 ${bgColor} ${hasSnapshot ? 'cursor-pointer' : ''}`}>
      <div
        className="flex items-center justify-between"
        onClick={hasSnapshot ? onToggle : undefined}
      >
        {/* 결과 및 상대 정보 */}
        <div className="flex items-center gap-3">
          <ResultIcon className={`text-2xl ${resultIconColor}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${resultColor}`}>{resultText}</span>
              <span className="text-gray-400 text-sm">vs</span>
              <span className="text-white font-medium">{log.opponentName}</span>
              {hasSnapshot && (
                <span className={`text-gray-500 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              )}
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
            onClick={async (e) => {
              e.stopPropagation()
              await onRevenge()
            }}
            disabled={isRevengeLoading}
            className="px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRevengeLoading ? '로딩...' : '복수전'}
          </button>
        )}
      </div>

      {/* 상대방 상세 정보 (확장 시) */}
      {isExpanded && log.opponentSnapshot && (
        <OpponentDetails snapshot={log.opponentSnapshot} />
      )}
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [revengeLoadingId, setRevengeLoadingId] = useState<string | null>(null)
  const [revengeError, setRevengeError] = useState<string | null>(null)

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

  const handleToggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const handleRevenge = async (logId: string, opponentId: string): Promise<boolean> => {
    setRevengeLoadingId(logId)
    setRevengeError(null)
    try {
      const success = await onRevenge(opponentId)
      if (!success) {
        setRevengeError('복수전을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.')
      }
      return success
    } catch (err) {
      console.error('Revenge failed:', err)
      setRevengeError('복수전 시작 중 오류가 발생했습니다.')
      return false
    } finally {
      setRevengeLoadingId(null)
    }
  }

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

      {/* 에러 메시지 */}
      {revengeError && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm text-center">{revengeError}</p>
        </div>
      )}

      {/* 안내 문구 */}
      <p className="text-gray-500 text-xs text-center">기록을 클릭하면 상대방 정보를 확인할 수 있습니다</p>

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
              onRevenge={() => handleRevenge(log.id, log.opponentId)}
              isExpanded={expandedId === log.id}
              onToggle={() => handleToggle(log.id)}
              isRevengeLoading={revengeLoadingId === log.id}
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
