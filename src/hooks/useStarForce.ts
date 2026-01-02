import { useState, useCallback } from 'react'
import {
  getSuccessRate,
  getMaintainRate,
  getDestroyRate,
  getEnhanceCost,
  getAttackBonus,
  isChanceTime,
  isSpecialLevel,
  executeEnhance,
  getDangerLevel,
} from '../utils/starforce'
import type { EnhanceResult } from '../types/starforce'
import type { UserWeapon } from '../types/weapon'

interface UseStarForceOptions {
  onSuccess?: (newLevel: number) => void
  onMaintain?: (level: number, consecutiveFails: number) => void
  onDestroy?: () => void
  onChanceTimeActivated?: () => void
}

export function useStarForce(
  weapon: UserWeapon | null,
  options: UseStarForceOptions = {}
) {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [lastResult, setLastResult] = useState<EnhanceResult | null>(null)

  const level = weapon?.starLevel ?? 0
  const consecutiveFails = weapon?.consecutiveFails ?? 0
  const chanceTimeActive = isChanceTime(consecutiveFails)

  const enhance = useCallback(async (): Promise<EnhanceResult | null> => {
    if (!weapon || isEnhancing || weapon.isDestroyed) return null

    setIsEnhancing(true)
    setLastResult(null)

    // 강화 애니메이션 딜레이
    await new Promise(resolve => setTimeout(resolve, 2000))

    const result = executeEnhance(level, chanceTimeActive)
    setLastResult(result)

    switch (result) {
      case 'success':
        options.onSuccess?.(level + 1)
        break
      case 'maintain':
        const newFails = consecutiveFails + 1
        options.onMaintain?.(level, newFails)
        if (newFails === 2) {
          options.onChanceTimeActivated?.()
        }
        break
      case 'destroy':
        options.onDestroy?.()
        break
    }

    setIsEnhancing(false)
    return result
  }, [weapon, level, isEnhancing, chanceTimeActive, consecutiveFails, options])

  const clearResult = useCallback(() => {
    setLastResult(null)
  }, [])

  // 현재 레벨 기준 확률들
  const successRate = chanceTimeActive ? 100 : getSuccessRate(level)
  const maintainRate = chanceTimeActive ? 0 : getMaintainRate(level)
  const destroyRate = chanceTimeActive ? 0 : getDestroyRate(level)

  // 비용 계산
  const enhanceCost = weapon
    ? getEnhanceCost(level)
    : 0

  // 다음 레벨 공격력 보너스
  const currentAttackBonus = weapon
    ? getAttackBonus(level, weapon.weaponType.baseAttack)
    : 0
  const nextAttackBonus = weapon
    ? getAttackBonus(level + 1, weapon.weaponType.baseAttack)
    : 0

  return {
    // 상태
    isEnhancing,
    lastResult,

    // 찬스타임
    consecutiveFails,
    chanceTimeActive,

    // 계산된 값
    currentLevel: level,
    successRate,
    maintainRate,
    destroyRate,
    enhanceCost,
    currentAttackBonus,
    nextAttackBonus,

    // 다음 레벨 정보
    isNextSpecialLevel: isSpecialLevel(level + 1),
    dangerLevel: getDangerLevel(level),
    canDestroy: destroyRate > 0,

    // 액션
    enhance,
    clearResult,
  }
}
