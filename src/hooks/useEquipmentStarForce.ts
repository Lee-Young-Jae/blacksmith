import { useState, useCallback, useEffect } from 'react'
import {
  getSuccessRate,
  getMaintainRate,
  getDestroyRate,
  getEnhanceCost,
  isChanceTime,
  isSpecialLevel,
  executeEnhance,
  getDangerLevel,
  MAX_STAR_LEVEL,
} from '../utils/starforce'
import { calculateEquipmentStats } from '../types/equipment'
import { calculateCombatPower } from '../types/stats'
import type { EnhanceResult } from '../types/starforce'
import type { UserEquipment } from '../types/equipment'

interface UseEquipmentStarForceOptions {
  onSuccess?: (equipment: UserEquipment, newLevel: number) => Promise<void>
  onMaintain?: (equipment: UserEquipment, newFails: number) => Promise<void>
  onDestroy?: (equipment: UserEquipment) => Promise<void>
  // Inventory for syncing selected equipment
  inventory?: UserEquipment[]
}

export function useEquipmentStarForce(options: UseEquipmentStarForceOptions = {}) {
  const [selectedEquipment, setSelectedEquipment] = useState<UserEquipment | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [lastResult, setLastResult] = useState<EnhanceResult | null>(null)
  const [isDestroyed, setIsDestroyed] = useState(false)

  // Sync selected equipment with inventory changes
  useEffect(() => {
    if (!selectedEquipment || !options.inventory || isDestroyed) return

    const updated = options.inventory.find(e => e.id === selectedEquipment.id)
    if (updated) {
      // Update if star level or consecutive fails changed
      if (
        updated.starLevel !== selectedEquipment.starLevel ||
        updated.consecutiveFails !== selectedEquipment.consecutiveFails
      ) {
        setSelectedEquipment(updated)
      }
    } else {
      // Equipment was removed (sold/destroyed)
      setSelectedEquipment(null)
      setIsDestroyed(false)
    }
  }, [options.inventory, selectedEquipment?.id, isDestroyed])

  const level = selectedEquipment?.starLevel ?? 0
  const consecutiveFails = selectedEquipment?.consecutiveFails ?? 0
  const chanceTimeActive = isChanceTime(consecutiveFails)

  const selectEquipment = useCallback((equipment: UserEquipment | null) => {
    setSelectedEquipment(equipment)
    setLastResult(null)
    setIsDestroyed(false)
  }, [])

  const isMaxLevel = level >= MAX_STAR_LEVEL

  const enhance = useCallback(async (): Promise<EnhanceResult | null> => {
    if (!selectedEquipment || isEnhancing || isDestroyed || level >= MAX_STAR_LEVEL) return null

    setIsEnhancing(true)
    setLastResult(null)

    // Enhancement animation delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    const result = executeEnhance(level, chanceTimeActive)
    setLastResult(result)

    switch (result) {
      case 'success':
        await options.onSuccess?.(selectedEquipment, level + 1)
        // Update local state
        setSelectedEquipment(prev => prev ? {
          ...prev,
          starLevel: prev.starLevel + 1,
          consecutiveFails: 0,
        } : null)
        break
      case 'maintain':
        const newFails = consecutiveFails + 1
        await options.onMaintain?.(selectedEquipment, newFails)
        setSelectedEquipment(prev => prev ? {
          ...prev,
          consecutiveFails: newFails,
        } : null)
        break
      case 'destroy':
        await options.onDestroy?.(selectedEquipment)
        setIsDestroyed(true)
        break
    }

    setIsEnhancing(false)
    return result
  }, [selectedEquipment, level, isEnhancing, isDestroyed, chanceTimeActive, consecutiveFails, options])

  const clearResult = useCallback(() => {
    setLastResult(null)
  }, [])

  const resetAfterDestroy = useCallback(() => {
    setSelectedEquipment(null)
    setIsDestroyed(false)
    setLastResult(null)
  }, [])

  // Calculate rates
  const successRate = chanceTimeActive ? 100 : getSuccessRate(level)
  const maintainRate = chanceTimeActive ? 0 : getMaintainRate(level)
  const destroyRate = chanceTimeActive ? 0 : getDestroyRate(level)

  // Cost calculation
  const enhanceCost = selectedEquipment ? getEnhanceCost(level) : 0

  // Combat power calculation
  const currentStats = selectedEquipment ? calculateEquipmentStats(selectedEquipment) : null
  const currentCombatPower = currentStats ? calculateCombatPower(currentStats) : 0

  // Calculate next level combat power
  const nextStats = selectedEquipment ? calculateEquipmentStats({
    ...selectedEquipment,
    starLevel: selectedEquipment.starLevel + 1,
  }) : null
  const nextCombatPower = nextStats ? calculateCombatPower(nextStats) : 0

  const combatPowerGain = nextCombatPower - currentCombatPower

  return {
    // State
    selectedEquipment,
    isEnhancing,
    lastResult,
    isDestroyed,

    // Chance time
    consecutiveFails,
    chanceTimeActive,

    // Calculated values
    currentLevel: level,
    successRate,
    maintainRate,
    destroyRate,
    enhanceCost,
    currentCombatPower,
    nextCombatPower,
    combatPowerGain,

    // Level info
    isMaxLevel,
    isNextSpecialLevel: isSpecialLevel(level + 1),
    dangerLevel: getDangerLevel(level),
    canDestroy: destroyRate > 0,

    // Actions
    selectEquipment,
    enhance,
    clearResult,
    resetAfterDestroy,
  }
}
