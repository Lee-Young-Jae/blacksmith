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

  const { potentials } = equipment
  const unlockedCount = getUnlockedSlotCount(potentials)
  const lockedCount = lockedLines.filter((locked, i) => locked && potentials[i].isUnlocked).length
  const rerollCost = calculateRerollCost(lockedCount)
  const canAffordReroll = gold >= rerollCost
  const canReroll = hasRerollableLines(potentials.map((p, i) => ({
    ...p,
    isLocked: lockedLines[i] ?? false,
  })))

  const toggleLock = (index: number) => {
    if (!potentials[index].isUnlocked) return
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
        {potentials.map((line, index) => {
          const tierColor = POTENTIAL_TIER_COLORS[line.tier]
          const tierBg = POTENTIAL_TIER_BG[line.tier]
          const unlockCost = SLOT_UNLOCK_COSTS[index]
          const canAffordUnlock = gold >= unlockCost

          if (!line.isUnlocked) {
            // Locked slot - show unlock button
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border bg-[var(--color-bg-elevated-1)] border-[var(--color-border)] min-h-[56px]"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--color-bg-elevated-2)] text-[var(--color-text-muted)]">
                  🔒
                </div>
                <div className="flex-1">
                  <span className="text-[var(--color-text-muted)]">슬롯 {index + 1} 잠김</span>
                </div>
                <button
                  onClick={() => handleUnlockSlot(index)}
                  disabled={!canAffordUnlock || isUnlocking !== null}
                  className={`btn btn-sm ${canAffordUnlock && isUnlocking === null ? 'btn-success' : 'btn-ghost opacity-50'}`}
                >
                  {isUnlocking === index ? (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      해제 중
                    </span>
                  ) : (
                    <>해제 ({unlockCost.toLocaleString()}G)</>
                  )}
                </button>
              </div>
            )
          }

          // Unlocked slot - show potential line
          return (
            <div
              key={index}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-all min-h-[56px]
                ${lockedLines[index]
                  ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/50'
                  : `${tierBg} border-[var(--color-border)]`
                }
              `}
            >
              {/* Lock Toggle */}
              <button
                onClick={() => toggleLock(index)}
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center transition-all
                  ${lockedLines[index]
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-elevated-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated-3)]'
                  }
                `}
                title={lockedLines[index] ? '고정 해제' : '고정 (리롤 시 유지)'}
              >
                {lockedLines[index] ? '📌' : '🔓'}
              </button>

              {/* Line Content */}
              <div className="flex-1 flex items-center gap-2">
                <span className={tierColor.split(' ')[0]}>
                  {formatPotentialLine(line)}
                </span>
              </div>

              {/* Tier Badge */}
              <div className={`text-xs px-2 py-1 rounded-lg ${tierColor}`}>
                {POTENTIAL_TIER_NAMES[line.tier]}
              </div>
            </div>
          )
        })}

        {potentials.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-text">잠재옵션이 없습니다</span>
          </div>
        )}
      </div>

      {/* Reroll Section */}
      <div className="px-4 pb-4 space-y-3 safe-area-bottom">
        {/* Lock Cost Warning */}
        {lockedCount > 0 && (
          <div className="info-box warning">
            <div className="flex items-center gap-2 text-[var(--color-accent)] text-sm">
              <span>⚠️</span>
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
          className={`btn w-full py-3.5 text-base ${canAffordReroll && canReroll && !isRerolling ? 'btn-magic' : 'btn-ghost opacity-50'}`}
        >
          {isRerolling ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              리롤 중...
            </span>
          ) : !canReroll ? (
            '리롤할 라인이 없습니다'
          ) : (
            '✨ 잠재옵션 리롤'
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
