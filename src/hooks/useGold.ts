import { useState, useEffect, useCallback } from 'react'
import { GOLD_CONFIG } from '../types/game'

const STORAGE_KEY = 'blacksmith_gold'
const LAST_CLAIM_KEY = 'blacksmith_last_claim'

export function useGold() {
  const [gold, setGold] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? parseInt(saved, 10) : GOLD_CONFIG.dailyGold
  })

  const [lastClaimDate, setLastClaimDate] = useState<string | null>(() => {
    return localStorage.getItem(LAST_CLAIM_KEY)
  })

  const [canClaimDaily, setCanClaimDaily] = useState(false)

  // 골드 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, gold.toString())
  }, [gold])

  // 일일 지급 체크
  useEffect(() => {
    const today = new Date().toDateString()
    setCanClaimDaily(lastClaimDate !== today)
  }, [lastClaimDate])

  // 일일 골드 수령
  const claimDailyGold = useCallback(() => {
    const today = new Date().toDateString()
    if (lastClaimDate === today) return false

    setGold(prev => prev + GOLD_CONFIG.dailyGold)
    setLastClaimDate(today)
    localStorage.setItem(LAST_CLAIM_KEY, today)
    return true
  }, [lastClaimDate])

  // 골드 사용
  const spendGold = useCallback((amount: number): boolean => {
    if (gold < amount) return false
    setGold(prev => prev - amount)
    return true
  }, [gold])

  // 골드 추가
  const addGold = useCallback((amount: number) => {
    setGold(prev => prev + amount)
  }, [])

  // 무기 판매로 골드 획득
  const sellWeapon = useCallback((sellPrice: number) => {
    setGold(prev => prev + sellPrice)
  }, [])

  // 대결 보상 획득
  const receiveBattleReward = useCallback((reward: number) => {
    setGold(prev => prev + reward)
  }, [])

  // 골드 충분한지 체크
  const canAfford = useCallback((amount: number): boolean => {
    return gold >= amount
  }, [gold])

  return {
    gold,
    canClaimDaily,
    claimDailyGold,
    spendGold,
    addGold,
    sellWeapon,
    receiveBattleReward,
    canAfford,
  }
}
