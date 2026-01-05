/**
 * PvP Ranking Hook
 *
 * PvP 랭킹 및 리더보드 관리를 담당합니다.
 * - 내 랭킹 정보 조회
 * - 리더보드 조회
 * - 티어 정보
 * - 주간 보상 수령
 * - 시즌 정보
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
  PvPRanking,
  PvPRankingRow,
  LeaderboardEntry,
  LeagueTier,
  TierInfo,
  PvPSeason,
  WeeklyReward,
} from '../types/league'
import {
  getTierInfo,
  getTierFromRating,
  getPointsToNextTier,
  getTierProgress,
  getWinRate,
  canClaimWeeklyReward,
  getWeekStart,
  ELO_CONFIG,
  LEAGUE_TIERS,
} from '../types/league'

// =============================================
// 타입 정의
// =============================================

interface UsePvPRankingReturn {
  // 상태
  myRanking: PvPRanking | null
  leaderboard: LeaderboardEntry[]
  currentSeason: PvPSeason | null
  totalTickets: number
  isLoading: boolean
  error: string | null

  // 내 정보
  loadMyRanking: () => Promise<void>
  getMyTierInfo: () => TierInfo | null
  getMyProgress: () => number
  getPointsToNext: () => number | null
  getMyWinRate: () => number

  // 리더보드
  loadLeaderboard: (limit?: number) => Promise<void>
  loadLeaderboardByTier: (tier: LeagueTier, limit?: number) => Promise<void>
  getMyRank: () => Promise<number | null>

  // 주간 보상
  canClaimWeekly: () => boolean
  claimWeeklyReward: () => Promise<WeeklyReward | null>
  loadTotalTickets: () => Promise<void>

  // 시즌
  loadCurrentSeason: () => Promise<void>
  getDaysUntilSeasonEnd: () => number | null

  // 유틸
  refreshAll: () => Promise<void>
}

// =============================================
// Hook 구현
// =============================================

export function usePvPRanking(): UsePvPRankingReturn {
  const { user } = useAuth()

  const [myRanking, setMyRanking] = useState<PvPRanking | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentSeason, setCurrentSeason] = useState<PvPSeason | null>(null)
  const [totalTickets, setTotalTickets] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // =============================================
  // 내 랭킹 조회
  // =============================================

  const loadMyRanking = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('pvp_rankings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // 랭킹이 없으면 기본값 설정
          setMyRanking({
            userId: user.id,
            rating: ELO_CONFIG.INITIAL_RATING,
            tier: 'silver',
            wins: 0,
            losses: 0,
            draws: 0,
            winStreak: 0,
            highestRating: ELO_CONFIG.INITIAL_RATING,
            combatPower: 0,
            weeklyBattles: 0,
            lastWeeklyClaim: null,
            updatedAt: new Date(),
          })
          return
        }
        throw fetchError
      }

      const row = data as PvPRankingRow

      setMyRanking({
        userId: row.user_id,
        rating: row.rating,
        tier: row.tier as LeagueTier,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        winStreak: row.win_streak,
        highestRating: row.highest_rating,
        combatPower: row.combat_power,
        weeklyBattles: row.weekly_battles,
        lastWeeklyClaim: row.last_weekly_claim ? new Date(row.last_weekly_claim) : null,
        updatedAt: new Date(row.updated_at),
      })
    } catch (err) {
      console.error('Failed to load ranking:', err)
      setError('랭킹 정보를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // =============================================
  // 티어 정보
  // =============================================

  const getMyTierInfo = useCallback((): TierInfo | null => {
    if (!myRanking) return null
    return getTierInfo(myRanking.tier)
  }, [myRanking])

  const getMyProgress = useCallback((): number => {
    if (!myRanking) return 0
    return getTierProgress(myRanking.rating)
  }, [myRanking])

  const getPointsToNext = useCallback((): number | null => {
    if (!myRanking) return null
    return getPointsToNextTier(myRanking.rating)
  }, [myRanking])

  const getMyWinRate = useCallback((): number => {
    if (!myRanking) return 0
    return getWinRate(myRanking)
  }, [myRanking])

  // =============================================
  // 리더보드 조회
  // =============================================

  const loadLeaderboard = useCallback(async (limit: number = 100) => {
    setIsLoading(true)

    try {
      // RPC 함수 사용 (RLS 우회)
      const { data, error: fetchError } = await supabase
        .rpc('get_pvp_leaderboard', { p_limit: limit })

      if (fetchError) throw fetchError

      const entries: LeaderboardEntry[] = (data || []).map((row: {
        user_id: string
        username: string
        rating: number
        tier: string
        wins: number
        losses: number
        win_streak: number
        combat_power: number
      }, index: number) => {
        // 유효한 티어인지 확인하고, 아니면 레이팅에서 계산
        const validTier = row.tier && LEAGUE_TIERS.includes(row.tier as LeagueTier)
          ? row.tier as LeagueTier
          : getTierFromRating(row.rating || 0)

        return {
          rank: index + 1,
          userId: row.user_id,
          username: row.username || '플레이어',
          rating: row.rating,
          tier: validTier,
          wins: row.wins,
          losses: row.losses,
          winStreak: row.win_streak,
          combatPower: row.combat_power,
        }
      })

      setLeaderboard(entries)
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
      setError('리더보드를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadLeaderboardByTier = useCallback(async (tier: LeagueTier, limit: number = 50) => {
    setIsLoading(true)

    try {
      // LEFT JOIN으로 변경
      const { data, error: fetchError } = await supabase
        .from('pvp_rankings')
        .select(`
          user_id,
          rating,
          tier,
          wins,
          losses,
          win_streak,
          combat_power,
          user_profiles(username)
        `)
        .eq('tier', tier)
        .order('rating', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      const entries: LeaderboardEntry[] = (data || []).map((row, index) => {
        const profileData = row.user_profiles as unknown as { username: string } | { username: string }[] | null
        const username = Array.isArray(profileData) ? profileData[0]?.username : profileData?.username

        // 유효한 티어인지 확인하고, 아니면 레이팅에서 계산
        const validTier = row.tier && LEAGUE_TIERS.includes(row.tier as LeagueTier)
          ? row.tier as LeagueTier
          : getTierFromRating(row.rating || 0)

        return {
          rank: index + 1,
          userId: row.user_id,
          username: username || '플레이어',
          rating: row.rating,
          tier: validTier,
          wins: row.wins,
          losses: row.losses,
          winStreak: row.win_streak,
          combatPower: row.combat_power,
        }
      })

      setLeaderboard(entries)
    } catch (err) {
      console.error('Failed to load tier leaderboard:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getMyRank = useCallback(async (): Promise<number | null> => {
    if (!user || !myRanking) return null

    try {
      const { count, error: countError } = await supabase
        .from('pvp_rankings')
        .select('*', { count: 'exact', head: true })
        .gt('rating', myRanking.rating)

      if (countError) throw countError

      return (count || 0) + 1
    } catch (err) {
      console.error('Failed to get rank:', err)
      return null
    }
  }, [user, myRanking])

  // =============================================
  // 주간 보상
  // =============================================

  const canClaimWeekly = useCallback((): boolean => {
    if (!myRanking) return false
    return canClaimWeeklyReward(myRanking.lastWeeklyClaim)
  }, [myRanking])

  const claimWeeklyReward = useCallback(async (): Promise<WeeklyReward | null> => {
    if (!user || !myRanking) return null

    try {
      const tierInfo = getTierInfo(myRanking.tier)
      const weekStart = getWeekStart()
      const weekStartStr = weekStart.toISOString().split('T')[0]

      // 먼저 이번 주 보상을 이미 받았는지 확인
      const { data: existingReward } = await supabase
        .from('pvp_weekly_rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .single()

      if (existingReward) {
        // 이미 받은 경우, lastWeeklyClaim 동기화 후 에러 표시
        await supabase
          .from('pvp_rankings')
          .update({ last_weekly_claim: new Date().toISOString() })
          .eq('user_id', user.id)

        setMyRanking(prev => prev ? { ...prev, lastWeeklyClaim: new Date() } : null)
        setError('이미 이번 주 보상을 수령했습니다.')
        return null
      }

      // 주간 보상 기록
      const { data, error: insertError } = await supabase
        .from('pvp_weekly_rewards')
        .insert({
          user_id: user.id,
          week_start: weekStartStr,
          tier_at_claim: myRanking.tier,
          gold_reward: tierInfo.weeklyReward.gold,
          ticket_reward: tierInfo.weeklyReward.tickets,
        })
        .select()
        .single()

      if (insertError) {
        // 중복 키 에러 처리 (race condition)
        if (insertError.code === '23505') {
          setError('이미 이번 주 보상을 수령했습니다.')
          return null
        }
        throw insertError
      }

      // 골드 지급
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('gold')
        .eq('id', user.id)
        .single()

      if (profileData) {
        await supabase
          .from('user_profiles')
          .update({ gold: profileData.gold + tierInfo.weeklyReward.gold })
          .eq('id', user.id)
      }

      // 랭킹 업데이트
      await supabase
        .from('pvp_rankings')
        .update({ last_weekly_claim: new Date().toISOString() })
        .eq('user_id', user.id)

      setMyRanking(prev => prev ? { ...prev, lastWeeklyClaim: new Date() } : null)

      return {
        id: data.id,
        userId: user.id,
        weekStart,
        tierAtClaim: myRanking.tier,
        goldReward: tierInfo.weeklyReward.gold,
        ticketReward: tierInfo.weeklyReward.tickets,
        claimedAt: new Date(),
      }
    } catch (err) {
      console.error('Failed to claim weekly reward:', err)
      setError('주간 보상 수령에 실패했습니다.')
      return null
    }
  }, [user, myRanking])

  // =============================================
  // 티켓 총량 조회
  // =============================================

  const loadTotalTickets = useCallback(async () => {
    if (!user) return

    try {
      const { data, error: fetchError } = await supabase
        .from('pvp_weekly_rewards')
        .select('ticket_reward')
        .eq('user_id', user.id)

      if (fetchError) throw fetchError

      const total = (data || []).reduce((sum, row) => sum + (row.ticket_reward || 0), 0)
      setTotalTickets(total)
    } catch (err) {
      console.error('Failed to load total tickets:', err)
    }
  }, [user])

  // =============================================
  // 시즌 정보
  // =============================================

  const loadCurrentSeason = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('pvp_seasons')
        .select('*')
        .eq('is_active', true)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setCurrentSeason(null)
          return
        }
        throw fetchError
      }

      setCurrentSeason({
        id: data.id,
        name: data.name,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        isActive: data.is_active,
      })
    } catch (err) {
      console.error('Failed to load season:', err)
    }
  }, [])

  const getDaysUntilSeasonEnd = useCallback((): number | null => {
    if (!currentSeason) return null

    const now = new Date()
    const end = currentSeason.endDate
    const diff = end.getTime() - now.getTime()

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [currentSeason])

  // =============================================
  // 전체 새로고침
  // =============================================

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadMyRanking(),
      loadLeaderboard(),
      loadCurrentSeason(),
      loadTotalTickets(),
    ])
  }, [loadMyRanking, loadLeaderboard, loadCurrentSeason, loadTotalTickets])

  // =============================================
  // 초기 로드
  // =============================================

  useEffect(() => {
    if (user) {
      loadMyRanking()
      loadCurrentSeason()
      loadTotalTickets()
    }
  }, [user, loadMyRanking, loadCurrentSeason, loadTotalTickets])

  return {
    myRanking,
    leaderboard,
    currentSeason,
    totalTickets,
    isLoading,
    error,
    loadMyRanking,
    getMyTierInfo,
    getMyProgress,
    getPointsToNext,
    getMyWinRate,
    loadLeaderboard,
    loadLeaderboardByTier,
    getMyRank,
    canClaimWeekly,
    claimWeeklyReward,
    loadTotalTickets,
    loadCurrentSeason,
    getDaysUntilSeasonEnd,
    refreshAll,
  }
}
