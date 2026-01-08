import { useState } from 'react'
import type { UserEquipment } from '../../types/equipment'
import type { PotentialLine, PotentialTier } from '../../types/potential'
import {
  POTENTIAL_TIER_NAMES,
  POTENTIAL_TIER_COLORS,
  POTENTIAL_TIER_BG,
  SLOT_UNLOCK_COSTS,
  calculateRerollCost,
  formatPotentialLine,
  getUnlockedSlotCount,
  hasRerollableLines,
} from '../../types/potential'
import { getEquipmentDisplayName } from '../../types/equipment'
import { EquipmentImage } from '../equipment'
import { FaLock, FaUnlock, FaThumbtack, FaExclamationTriangle } from 'react-icons/fa'
import { GiSparkles } from 'react-icons/gi'

interface PotentialPanelProps {
  equipment: UserEquipment
  gold: number
  onReroll: (equipmentId: string, lockedLines: boolean[]) => Promise<{
    newPotentials: PotentialLine[]
    cost: number
  } | null>
  onUnlockSlot: (equipmentId: string, slotIndex: number) => Promise<{
    newPotentials: PotentialLine[]
    cost: number
  } | null>
  onUpdateGold: (newGold: number) => Promise<boolean>
  onClose?: () => void
}

export default function PotentialPanel({
  equipment,
  gold,
  onReroll,
  onUnlockSlot,
  onUpdateGold,
  onClose,
}: PotentialPanelProps) {
  const [lockedLines, setLockedLines] = useState<boolean[]>(
    equipment.potentials.map(p => p.isLocked)
  )
  const [isRerolling, setIsRerolling] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState<number | null>(null)

  const slotCount = equipment.equipmentBase.potentialSlots || 3
  const { potentials } = equipment

  // 잠재옵션이 없거나 부족하면 빈 슬롯으로 채움
  const displayPotentials: (PotentialLine | null)[] = Array.from({ length: slotCount }, (_, i) =>
    potentials[i] || null
  )

  const unlockedCount = getUnlockedSlotCount(potentials)
  const lockedCount = lockedLines.filter((locked, i) => locked && potentials[i]?.isUnlocked).length
  const rerollCost = calculateRerollCost(lockedCount)
  const canAffordReroll = gold >= rerollCost
  const canReroll = potentials.length > 0 && hasRerollableLines(potentials.map((p, i) => ({
    ...p,
    isLocked: lockedLines[i] ?? false,
  })))

  const toggleLock = (index: number) => {
    const line = potentials[index]
    if (!line || !line.isUnlocked) return
    setLockedLines(prev => {
      const newLocked = [...prev]
      newLocked[index] = !newLocked[index]
      return newLocked
    })
  }

  const handleUnlockSlot = async (index: number) => {
    const cost = SLOT_UNLOCK_COSTS[index]
    if (gold < cost || isUnlocking !== null) return

    setIsUnlocking(index)
    try {
      await onUpdateGold(gold - cost)
      await onUnlockSlot(equipment.id, index)
    } finally {
      setIsUnlocking(null)
    }
  }

  const handleReroll = async () => {
    if (!canAffordReroll || !canReroll || isRerolling) return

    setIsRerolling(true)
    try {
      await onUpdateGold(gold - rerollCost)
      const result = await onReroll(equipment.id, lockedLines)
      if (result) {
        setLockedLines(result.newPotentials.map(p => p.isLocked))
      }
    } finally {
      setIsRerolling(false)
    }
  }

  // Get best tier among unlocked potentials for header styling
  const getBestTier = (): PotentialTier => {
    const tierOrder: PotentialTier[] = ['legendary', 'unique', 'epic', 'rare', 'common']
    for (const tier of tierOrder) {
      if (potentials.some(p => p.isUnlocked && p.tier === tier)) {
        return tier
      }
    }
    return 'common'
  }
  const bestTier = getBestTier()
  const headerBg = unlockedCount > 0 ? POTENTIAL_TIER_BG[bestTier] : 'bg-gray-800'

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className={`${headerBg} p-4 border-b border-[var(--color-border)]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EquipmentImage equipment={equipment} size="xl" />
            <div>
              <h2 className="font-bold text-[var(--color-text-primary)]">
                {getEquipmentDisplayName(equipment)}
              </h2>
              <div className="text-sm text-[var(--color-text-secondary)]">
                잠재옵션 {unlockedCount}/3 해제
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-2xl rounded-full hover:bg-[var(--color-bg-elevated-2)]"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Potential Lines */}
      <div className="p-4 space-y-3">
        {displayPotentials.map((line, index) => {
          const unlockCost = SLOT_UNLOCK_COSTS[index]
          const canAffordUnlock = gold >= unlockCost

          // 잠재옵션이 없거나 해제되지 않은 슬롯 - 해제 버튼 표시
          if (!line || !line.isUnlocked) {
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl border-2 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 min-h-[64px] transition-all hover:border-gray-600/50 hover:shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-700/50 to-gray-800/50 text-gray-400 border border-gray-600/30">
                  <FaLock className="text-lg" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-300">슬롯 {index + 1}</div>
                  <div className="text-xs text-gray-500">잠금 상태</div>
                </div>
                <button
                  onClick={() => handleUnlockSlot(index)}
                  disabled={!canAffordUnlock || isUnlocking !== null}
                  className={`
                    px-4 py-2.5 rounded-lg font-semibold text-sm transition-all transform
                    ${canAffordUnlock && isUnlocking === null
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white shadow-lg hover:shadow-xl hover:scale-105'
                      : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {isUnlocking === index ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      해제 중
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FaUnlock className="text-xs" />
                      해제 ({unlockCost.toLocaleString()}G)
                    </span>
                  )}
                </button>
              </div>
            )
          }

          const tierColor = POTENTIAL_TIER_COLORS[line.tier]
          const tierBg = POTENTIAL_TIER_BG[line.tier]

          // Unlocked slot - show potential line
          return (
            <div
              key={index}
              className={`
                flex items-center gap-3 p-4 rounded-xl border-2 transition-all min-h-[64px]
                ${lockedLines[index]
                  ? 'bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                  : `${tierBg} border-[var(--color-border)] hover:shadow-lg`
                }
                hover:scale-[1.02] cursor-pointer
              `}
            >
              {/* Lock Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLock(index)
                }}
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center transition-all transform
                  ${lockedLines[index]
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-110'
                    : 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 text-gray-400 hover:from-gray-600/50 hover:to-gray-700/50 hover:text-gray-300 border border-gray-600/30'
                  }
                `}
                title={lockedLines[index] ? '고정 해제' : '고정 (리롤 시 유지)'}
              >
                {lockedLines[index] ? (
                  <FaThumbtack className="text-lg" />
                ) : (
                  <FaUnlock className="text-lg" />
                )}
              </button>

              {/* Line Content */}
              <div className="flex-1 flex flex-col gap-1">
                <span className={`font-semibold text-base ${tierColor.split(' ')[0]}`}>
                  {formatPotentialLine(line)}
                </span>
                <div className={`text-xs px-2 py-0.5 rounded-md inline-block w-fit ${tierColor}`}>
                  {POTENTIAL_TIER_NAMES[line.tier]}
                </div>
              </div>

              {/* Lock Indicator */}
              {lockedLines[index] && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400">
                  <FaThumbtack className="text-sm" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Reroll Section */}
      <div className="px-4 pb-4 space-y-3 safe-area-bottom">
        {/* Lock Cost Warning */}
        {lockedCount > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
              <FaExclamationTriangle className="text-base flex-shrink-0" />
              <span>{lockedCount}줄 고정 - 비용 증가</span>
            </div>
          </div>
        )}

        {/* Cost Display */}
        <div className="stat-row">
          <span className="stat-label">리롤 비용</span>
          <span className={`stat-value ${canAffordReroll ? 'gold' : 'negative'}`}>
            {rerollCost.toLocaleString()} G
          </span>
        </div>

        {/* Info about reroll */}
        {unlockedCount > 0 && (
          <div className="text-xs text-[var(--color-text-muted)] text-center">
            리롤 시 고정되지 않은 라인은 새로운 등급과 옵션을 받습니다
          </div>
        )}

        {/* Reroll Button */}
        <button
          onClick={handleReroll}
          disabled={!canAffordReroll || !canReroll || isRerolling}
          className={`
            w-full py-3 rounded-lg font-semibold text-base transition-all
            ${canAffordReroll && canReroll && !isRerolling
              ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isRerolling ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              리롤 중...
            </span>
          ) : !canReroll ? (
            '리롤할 라인이 없습니다'
          ) : (
            <span className="flex items-center justify-center gap-2">
              <GiSparkles className="text-base" />
              잠재옵션 리롤
            </span>
          )}
        </button>

        {!canAffordReroll && canReroll && (
          <div className="text-center text-sm text-[var(--color-danger)]">
            골드가 부족합니다
          </div>
        )}

        {unlockedCount === 0 && (
          <div className="text-center text-sm text-[var(--color-text-muted)]">
            먼저 슬롯을 해제하세요
          </div>
        )}
      </div>
    </div>
  )
}
