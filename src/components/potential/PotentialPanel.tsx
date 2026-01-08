import { useState } from 'react'
import type { UserEquipment } from '../../types/equipment'
import type { PotentialLine, PotentialTier } from '../../types/potential'
import {
  POTENTIAL_TIER_NAMES,
  POTENTIAL_TIER_COLORS,
  SLOT_UNLOCK_COSTS,
  calculateRerollCost,
  formatPotentialLine,
  getUnlockedSlotCount,
  hasRerollableLines,
} from '../../types/potential'
import { getEquipmentDisplayName } from '../../types/equipment'
import { EquipmentImage } from '../equipment'
import { FaLock, FaExclamationTriangle, FaFire } from 'react-icons/fa'
import { GiAnvil, GiFireBowl, GiMagicSwirl, GiRuneStone, GiClosedDoors } from 'react-icons/gi'

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
  const [showHighTierWarning, setShowHighTierWarning] = useState(false)

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

  // 리롤 대상 중 유니크 이상 등급이 있는지 확인
  const hasHighTierRerollable = potentials.some((p, i) =>
    p.isUnlocked && !lockedLines[i] && (p.tier === 'unique' || p.tier === 'legendary')
  )

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

  const executeReroll = async () => {
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

  const handleReroll = async () => {
    if (!canAffordReroll || !canReroll || isRerolling) return

    // 유니크 이상 등급이 리롤 대상에 있으면 경고 표시
    if (hasHighTierRerollable) {
      setShowHighTierWarning(true)
      return
    }

    await executeReroll()
  }

  const handleConfirmHighTierReroll = async () => {
    setShowHighTierWarning(false)
    await executeReroll()
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
      {/* Header - Forge Theme */}
      <div className="relative overflow-hidden p-4 border-b border-amber-700/30">
        {/* Background fire glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-orange-600/10 blur-[60px] rounded-full" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <EquipmentImage equipment={equipment} size="xl" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-900 border border-amber-600 flex items-center justify-center">
                <GiRuneStone className="text-amber-400 text-xs" />
              </div>
            </div>
            <div>
              <h2 className="font-bold text-amber-100">
                {getEquipmentDisplayName(equipment)}
              </h2>
              <div className="flex items-center gap-1.5 text-sm text-amber-200/60">
                <GiMagicSwirl className="text-amber-400" />
                <span>각인 {unlockedCount}/3 완료</span>
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-amber-200/50 hover:text-amber-100 text-2xl rounded-full hover:bg-amber-900/30 transition-colors"
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

          // 잠재옵션이 없거나 해제되지 않은 슬롯 - 각인 버튼 표시
          if (!line || !line.isUnlocked) {
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl border border-stone-700/50 bg-gradient-to-br from-stone-800/80 to-stone-900/80 min-h-[64px] transition-all hover:border-amber-700/30"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-stone-700/50 to-stone-800/50 text-stone-500 border border-stone-600/30">
                  <GiClosedDoors className="text-xl" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-stone-400">각인 슬롯 {index + 1}</div>
                  <div className="text-xs text-stone-600">봉인됨</div>
                </div>
                <button
                  onClick={() => handleUnlockSlot(index)}
                  disabled={!canAffordUnlock || isUnlocking !== null}
                  className={`
                    px-4 py-2.5 rounded-lg font-semibold text-sm transition-all
                    ${canAffordUnlock && isUnlocking === null
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/30 hover:shadow-amber-700/40'
                      : 'bg-stone-800/50 text-stone-600 cursor-not-allowed'
                    }
                  `}
                >
                  {isUnlocking === index ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      각인 중
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <GiRuneStone className="text-sm" />
                      각인 ({unlockCost.toLocaleString()}G)
                    </span>
                  )}
                </button>
              </div>
            )
          }

          const tierColor = POTENTIAL_TIER_COLORS[line.tier]

          // 등급별 대장간 테마 배경색
          const forgeTierBg: Record<PotentialTier, string> = {
            common: 'from-stone-800/80 to-stone-900/80 border-stone-600/50',
            rare: 'from-blue-900/40 to-stone-900/80 border-blue-500/40',
            epic: 'from-purple-900/40 to-stone-900/80 border-purple-500/40',
            unique: 'from-amber-900/40 to-stone-900/80 border-amber-500/50',
            legendary: 'from-orange-900/50 to-red-900/40 border-orange-500/50',
          }

          // Unlocked slot - show potential line
          return (
            <div
              key={index}
              className={`
                flex items-center gap-3 p-4 rounded-xl border transition-all min-h-[64px]
                ${lockedLines[index]
                  ? 'bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/50 shadow-lg shadow-red-500/10'
                  : `bg-gradient-to-br ${forgeTierBg[line.tier]}`
                }
                hover:brightness-110 cursor-pointer
              `}
            >
              {/* Lock Toggle - 봉인 토글 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLock(index)
                }}
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center transition-all
                  ${lockedLines[index]
                    ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                    : 'bg-gradient-to-br from-stone-700/50 to-stone-800/50 text-stone-400 hover:from-stone-600/50 hover:to-stone-700/50 hover:text-amber-300 border border-stone-600/30'
                  }
                `}
                title={lockedLines[index] ? '봉인 해제' : '봉인 (재련 시 유지)'}
              >
                {lockedLines[index] ? (
                  <FaLock className="text-lg" />
                ) : (
                  <GiMagicSwirl className="text-xl" />
                )}
              </button>

              {/* Line Content */}
              <div className="flex-1 flex flex-col gap-1">
                <span className={`font-semibold text-base ${tierColor.split(' ')[0]}`}>
                  {formatPotentialLine(line)}
                </span>
                <div className={`text-xs px-2 py-0.5 rounded-md inline-block w-fit border ${tierColor}`}>
                  {POTENTIAL_TIER_NAMES[line.tier]}
                </div>
              </div>

              {/* Lock Indicator */}
              {lockedLines[index] && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-400">
                  <FaLock className="text-sm" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Reroll Section - 재련 섹션 */}
      <div className="relative px-4 pb-4 space-y-3 safe-area-bottom">
        {/* Fire glow effect at bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-[80px] bg-orange-600/10 blur-[50px] rounded-full pointer-events-none" />

        {/* Lock Cost Warning - 봉인 비용 경고 */}
        {lockedCount > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <FaLock className="text-base flex-shrink-0" />
              <span>{lockedCount}개 봉인 - 재련 비용 증가</span>
            </div>
          </div>
        )}

        {/* Cost Display */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-800/50 border border-stone-700/50">
          <span className="text-sm text-amber-200/60">재련 비용</span>
          <span className={`font-bold ${canAffordReroll ? 'text-amber-400' : 'text-red-400'}`}>
            {rerollCost.toLocaleString()} G
          </span>
        </div>

        {/* Info about reroll */}
        {unlockedCount > 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-200/50 px-1">
            <GiFireBowl className="text-orange-500 mt-0.5 flex-shrink-0" />
            <span>재련 시 봉인되지 않은 각인은 새로운 마법으로 변경됩니다</span>
          </div>
        )}

        {/* Reroll Button - 재련 버튼 */}
        <button
          onClick={handleReroll}
          disabled={!canAffordReroll || !canReroll || isRerolling}
          className={`
            relative w-full py-3.5 rounded-xl font-bold text-base transition-all overflow-hidden
            ${canAffordReroll && canReroll && !isRerolling
              ? 'bg-gradient-to-b from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-amber-900/40 border-2 border-amber-500/50 hover:border-amber-400'
              : 'bg-stone-800/50 text-stone-600 cursor-not-allowed border border-stone-700/50'
            }
          `}
        >
          {/* Button fire glow */}
          {canAffordReroll && canReroll && !isRerolling && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-8 bg-orange-500/30 blur-xl rounded-full" />
          )}

          <span className="relative z-10">
            {isRerolling ? (
              <span className="flex items-center justify-center gap-2">
                <GiFireBowl className="text-lg animate-pulse" />
                재련 중...
              </span>
            ) : !canReroll ? (
              '재련할 각인이 없습니다'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <GiAnvil className="text-lg" />
                마법 재련
                <FaFire className="text-sm text-orange-300" />
              </span>
            )}
          </span>
        </button>

        {!canAffordReroll && canReroll && (
          <div className="text-center text-sm text-red-400">
            골드가 부족합니다
          </div>
        )}

        {unlockedCount === 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
            <GiRuneStone className="text-amber-600" />
            <span>먼저 각인 슬롯을 열어주세요</span>
          </div>
        )}
      </div>

      {/* High Tier Warning Modal - 고등급 재련 경고 */}
      {showHighTierWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 max-w-sm w-full bg-gradient-to-b from-stone-800 to-stone-900 border border-amber-700/50 rounded-2xl shadow-2xl shadow-orange-900/20 overflow-hidden">
            {/* Header with fire glow */}
            <div className="relative p-4 border-b border-amber-700/30">
              <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 to-transparent" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-orange-500/20 blur-[30px] rounded-full" />
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
                  <FaExclamationTriangle className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-amber-100">고등급 각인 경고</h3>
                  <p className="text-xs text-amber-200/50">신중하게 결정하세요</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-amber-100/80 text-sm leading-relaxed">
                재련 대상에 <span className="text-amber-400 font-bold">유니크</span> 또는{' '}
                <span className="text-orange-400 font-bold">레전드리</span> 등급 각인이 포함되어 있습니다.
              </p>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-stone-900/50 border border-stone-700/50">
                <GiFireBowl className="text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-stone-400 text-xs">
                  재련 시 해당 각인이 낮은 등급으로 변경될 수 있습니다. 유지하려면 봉인 후 재련하세요.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="p-4 border-t border-stone-700/50 flex gap-3">
              <button
                onClick={() => setShowHighTierWarning(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors border border-stone-600/50"
              >
                취소
              </button>
              <button
                onClick={handleConfirmHighTierReroll}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white transition-colors shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2"
              >
                <GiAnvil />
                재련 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
