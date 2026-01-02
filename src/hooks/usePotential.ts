import { useCallback } from 'react'
import type { UserEquipment } from '../types/equipment'
import type { PotentialLine } from '../types/potential'
import {
  rerollPotentials,
  unlockPotentialSlot,
  togglePotentialLock,
  getSlotUnlockCost,
  calculateRerollCost,
  getLockedLineCount,
  hasRerollableLines,
} from '../types/potential'

interface UsePotentialOptions {
  onUpdatePotentials: (
    equipmentId: string,
    potentials: PotentialLine[]
  ) => Promise<boolean>
}

interface RerollResult {
  newPotentials: PotentialLine[]
  cost: number
}

interface UnlockResult {
  newPotentials: PotentialLine[]
  slotIndex: number
  cost: number
}

export function usePotential({
  onUpdatePotentials,
}: UsePotentialOptions) {
  /**
   * Reroll potentials for an equipment
   * Only rerolls unlocked + non-locked lines, each gets a random tier
   */
  const doReroll = useCallback(async (
    equipment: UserEquipment,
    lockedLines: boolean[]
  ): Promise<RerollResult | null> => {
    try {
      const { potentials } = equipment

      // Apply lock states to current potentials
      const currentWithLocks: PotentialLine[] = potentials.map((p, i) => ({
        ...p,
        isLocked: lockedLines[i] ?? false,
      }))

      // Check if there are rerollable lines
      if (!hasRerollableLines(currentWithLocks)) {
        console.warn('No rerollable lines')
        return null
      }

      // Calculate cost based on locked lines
      const lockedCount = getLockedLineCount(currentWithLocks)
      const cost = calculateRerollCost(lockedCount)

      // Perform reroll
      const newPotentials = rerollPotentials(currentWithLocks)

      // Update potentials in DB
      const success = await onUpdatePotentials(equipment.id, newPotentials)
      if (!success) return null

      return {
        newPotentials,
        cost,
      }
    } catch (error) {
      console.error('Failed to reroll potentials:', error)
      return null
    }
  }, [onUpdatePotentials])

  /**
   * Unlock a potential slot (make it active)
   */
  const unlockSlot = useCallback(async (
    equipment: UserEquipment,
    slotIndex: number
  ): Promise<UnlockResult | null> => {
    try {
      const cost = getSlotUnlockCost(slotIndex)
      if (cost <= 0) return null

      const newPotentials = unlockPotentialSlot(equipment.potentials, slotIndex)

      const success = await onUpdatePotentials(equipment.id, newPotentials)
      if (!success) return null

      return {
        newPotentials,
        slotIndex,
        cost,
      }
    } catch (error) {
      console.error('Failed to unlock slot:', error)
      return null
    }
  }, [onUpdatePotentials])

  /**
   * Toggle lock on a specific potential line (keep during reroll)
   */
  const toggleLock = useCallback(async (
    equipment: UserEquipment,
    lineIndex: number
  ): Promise<boolean> => {
    const newPotentials = togglePotentialLock(equipment.potentials, lineIndex)
    return onUpdatePotentials(equipment.id, newPotentials)
  }, [onUpdatePotentials])

  return {
    doReroll,
    unlockSlot,
    toggleLock,
  }
}
