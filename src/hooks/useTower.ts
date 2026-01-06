/**
 * 수련의 숲 상태 관리 훅
 *
 * - 진행 상태 로드/저장
 * - 배틀 결과 기록
 * - 리더보드 조회
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
  TowerProgress,
  TowerBattleResult,
  TowerLeaderboardEntry,
  TowerRecordRow,
  TowerStatus,
  TowerSeason,
  TowerSeasonRewardTier,
  TowerSeasonUserReward,
  CreateSeasonParams,
} from '../types/tower'
import { getTowerTier } from '../types/tower'
import { calculateFloorReward, isFirstMilestone } from '../utils/towerBattle'

// =============================================
// 상태 인터페이스
// =============================================

interface TowerState {
  progress: TowerProgress | null
  towerStatus: TowerStatus | null
  activeSeason: TowerSeason | null
  unclaimedRewards: TowerSeasonUserReward[]
  isLoading: boolean
  error: string | null
}

interface UseTowerReturn extends TowerState {
  recordBattleResult: (
    floor: number,
    success: boolean,
    timeRemainingMs: number,
    playerDamageDealt: number,
    enemyDamageDealt: number,
    playerFinalHp: number,
    enemyFinalHp: number
  ) => Promise<TowerBattleResult | null>
  selectFloor: (floor: number) => void
  loadLeaderboard: () => Promise<TowerLeaderboardEntry[]>
  getMyRank: () => Promise<number>
  refreshProgress: () => Promise<void>
  setTowerOpen: (isOpen: boolean, message?: string) => Promise<boolean>
  isAdmin: boolean
  // 시즌 관련
  createSeason: (params: CreateSeasonParams) => Promise<string | null>
  activateSeason: (seasonId: string, resetRecords?: boolean) => Promise<boolean>
  endSeason: (seasonId: string) => Promise<number>
  loadSeasonRewardTiers: (seasonId: string) => Promise<TowerSeasonRewardTier[]>
  claimSeasonReward: (rewardId: string) => Promise<{ gold: number; ticketLevel: number; ticketCount: number; rewardItems?: unknown[] } | null>
  loadAllSeasons: () => Promise<TowerSeason[]>
}

// =============================================
// 훅 구현
// =============================================

export function useTower(): UseTowerReturn {
  const { user } = useAuth()
  const [state, setState] = useState<TowerState>({
    progress: null,
    towerStatus: null,
    activeSeason: null,
    unclaimedRewards: [],
    isLoading: true,
    error: null,
  })
  const [isAdmin, setIsAdmin] = useState(false)

  // =============================================
  // 관리자 여부 확인
  // =============================================

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      return
    }

    const checkAdmin = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      setIsAdmin(data?.is_admin || false)
    }

    checkAdmin()
  }, [user])

  // =============================================
  // 타워 상태 로드
  // =============================================

  const loadTowerStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_tower_status')

      if (error) {
        // 함수가 없거나 에러 발생 시 기본값으로 열림 처리
        console.warn('Tower status function not available, defaulting to open:', error.message)
        setState(prev => ({
          ...prev,
          towerStatus: {
            isOpen: true,
            message: '',
          },
        }))
        return
      }

      if (data && data.length > 0) {
        setState(prev => ({
          ...prev,
          towerStatus: {
            isOpen: data[0].is_open,
            message: data[0].message,
          },
        }))
      } else {
        // 데이터 없을 때도 기본값으로 열림 처리
        setState(prev => ({
          ...prev,
          towerStatus: {
            isOpen: true,
            message: '',
          },
        }))
      }
    } catch (err) {
      console.error('Failed to load tower status:', err)
      // 예외 발생 시에도 기본값으로 열림 처리
      setState(prev => ({
        ...prev,
        towerStatus: {
          isOpen: true,
          message: '',
        },
      }))
    }
  }, [])

  // =============================================
  // 활성 시즌 로드
  // =============================================

  const loadActiveSeason = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_tower_season')

      if (error) throw error

      if (data && data.length > 0) {
        const season = data[0]
        setState(prev => ({
          ...prev,
          activeSeason: {
            id: season.id,
            name: season.name,
            description: season.description,
            startsAt: new Date(season.starts_at),
            endsAt: new Date(season.ends_at),
            isActive: true,
            rewardsDistributed: false,
            timeRemainingMs: season.time_remaining_ms,
          },
        }))
      } else {
        setState(prev => ({ ...prev, activeSeason: null }))
      }
    } catch (err) {
      console.error('Failed to load active season:', err)
    }
  }, [])

  // =============================================
  // 미수령 보상 로드
  // =============================================

  const loadUnclaimedRewards = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc('get_unclaimed_season_rewards', {
        p_user_id: user.id,
      })

      if (error) throw error

      setState(prev => ({
        ...prev,
        unclaimedRewards: (data || []).map((r: {
          id: string
          season_id: string
          season_name: string
          final_rank: number
          final_floor: number
          gold_reward: number
          enhancement_ticket_level: number
          enhancement_ticket_count: number
          reward_items: unknown[]
        }) => ({
          id: r.id,
          seasonId: r.season_id,
          seasonName: r.season_name,
          finalRank: r.final_rank,
          finalFloor: r.final_floor,
          goldReward: r.gold_reward,
          enhancementTicketLevel: r.enhancement_ticket_level,
          enhancementTicketCount: r.enhancement_ticket_count,
          rewardItems: r.reward_items || [],
          isClaimed: false,
        })),
      }))
    } catch (err) {
      console.error('Failed to load unclaimed rewards:', err)
    }
  }, [user])

  // =============================================
  // 만료된 시즌 자동 종료
  // =============================================

  const checkAndEndExpiredSeasons = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('auto_end_expired_seasons')

      if (error) {
        // 함수가 없으면 무시 (이전 버전 호환)
        console.warn('Auto-end seasons function not available:', error.message)
        return
      }

      if (data && data.length > 0) {
        console.log('Auto-ended expired seasons:', data)
        // 시즌이 자동 종료되었으면 보상 목록 새로고침
        await loadUnclaimedRewards()
      }
    } catch (err) {
      console.error('Failed to auto-end expired seasons:', err)
    }
  }, [loadUnclaimedRewards])

  // =============================================
  // 진행 상태 로드
  // =============================================

  const loadProgress = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, progress: null, isLoading: false, error: null }))
      return
    }

    try {
      const { data, error } = await supabase
        .from('tower_records')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (신규 유저)
        throw error
      }

      if (data) {
        const record = data as TowerRecordRow
        setState(prev => ({
          ...prev,
          progress: {
            currentFloor: record.current_floor,
            highestFloor: record.highest_floor,
            firstClearMilestones: record.first_clear_milestones || [],
            totalAttempts: record.total_attempts,
            totalGoldEarned: record.total_gold_earned,
          },
          isLoading: false,
          error: null,
        }))
      } else {
        // 신규 유저 기본값
        setState(prev => ({
          ...prev,
          progress: {
            currentFloor: 1,
            highestFloor: 0,
            firstClearMilestones: [],
            totalAttempts: 0,
            totalGoldEarned: 0,
          },
          isLoading: false,
          error: null,
        }))
      }
    } catch (err) {
      console.error('Failed to load tower progress:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '진행 상태를 불러올 수 없습니다.',
      }))
    }
  }, [user])

  useEffect(() => {
    const initializeTower = async () => {
      // 먼저 만료된 시즌 자동 종료 확인
      await checkAndEndExpiredSeasons()
      // 그 다음 데이터 로드
      loadProgress()
      loadTowerStatus()
      loadActiveSeason()
      loadUnclaimedRewards()
    }
    initializeTower()
  }, [loadProgress, loadTowerStatus, loadActiveSeason, loadUnclaimedRewards, checkAndEndExpiredSeasons])

  // =============================================
  // 배틀 결과 기록
  // =============================================

  const recordBattleResult = useCallback(async (
    floor: number,
    success: boolean,
    timeRemainingMs: number,
    playerDamageDealt: number,
    enemyDamageDealt: number,
    playerFinalHp: number,
    enemyFinalHp: number
  ): Promise<TowerBattleResult | null> => {
    if (!user || !state.progress) return null

    try {
      // 마일스톤 및 기록 갱신 체크
      const isNewRecord = success && floor > state.progress.highestFloor
      const firstMilestone = success && isFirstMilestone(floor, state.progress.firstClearMilestones)

      // 보상 계산
      const rewards = success
        ? calculateFloorReward(floor, firstMilestone, isNewRecord)
        : { baseGold: 0, milestoneBonus: 0, recordBonus: 0, totalGold: 0 }

      // 새 마일스톤 배열
      const newMilestones = firstMilestone
        ? [...state.progress.firstClearMilestones, floor]
        : state.progress.firstClearMilestones

      // DB upsert
      const { error } = await supabase
        .from('tower_records')
        .upsert({
          user_id: user.id,
          highest_floor: success ? Math.max(state.progress.highestFloor, floor) : state.progress.highestFloor,
          current_floor: success ? floor + 1 : floor,
          first_clear_milestones: newMilestones,
          total_attempts: state.progress.totalAttempts + 1,
          total_gold_earned: state.progress.totalGoldEarned + rewards.totalGold,
        }, { onConflict: 'user_id' })

      if (error) throw error

      // 상태 업데이트
      setState(prev => ({
        ...prev,
        progress: prev.progress ? {
          currentFloor: success ? floor + 1 : floor,
          highestFloor: success ? Math.max(prev.progress.highestFloor, floor) : prev.progress.highestFloor,
          firstClearMilestones: newMilestones,
          totalAttempts: prev.progress.totalAttempts + 1,
          totalGoldEarned: prev.progress.totalGoldEarned + rewards.totalGold,
        } : null,
      }))

      return {
        floor,
        success,
        timeRemaining: timeRemainingMs,
        playerDamageDealt,
        enemyDamageDealt,
        playerFinalHp,
        enemyFinalHp,
        rewards,
        isNewRecord,
        isFirstMilestone: firstMilestone,
      }
    } catch (err) {
      console.error('Failed to record battle result:', err)
      return null
    }
  }, [user, state.progress])

  // =============================================
  // 층 선택
  // =============================================

  const selectFloor = useCallback((floor: number) => {
    if (!state.progress) return
    // 클리어한 층 + 1까지만 선택 가능
    if (floor < 1 || floor > state.progress.highestFloor + 1) return

    setState(prev => ({
      ...prev,
      progress: prev.progress ? {
        ...prev.progress,
        currentFloor: floor,
      } : null,
    }))
  }, [state.progress])

  // =============================================
  // 리더보드 조회
  // =============================================

  const loadLeaderboard = useCallback(async (): Promise<TowerLeaderboardEntry[]> => {
    try {
      const { data, error } = await supabase.rpc('get_tower_leaderboard', {
        p_limit: 50,
      })

      if (error) throw error

      return (data || []).map((entry: { user_id: string; username: string; avatar_url?: string; highest_floor: number; rank: number }) => ({
        rank: entry.rank,
        userId: entry.user_id,
        username: entry.username || '익명',
        avatarUrl: entry.avatar_url,
        highestFloor: entry.highest_floor,
        tier: getTowerTier(entry.highest_floor),
      }))
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
      return []
    }
  }, [])

  // =============================================
  // 내 랭킹 조회
  // =============================================

  const getMyRank = useCallback(async (): Promise<number> => {
    if (!user) return 0

    try {
      const { data, error } = await supabase.rpc('get_my_tower_rank', {
        p_user_id: user.id,
      })

      if (error) throw error

      return data || 0
    } catch (err) {
      console.error('Failed to get my rank:', err)
      return 0
    }
  }, [user])

  // =============================================
  // 진행 상태 새로고침
  // =============================================

  const refreshProgress = useCallback(async () => {
    await loadProgress()
    await loadTowerStatus()
    await loadActiveSeason()
    await loadUnclaimedRewards()
  }, [loadProgress, loadTowerStatus, loadActiveSeason, loadUnclaimedRewards])

  // =============================================
  // 타워 상태 변경 (관리자 전용)
  // =============================================

  const setTowerOpen = useCallback(async (isOpen: boolean, message?: string): Promise<boolean> => {
    if (!user || !isAdmin) return false

    try {
      const { error } = await supabase.rpc('set_tower_status', {
        p_admin_id: user.id,
        p_is_open: isOpen,
        p_message: message || null,
      })

      if (error) throw error

      // 상태 갱신
      await loadTowerStatus()
      return true
    } catch (err) {
      console.error('Failed to set tower status:', err)
      return false
    }
  }, [user, isAdmin, loadTowerStatus])

  // =============================================
  // 시즌 생성 (관리자 전용)
  // =============================================

  const createSeason = useCallback(async (params: CreateSeasonParams): Promise<string | null> => {
    if (!user || !isAdmin) return null

    try {
      const rewards = params.rewards.map(r => ({
        rankFrom: r.rankFrom,
        rankTo: r.rankTo,
        // 레거시 필드 (하위 호환성)
        goldReward: r.goldReward,
        enhancementTicketLevel: r.enhancementTicketLevel,
        enhancementTicketCount: r.enhancementTicketCount,
        // 새로운 유연한 보상 아이템 배열
        rewardItems: r.rewardItems || [],
      }))

      const { data, error } = await supabase.rpc('create_tower_season', {
        p_admin_id: user.id,
        p_name: params.name,
        p_description: params.description || null,
        p_starts_at: params.startsAt.toISOString(),
        p_ends_at: params.endsAt.toISOString(),
        p_rewards: rewards,
      })

      if (error) throw error

      return data as string
    } catch (err) {
      console.error('Failed to create season:', err)
      return null
    }
  }, [user, isAdmin])

  // =============================================
  // 시즌 활성화 (관리자 전용)
  // =============================================

  const activateSeason = useCallback(async (seasonId: string, resetRecords: boolean = true): Promise<boolean> => {
    if (!user || !isAdmin) return false

    try {
      const { error } = await supabase.rpc('activate_tower_season', {
        p_admin_id: user.id,
        p_season_id: seasonId,
        p_reset_records: resetRecords,
      })

      if (error) throw error

      await refreshProgress()
      return true
    } catch (err) {
      console.error('Failed to activate season:', err)
      return false
    }
  }, [user, isAdmin, refreshProgress])

  // =============================================
  // 시즌 종료 (관리자 전용)
  // =============================================

  const endSeason = useCallback(async (seasonId: string): Promise<number> => {
    if (!user || !isAdmin) return 0

    try {
      const { data, error } = await supabase.rpc('end_tower_season', {
        p_admin_id: user.id,
        p_season_id: seasonId,
      })

      if (error) throw error

      await refreshProgress()
      return data as number
    } catch (err) {
      console.error('Failed to end season:', err)
      return 0
    }
  }, [user, isAdmin, refreshProgress])

  // =============================================
  // 시즌 보상 티어 조회
  // =============================================

  const loadSeasonRewardTiers = useCallback(async (seasonId: string): Promise<TowerSeasonRewardTier[]> => {
    try {
      const { data, error } = await supabase.rpc('get_season_reward_tiers', {
        p_season_id: seasonId,
      })

      if (error) throw error

      return (data || []).map((r: {
        rank_from: number
        rank_to: number
        gold_reward: number
        enhancement_ticket_level: number
        enhancement_ticket_count: number
        reward_items: unknown[]
      }) => ({
        rankFrom: r.rank_from,
        rankTo: r.rank_to,
        goldReward: r.gold_reward,
        enhancementTicketLevel: r.enhancement_ticket_level,
        enhancementTicketCount: r.enhancement_ticket_count,
        rewardItems: r.reward_items || [],
      }))
    } catch (err) {
      console.error('Failed to load reward tiers:', err)
      return []
    }
  }, [])

  // =============================================
  // 시즌 보상 수령
  // =============================================

  const claimSeasonReward = useCallback(async (rewardId: string): Promise<{ gold: number; ticketLevel: number; ticketCount: number; rewardItems?: unknown[] } | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase.rpc('claim_tower_season_reward', {
        p_user_id: user.id,
        p_reward_id: rewardId,
      })

      if (error) throw error

      // 보상 목록 갱신
      await loadUnclaimedRewards()

      // 새 형식: JSONB 반환
      if (data && typeof data === 'object' && data.success) {
        return {
          gold: data.goldReward || 0,
          ticketLevel: data.enhancementTicketLevel || 0,
          ticketCount: data.enhancementTicketCount || 0,
          rewardItems: data.rewardItems || [],
        }
      }

      // 구 형식: 테이블 형태 반환 (하위 호환성)
      if (data && Array.isArray(data) && data.length > 0) {
        return {
          gold: data[0].gold_claimed || 0,
          ticketLevel: data[0].ticket_level_claimed || 0,
          ticketCount: data[0].ticket_count_claimed || 0,
        }
      }

      return null
    } catch (err) {
      console.error('Failed to claim reward:', err)
      return null
    }
  }, [user, loadUnclaimedRewards])

  // =============================================
  // 모든 시즌 조회 (관리자용)
  // =============================================

  const loadAllSeasons = useCallback(async (): Promise<TowerSeason[]> => {
    try {
      const { data, error } = await supabase
        .from('tower_seasons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((s: {
        id: string
        name: string
        description: string | null
        starts_at: string
        ends_at: string
        is_active: boolean
        rewards_distributed: boolean
      }) => ({
        id: s.id,
        name: s.name,
        description: s.description || undefined,
        startsAt: new Date(s.starts_at),
        endsAt: new Date(s.ends_at),
        isActive: s.is_active,
        rewardsDistributed: s.rewards_distributed,
      }))
    } catch (err) {
      console.error('Failed to load all seasons:', err)
      return []
    }
  }, [])

  return {
    ...state,
    recordBattleResult,
    selectFloor,
    loadLeaderboard,
    getMyRank,
    refreshProgress,
    setTowerOpen,
    isAdmin,
    // 시즌 관련
    createSeason,
    activateSeason,
    endSeason,
    loadSeasonRewardTiers,
    claimSeasonReward,
    loadAllSeasons,
  }
}
