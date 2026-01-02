import { useState, useCallback } from 'react'
import type { EquipmentBase } from '../types/equipment'
import type { GachaResult, GachaMultiResult } from '../types/gacha'
import { GACHA_SINGLE_COST, GACHA_MULTI_COST } from '../types/gacha'
import { getRandomEquipment } from '../data/equipment'

interface UseGachaOptions {
  onAcquireEquipment: (equipment: EquipmentBase) => Promise<unknown>
  onUpdateGold: (newGold: number) => Promise<boolean>
}

interface UseGachaState {
  pullCount: number
  isAnimating: boolean
  lastResults: GachaResult[] | null
}

export function useGacha({ onAcquireEquipment, onUpdateGold }: UseGachaOptions) {
  const [state, setState] = useState<UseGachaState>({
    pullCount: 0,
    isAnimating: false,
    lastResults: null,
  })

  /**
   * Perform a single pull (just random equipment)
   */
  const singlePull = useCallback((): GachaResult => {
    const equipment = getRandomEquipment()

    return {
      equipment,
      slot: equipment.slot,
      isNew: false,
    }
  }, [])

  /**
   * Execute single pull
   */
  const pullSingle = useCallback(async (
    currentGold: number
  ): Promise<GachaResult | null> => {
    if (currentGold < GACHA_SINGLE_COST) return null

    setState(prev => ({ ...prev, isAnimating: true }))

    try {
      // Deduct gold
      await onUpdateGold(currentGold - GACHA_SINGLE_COST)

      // Perform pull
      const result = singlePull()

      // Save equipment to user inventory
      await onAcquireEquipment(result.equipment)

      // Update pull count
      setState(prev => ({
        ...prev,
        pullCount: prev.pullCount + 1,
        lastResults: [result],
        isAnimating: false,
      }))

      return result
    } catch (error) {
      console.error('Gacha pull failed:', error)
      setState(prev => ({ ...prev, isAnimating: false }))
      return null
    }
  }, [singlePull, onAcquireEquipment, onUpdateGold])

  /**
   * Execute 10-pull (with discount)
   */
  const pullMulti = useCallback(async (
    currentGold: number
  ): Promise<GachaMultiResult | null> => {
    if (currentGold < GACHA_MULTI_COST) return null

    setState(prev => ({ ...prev, isAnimating: true }))

    try {
      // Deduct gold
      await onUpdateGold(currentGold - GACHA_MULTI_COST)

      const results: GachaResult[] = []

      // Perform 10 pulls
      for (let i = 0; i < 10; i++) {
        const result = singlePull()
        results.push(result)

        // Save equipment to user inventory
        await onAcquireEquipment(result.equipment)
      }

      // Update pull count
      setState(prev => ({
        ...prev,
        pullCount: prev.pullCount + 10,
        lastResults: results,
        isAnimating: false,
      }))

      return {
        results,
        totalCost: GACHA_MULTI_COST,
        newPullCount: state.pullCount + 10,
      }
    } catch (error) {
      console.error('Gacha multi-pull failed:', error)
      setState(prev => ({ ...prev, isAnimating: false }))
      return null
    }
  }, [state.pullCount, singlePull, onAcquireEquipment, onUpdateGold])

  /**
   * Clear last results
   */
  const clearResults = useCallback(() => {
    setState(prev => ({ ...prev, lastResults: null }))
  }, [])

  return {
    ...state,
    pullSingle,
    pullMulti,
    clearResults,
    singleCost: GACHA_SINGLE_COST,
    multiCost: GACHA_MULTI_COST,
  }
}
