import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
  AchievementBorder,
  AchievementBorderRow,
  UserAchievementRow,
  AchievementWithProgress,
  AchievementCategory,
  AchievementConditionType,
} from '../types/achievement'

interface AchievementsState {
  achievements: AchievementWithProgress[]
  equippedBorderId: string | null
  isLoading: boolean
  error: string | null
}

// DB Row를 프론트엔드 타입으로 변환
function transformBorderRow(row: AchievementBorderRow): AchievementBorder {
  return {
    id: row.id,
    tier: row.tier,
    name: row.name,
    description: row.description || '',
    borderClass: row.border_class || '',
    unlockCondition: row.unlock_condition,
    seasonId: row.season_id,
    isSeasonal: row.is_seasonal || false,
    seasonEndDate: row.season_end_date,
  }
}

export function useAchievements() {
  const { user } = useAuth()
  const [state, setState] = useState<AchievementsState>({
    achievements: [],
    equippedBorderId: null,
    isLoading: true,
    error: null,
  })

  // 업적 데이터 로드
  const loadAchievements = useCallback(async () => {
    if (!user) {
      setState({
        achievements: [],
        equippedBorderId: null,
        isLoading: false,
        error: null,
      })
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 모든 업적 정의 로드
      const { data: bordersData, error: bordersError } = await supabase
        .from('achievement_borders')
        .select('*')
        .order('tier', { ascending: true })

      if (bordersError) throw bordersError

      // 유저 진행 상황 로드
      const { data: progressData, error: progressError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)

      if (progressError) throw progressError

      // 장착된 테두리 로드
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('equipped_border')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') throw profileError

      // 데이터 병합
      const progressMap = new Map<string, UserAchievementRow>()
      for (const p of (progressData || []) as UserAchievementRow[]) {
        progressMap.set(p.border_id, p)
      }

      const achievements: AchievementWithProgress[] = (bordersData as AchievementBorderRow[]).map(row => {
        const border = transformBorderRow(row)
        const progress = progressMap.get(row.id)
        return {
          ...border,
          progress: progress?.progress || 0,
          isUnlocked: progress?.is_unlocked || false,
          unlockedAt: progress?.unlocked_at || null,
        }
      })

      setState({
        achievements,
        equippedBorderId: profileData?.equipped_border || null,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      console.error('Failed to load achievements:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '업적 로드 실패',
      }))
    }
  }, [user])

  // 초기 로드
  useEffect(() => {
    loadAchievements()
  }, [loadAchievements])

  // 누적 타입 업적 (값을 더함)
  const CUMULATIVE_TYPES: AchievementConditionType[] = ['enhance_count', 'gacha_count']

  // 업적 진행 업데이트
  const updateProgress = useCallback(async (
    conditionType: AchievementConditionType,
    value: number
  ): Promise<string[]> => {
    if (!user) return []

    const newlyUnlocked: string[] = []
    const isCumulative = CUMULATIVE_TYPES.includes(conditionType)

    try {
      // DB에서 직접 해당 조건 타입의 업적들 조회 (state에 의존하지 않음)
      const { data: bordersData, error: bordersError } = await supabase
        .from('achievement_borders')
        .select('id')
        .eq('unlock_condition->>type', conditionType)

      if (bordersError) {
        console.error('Failed to fetch achievement borders:', bordersError)
        return []
      }

      // 이미 해금된 업적 조회
      const { data: unlockedData } = await supabase
        .from('user_achievements')
        .select('border_id')
        .eq('user_id', user.id)
        .eq('is_unlocked', true)

      const unlockedIds = new Set((unlockedData || []).map(u => u.border_id))

      // 해금되지 않은 업적만 필터
      const achievementIds = (bordersData || [])
        .map(b => b.id)
        .filter(id => !unlockedIds.has(id))

      for (const borderId of achievementIds) {
        let data, error

        if (isCumulative) {
          // 누적 타입: increment 함수 사용
          const result = await supabase.rpc('increment_achievement_progress', {
            p_user_id: user.id,
            p_border_id: borderId,
            p_increment: value,
          })
          data = result.data
          error = result.error
        } else {
          // 최고값 타입: update 함수 사용
          const result = await supabase.rpc('update_achievement_progress', {
            p_user_id: user.id,
            p_border_id: borderId,
            p_progress: value,
          })
          data = result.data
          error = result.error
        }

        if (error) {
          console.error(`Failed to update ${borderId}:`, error)
          continue
        }

        // 새로 해금되었으면 목록에 추가
        if (data === true) {
          newlyUnlocked.push(borderId)
        }
      }

      // 상태 리로드 (새로 해금되었거나 진행도 변경 시)
      if (newlyUnlocked.length > 0 || achievementIds.length > 0) {
        await loadAchievements()
      }

      return newlyUnlocked
    } catch (err) {
      console.error('Failed to update achievement progress:', err)
      return []
    }
  }, [user, loadAchievements])

  // 테두리 장착
  const equipBorder = useCallback(async (borderId: string | null): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase.rpc('equip_border', {
        p_user_id: user.id,
        p_border_id: borderId,
      })

      if (error) throw error

      if (data === true) {
        setState(prev => ({ ...prev, equippedBorderId: borderId }))
        return true
      }

      return false
    } catch (err) {
      console.error('Failed to equip border:', err)
      return false
    }
  }, [user])

  // 카테고리별 업적 필터
  const getAchievementsByCategory = useCallback((category: AchievementCategory) => {
    return state.achievements.filter(a => a.unlockCondition.category === category)
  }, [state.achievements])

  // 해금된 업적만
  const getUnlockedAchievements = useCallback(() => {
    return state.achievements.filter(a => a.isUnlocked)
  }, [state.achievements])

  // 장착된 테두리 정보
  const getEquippedBorder = useCallback((): AchievementWithProgress | null => {
    if (!state.equippedBorderId) return null
    return state.achievements.find(a => a.id === state.equippedBorderId) || null
  }, [state.achievements, state.equippedBorderId])

  // 통계
  const getStats = useCallback(() => {
    const total = state.achievements.length
    const unlocked = state.achievements.filter(a => a.isUnlocked).length
    return { total, unlocked, progress: total > 0 ? (unlocked / total) * 100 : 0 }
  }, [state.achievements])

  // 시즌 업적 획득 가능 여부 체크
  const isAchievementObtainable = useCallback((achievement: AchievementWithProgress): boolean => {
    if (!achievement.isSeasonal) return true
    if (!achievement.seasonEndDate) return true // 아직 시즌 진행 중
    return new Date() < new Date(achievement.seasonEndDate)
  }, [])

  // 시즌 업적만 필터
  const getSeasonalAchievements = useCallback(() => {
    return state.achievements.filter(a => a.isSeasonal)
  }, [state.achievements])

  return {
    ...state,
    loadAchievements,
    updateProgress,
    equipBorder,
    getAchievementsByCategory,
    getUnlockedAchievements,
    getEquippedBorder,
    getStats,
    isAchievementObtainable,
    getSeasonalAchievements,
  }
}
