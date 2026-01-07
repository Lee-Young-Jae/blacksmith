import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  type MyReferral,
  type MyReferrer,
  type MyReferralRow,
  type MyReferrerRow,
  toMyReferral,
  toMyReferrer,
  REFERRAL_REWARDS,
} from '../types/referral'

interface ReferralState {
  myCode: string | null
  referrals: MyReferral[]
  myReferrer: MyReferrer | null
  isLoading: boolean
  error: string | null
}

export function useReferral() {
  const { user } = useAuth()
  const [state, setState] = useState<ReferralState>({
    myCode: null,
    referrals: [],
    myReferrer: null,
    isLoading: true,
    error: null,
  })

  // 레퍼럴 정보 로드
  const loadReferralData = useCallback(async () => {
    if (!user) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 내 레퍼럴 코드 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // 내가 초대한 친구들 목록
      const { data: referralsData, error: referralsError } = await supabase
        .rpc('get_my_referrals', { p_user_id: user.id })

      if (referralsError) throw referralsError

      // 나를 초대한 친구
      const { data: referrerData, error: referrerError } = await supabase
        .rpc('get_my_referrer', { p_user_id: user.id })

      if (referrerError) throw referrerError

      setState({
        myCode: profile?.referral_code || null,
        referrals: (referralsData as MyReferralRow[] || []).map(toMyReferral),
        myReferrer: referrerData?.[0]
          ? toMyReferrer(referrerData[0] as MyReferrerRow)
          : null,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      console.error('Failed to load referral data:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '레퍼럴 정보를 불러오는데 실패했습니다.',
      }))
    }
  }, [user])

  // 레퍼럴 코드 생성
  const generateCode = useCallback(async (): Promise<string | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .rpc('generate_referral_code', { p_user_id: user.id })

      if (error) throw error

      const code = data as string
      setState(prev => ({ ...prev, myCode: code }))
      return code
    } catch (err) {
      console.error('Failed to generate referral code:', err)
      setState(prev => ({
        ...prev,
        error: '초대 코드 생성에 실패했습니다.',
      }))
      return null
    }
  }, [user])

  // 코드 클립보드에 복사
  const copyCode = useCallback(async (): Promise<boolean> => {
    let code = state.myCode

    // 코드가 없으면 생성
    if (!code) {
      code = await generateCode()
    }

    if (!code) return false

    try {
      await navigator.clipboard.writeText(code)
      return true
    } catch (err) {
      console.error('Failed to copy code:', err)
      return false
    }
  }, [state.myCode, generateCode])

  // 코드 공유 (Web Share API)
  const shareCode = useCallback(async (): Promise<boolean> => {
    let code = state.myCode

    // 코드가 없으면 생성
    if (!code) {
      code = await generateCode()
    }

    if (!code) return false

    const shareUrl = `${window.location.origin}?ref=${code}`
    const shareText = `내 초대 코드로 가입하면 둘 다 보상을 받아요! 코드: ${code}`

    // Web Share API 지원 여부 확인 (모바일 브라우저 등)
    const canShare = typeof navigator.share === 'function' && navigator.canShare?.({
      title: '대장간 - 친구 초대',
      text: shareText,
      url: shareUrl,
    })

    if (canShare) {
      try {
        await navigator.share({
          title: '대장간 - 친구 초대',
          text: shareText,
          url: shareUrl,
        })
        return true
      } catch (err) {
        // 사용자가 공유를 취소한 경우 (AbortError)
        if (err instanceof Error && err.name === 'AbortError') {
          return false
        }
        // 다른 에러면 URL 복사로 폴백
        console.error('Share failed, falling back to clipboard:', err)
      }
    }

    // Web Share API 미지원 또는 실패 시 URL 복사
    try {
      await navigator.clipboard.writeText(shareUrl)
      return true
    } catch (err) {
      console.error('Clipboard write failed:', err)
      // 마지막 수단: prompt로 URL 표시
      window.prompt('아래 URL을 복사하세요:', shareUrl)
      return true
    }
  }, [state.myCode, generateCode])

  // 레퍼럴 코드 적용 (회원가입 후 호출)
  const applyCode = useCallback(async (referralCode: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase
        .rpc('apply_referral_code', {
          p_referee_id: user.id,
          p_referral_code: referralCode,
        })

      if (error) throw error

      // 성공적으로 적용됐으면 데이터 새로고침
      if (data) {
        await loadReferralData()
      }

      return !!data
    } catch (err) {
      console.error('Failed to apply referral code:', err)
      return false
    }
  }, [user, loadReferralData])

  // 초기 로드
  useEffect(() => {
    if (user) {
      loadReferralData()
    } else {
      setState({
        myCode: null,
        referrals: [],
        myReferrer: null,
        isLoading: false,
        error: null,
      })
    }
  }, [user, loadReferralData])

  // 완료된 레퍼럴 수
  const completedCount = state.referrals.filter(r => r.status === 'completed').length
  const pendingCount = state.referrals.filter(r => r.status === 'pending').length

  return {
    // 상태
    ...state,

    // 통계
    completedCount,
    pendingCount,
    totalCount: state.referrals.length,

    // 보상 정보
    rewards: REFERRAL_REWARDS,

    // 액션
    generateCode,
    copyCode,
    shareCode,
    applyCode,
    refresh: loadReferralData,
  }
}
