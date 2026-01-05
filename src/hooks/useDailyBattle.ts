import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MAX_DAILY_BATTLES = 10

// 한국 시간 (KST) 기준 오늘 날짜 가져오기
function getKoreanDateString(): string {
  const now = new Date()
  // UTC + 9시간 = KST
  const kstOffset = 9 * 60 * 60 * 1000
  const kstDate = new Date(now.getTime() + kstOffset)
  return kstDate.toISOString().split('T')[0]
}

interface DailyBattleRow {
  id: string
  battle_count: number
  wins: number
  losses: number
  gold_earned: number
}

interface DailyBattleState {
  battleCount: number
  wins: number
  losses: number
  goldEarned: number
}

export function useDailyBattle() {
  const { user } = useAuth()
  const [state, setState] = useState<DailyBattleState>({
    battleCount: 0,
    wins: 0,
    losses: 0,
    goldEarned: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  // 오늘의 대결 기록 로드
  useEffect(() => {
    if (!user) {
      setState({ battleCount: 0, wins: 0, losses: 0, goldEarned: 0 })
      setIsLoading(false)
      return
    }

    const loadTodayBattles = async () => {
      setIsLoading(true)
      try {
        const today = getKoreanDateString()

        const { data, error } = await supabase
          .from('daily_battles')
          .select('battle_count, wins, losses, gold_earned')
          .eq('user_id', user.id)
          .eq('battle_date', today)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to load daily battles:', error)
        }

        if (data) {
          const typedData = data as DailyBattleRow
          setState({
            battleCount: typedData.battle_count,
            wins: typedData.wins,
            losses: typedData.losses,
            goldEarned: typedData.gold_earned,
          })
        } else {
          setState({ battleCount: 0, wins: 0, losses: 0, goldEarned: 0 })
        }
      } catch (err) {
        console.error('Failed to load daily battles:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTodayBattles()
  }, [user])

  // 대결 기록 추가
  const recordBattle = useCallback(async (isWin: boolean, goldEarned: number): Promise<boolean> => {
    if (!user) return false
    if (state.battleCount >= MAX_DAILY_BATTLES) return false

    try {
      const today = getKoreanDateString()

      const { data: existing } = await supabase
        .from('daily_battles')
        .select('id, battle_count, wins, losses, gold_earned')
        .eq('user_id', user.id)
        .eq('battle_date', today)
        .single()

      let newCount: number

      if (existing) {
        const typedExisting = existing as DailyBattleRow
        newCount = typedExisting.battle_count + 1

        await supabase
          .from('daily_battles')
          .update({
            battle_count: newCount,
            wins: typedExisting.wins + (isWin ? 1 : 0),
            losses: typedExisting.losses + (isWin ? 0 : 1),
            gold_earned: typedExisting.gold_earned + goldEarned,
          })
          .eq('id', typedExisting.id)
      } else {
        newCount = 1
        await supabase
          .from('daily_battles')
          .insert({
            user_id: user.id,
            battle_date: today,
            battle_count: 1,
            wins: isWin ? 1 : 0,
            losses: isWin ? 0 : 1,
            gold_earned: goldEarned,
          })
      }

      setState(prev => ({
        battleCount: newCount,
        wins: prev.wins + (isWin ? 1 : 0),
        losses: prev.losses + (isWin ? 0 : 1),
        goldEarned: prev.goldEarned + goldEarned,
      }))

      return true
    } catch (err) {
      console.error('Failed to record battle:', err)
      return false
    }
  }, [user, state.battleCount])

  const battlesRemaining = MAX_DAILY_BATTLES - state.battleCount
  const canBattle = battlesRemaining > 0

  return {
    ...state,
    battlesRemaining,
    canBattle,
    maxBattles: MAX_DAILY_BATTLES,
    recordBattle,
    isLoading,
  }
}
