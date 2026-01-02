import { useState, useCallback } from 'react'
import { getRandomWeapon } from '../data/weapons'
import { getTotalAttack } from '../utils/starforce'
import type { UserWeapon } from '../types/weapon'

export function useWeapon() {
  const [currentWeapon, setCurrentWeapon] = useState<UserWeapon | null>(null)
  const [isAcquiring, setIsAcquiring] = useState(false)

  // 랜덤 무기 획득
  const acquireRandomWeapon = useCallback(async (): Promise<UserWeapon> => {
    setIsAcquiring(true)

    // 획득 연출 딜레이
    await new Promise(resolve => setTimeout(resolve, 1500))

    const weaponType = getRandomWeapon()
    const newWeapon: UserWeapon = {
      id: crypto.randomUUID(),
      weaponTypeId: weaponType.id,
      weaponType,
      starLevel: 0,
      isDestroyed: false,
      consecutiveFails: 0,
      createdAt: new Date(),
      totalAttack: weaponType.baseAttack,
    }

    setCurrentWeapon(newWeapon)
    setIsAcquiring(false)
    return newWeapon
  }, [])

  // 강화 성공 시 레벨 업
  const upgradeWeapon = useCallback((newLevel: number) => {
    setCurrentWeapon(prev => {
      if (!prev) return null
      const totalAttack = getTotalAttack(prev.weaponType.baseAttack, newLevel)
      return {
        ...prev,
        starLevel: newLevel,
        totalAttack,
        consecutiveFails: 0,
      }
    })
  }, [])

  // 강화 실패 시 연속 실패 증가
  const incrementFails = useCallback(() => {
    setCurrentWeapon(prev => {
      if (!prev) return null
      return {
        ...prev,
        consecutiveFails: prev.consecutiveFails + 1,
      }
    })
  }, [])

  // 찬스타임 사용 후 리셋
  const resetConsecutiveFails = useCallback(() => {
    setCurrentWeapon(prev => {
      if (!prev) return null
      return {
        ...prev,
        consecutiveFails: 0,
      }
    })
  }, [])

  // 무기 파괴
  const destroyWeapon = useCallback(() => {
    setCurrentWeapon(prev => {
      if (!prev) return null
      return {
        ...prev,
        isDestroyed: true,
      }
    })
  }, [])

  // 무기 제거 (판매 후)
  const removeWeapon = useCallback(() => {
    setCurrentWeapon(null)
  }, [])

  // 판매 가격 계산 - "무한 동력" 공식 사용
  const calcSellPrice = useCallback((weapon: UserWeapon): number => {
    const basePrice = weapon.weaponType.sellPriceBase
    const levelBonus = 1 + weapon.starLevel * 5 + Math.pow(weapon.starLevel, 2)
    return Math.floor(basePrice * levelBonus)
  }, [])

  return {
    currentWeapon,
    isAcquiring,
    acquireRandomWeapon,
    upgradeWeapon,
    incrementFails,
    resetConsecutiveFails,
    destroyWeapon,
    removeWeapon,
    getSellPrice: calcSellPrice,
  }
}
