import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getRandomWeapon, WEAPON_DATA } from '../data/weapons'
import { getTotalAttack } from '../utils/starforce'
import { generateNickname } from '../utils/nicknameGenerator'
import type { UserWeapon } from '../types/weapon'

interface UserProfileRow {
  username: string
  gold: number
  last_daily_claim: string | null
  avatar_url: string | null
}

interface UserWeaponRow {
  id: string
  weapon_type_id: string
  star_level: number
  is_destroyed: boolean
  consecutive_fails: number
  created_at: string
  total_attack: number
}

interface UserProfile {
  username: string
  gold: number
  lastDailyClaim: string | null
  avatarUrl: string | null
}

interface UserDataState {
  profile: UserProfile | null
  weapon: UserWeapon | null
  isLoading: boolean
  error: string | null
}

export function useUserData() {
  const { user } = useAuth()
  const [state, setState] = useState<UserDataState>({
    profile: null,
    weapon: null,
    isLoading: true,
    error: null,
  })

  // 유저 데이터 로드
  useEffect(() => {
    if (!user) {
      setState({ profile: null, weapon: null, isLoading: false, error: null })
      return
    }

    const loadUserData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        // OAuth 아바타 URL 가져오기
        const oauthAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null

        // 프로필 로드
        let { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('username, gold, last_daily_claim, avatar_url')
          .eq('id', user.id)
          .single()

        // 프로필이 없으면 생성 (최초 로그인)
        if (profileError && profileError.code === 'PGRST116') {
          // 게임 스타일의 랜덤 닉네임 생성
          const username = generateNickname()

          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              username,
              gold: 10000,
              avatar_url: oauthAvatarUrl,
            })
            .select('username, gold, last_daily_claim, avatar_url')
            .single()

          if (createError) {
            throw new Error('프로필 생성에 실패했습니다.')
          }

          profileData = newProfile

          // 최초 로그인 시 랜덤 무기 지급
          const starterWeaponType = getRandomWeapon()
          const starterTotalAttack = starterWeaponType.baseAttack
          const starterWeaponName = starterWeaponType.levels[0].name

          await supabase
            .from('user_weapons')
            .insert({
              user_id: user.id,
              weapon_type_id: starterWeaponType.id,
              weapon_name: starterWeaponName,
              base_attack: starterWeaponType.baseAttack,
              star_level: 0,
              total_attack: starterTotalAttack,
              consecutive_fails: 0,
              is_destroyed: false,
            })

          console.log('🎁 최초 로그인 보상: 랜덤 무기 지급됨 -', starterWeaponName)
        } else if (profileError) {
          throw new Error('프로필을 불러올 수 없습니다.')
        }

        const typedProfile = profileData as UserProfileRow

        // 무기 로드 (파괴되지 않은 것)
        const { data: weaponData, error: weaponError } = await supabase
          .from('user_weapons')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_destroyed', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let weapon: UserWeapon | null = null

        if (!weaponError && weaponData) {
          const typedWeapon = weaponData as UserWeaponRow
          const weaponType = WEAPON_DATA.find(w => w.id === typedWeapon.weapon_type_id)
          if (weaponType) {
            weapon = {
              id: typedWeapon.id,
              weaponTypeId: typedWeapon.weapon_type_id,
              weaponType,
              starLevel: typedWeapon.star_level,
              isDestroyed: typedWeapon.is_destroyed,
              consecutiveFails: typedWeapon.consecutive_fails,
              createdAt: new Date(typedWeapon.created_at),
              totalAttack: typedWeapon.total_attack,
            }
          }
        }

        // OAuth 아바타가 변경되었으면 DB 업데이트
        if (oauthAvatarUrl && oauthAvatarUrl !== typedProfile.avatar_url) {
          await supabase
            .from('user_profiles')
            .update({ avatar_url: oauthAvatarUrl })
            .eq('id', user.id)
        }

        setState({
          profile: {
            username: typedProfile.username,
            gold: typedProfile.gold,
            lastDailyClaim: typedProfile.last_daily_claim,
            avatarUrl: oauthAvatarUrl || typedProfile.avatar_url,
          },
          weapon,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        console.error('Failed to load user data:', err)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : '데이터 로드 실패',
        }))
      }
    }

    loadUserData()
  }, [user])

  // 골드 업데이트
  const updateGold = useCallback(async (newGold: number) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ gold: newGold })
        .eq('id', user.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, gold: newGold } : null,
      }))

      return true
    } catch (err) {
      console.error('Failed to update gold:', err)
      return false
    }
  }, [user])

  // 닉네임 업데이트
  const updateUsername = useCallback(async (newUsername: string) => {
    if (!user) return false

    // 닉네임 유효성 검사
    const trimmed = newUsername.trim()
    if (trimmed.length < 2 || trimmed.length > 20) {
      return false
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ username: trimmed })
        .eq('id', user.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, username: trimmed } : null,
      }))

      return true
    } catch (err) {
      console.error('Failed to update username:', err)
      return false
    }
  }, [user])

  // 일일 보상 수령
  const claimDailyReward = useCallback(async (amount: number) => {
    if (!user || !state.profile) return false

    const today = new Date().toISOString().split('T')[0]

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          gold: state.profile.gold + amount,
          last_daily_claim: today,
        })
        .eq('id', user.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        profile: prev.profile ? {
          ...prev.profile,
          gold: prev.profile.gold + amount,
          lastDailyClaim: today,
        } : null,
      }))

      return true
    } catch (err) {
      console.error('Failed to claim daily reward:', err)
      return false
    }
  }, [user, state.profile])

  // 무기 획득
  const acquireWeapon = useCallback(async (): Promise<UserWeapon | null> => {
    if (!user) return null

    try {
      const weaponType = getRandomWeapon()
      const totalAttack = weaponType.baseAttack
      const weaponName = weaponType.levels[0].name

      const { data, error } = await supabase
        .from('user_weapons')
        .insert({
          user_id: user.id,
          weapon_type_id: weaponType.id,
          weapon_name: weaponName,
          base_attack: weaponType.baseAttack,
          star_level: 0,
          total_attack: totalAttack,
          consecutive_fails: 0,
          is_destroyed: false,
        })
        .select()
        .single()

      if (error) throw error

      const typedData = data as UserWeaponRow

      const weapon: UserWeapon = {
        id: typedData.id,
        weaponTypeId: weaponType.id,
        weaponType,
        starLevel: 0,
        isDestroyed: false,
        consecutiveFails: 0,
        createdAt: new Date(typedData.created_at),
        totalAttack,
      }

      setState(prev => ({ ...prev, weapon }))
      return weapon
    } catch (err) {
      console.error('Failed to acquire weapon:', err)
      return null
    }
  }, [user])

  // 무기 업데이트 (강화 후)
  const updateWeapon = useCallback(async (updates: Partial<UserWeapon>) => {
    if (!user || !state.weapon) return false

    try {
      const dbUpdates: Record<string, unknown> = {}

      if (updates.starLevel !== undefined) {
        dbUpdates.star_level = updates.starLevel
        dbUpdates.total_attack = getTotalAttack(state.weapon.weaponType.baseAttack, updates.starLevel)
      }
      if (updates.consecutiveFails !== undefined) {
        dbUpdates.consecutive_fails = updates.consecutiveFails
      }
      if (updates.isDestroyed !== undefined) {
        dbUpdates.is_destroyed = updates.isDestroyed
      }

      const { error } = await supabase
        .from('user_weapons')
        .update(dbUpdates)
        .eq('id', state.weapon.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        weapon: prev.weapon ? {
          ...prev.weapon,
          ...updates,
          totalAttack: updates.starLevel !== undefined
            ? getTotalAttack(prev.weapon.weaponType.baseAttack, updates.starLevel)
            : prev.weapon.totalAttack,
        } : null,
      }))

      return true
    } catch (err) {
      console.error('Failed to update weapon:', err)
      return false
    }
  }, [user, state.weapon])

  // 무기 판매/제거
  const removeWeapon = useCallback(async () => {
    if (!user || !state.weapon) return false

    try {
      const { error } = await supabase
        .from('user_weapons')
        .delete()
        .eq('id', state.weapon.id)

      if (error) throw error

      setState(prev => ({ ...prev, weapon: null }))
      return true
    } catch (err) {
      console.error('Failed to remove weapon:', err)
      return false
    }
  }, [user, state.weapon])

  // 강화 기록 저장 (무기용)
  const recordEnhancement = useCallback(async (
    fromLevel: number,
    toLevel: number,
    result: 'success' | 'maintain' | 'destroy',
    wasChanceTime: boolean,
    goldSpent: number
  ) => {
    if (!user || !state.weapon) return false

    try {
      // 현재 레벨의 무기 이름 가져오기
      const safeLevel = Math.min(fromLevel, state.weapon.weaponType.levels.length - 1)
      const weaponName = state.weapon.weaponType.levels[safeLevel].name

      const { error } = await supabase
        .from('enhancement_history')
        .insert({
          user_id: user.id,
          weapon_id: state.weapon.id,
          weapon_name: weaponName,
          from_level: fromLevel,
          to_level: toLevel,
          result,
          was_chance_time: wasChanceTime,
          gold_spent: goldSpent,
        })

      if (error) throw error
      return true
    } catch (err) {
      console.error('Failed to record enhancement:', err)
      return false
    }
  }, [user, state.weapon])

  // 강화 기록 저장 (장비용 - 범용)
  const recordEquipmentEnhancement = useCallback(async (
    itemName: string,
    fromLevel: number,
    toLevel: number,
    result: 'success' | 'maintain' | 'destroy',
    wasChanceTime: boolean,
    goldSpent: number
  ) => {
    if (!user) {
      console.warn('recordEquipmentEnhancement: user is null')
      return false
    }

    console.log('📝 Recording enhancement:', {
      user_id: user.id,
      itemName,
      fromLevel,
      toLevel,
      result,
      wasChanceTime,
    })

    try {
      const { data, error } = await supabase
        .from('enhancement_history')
        .insert({
          user_id: user.id,
          weapon_id: null,  // 장비는 weapon_id 없음
          weapon_name: itemName,
          from_level: fromLevel,
          to_level: toLevel,
          result,
          was_chance_time: wasChanceTime,
          gold_spent: goldSpent,
        })
        .select()

      if (error) {
        console.error('❌ Enhancement history insert error:', error)
        throw error
      }

      console.log('✅ Enhancement recorded:', data)
      return true
    } catch (err) {
      console.error('Failed to record equipment enhancement:', err)
      return false
    }
  }, [user])

  return {
    ...state,
    updateGold,
    updateUsername,
    claimDailyReward,
    acquireWeapon,
    updateWeapon,
    removeWeapon,
    recordEnhancement,
    recordEquipmentEnhancement,
  }
}
