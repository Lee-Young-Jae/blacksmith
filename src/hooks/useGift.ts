import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getEquipmentById } from '../data/equipment'
import {
  getCondolenceImage,
  type Gift,
  type GiftRow,
  type GiftCount,
  type SendCondolenceRequest,
  type SendEquipmentRequest,
  type UserSearchResult,
} from '../types/gift'

interface GiftState {
  receivedGifts: Gift[]
  unclaimedCount: GiftCount
  isLoading: boolean
  error: string | null
}

// GiftRow를 Gift로 변환
function transformGiftRow(row: GiftRow): Gift {
  const equipmentData = row.equipment_data

  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender?.username || '알 수 없음',
    receiverId: row.receiver_id,
    giftType: row.gift_type,
    condolenceImageId: row.condolence_image_id || undefined,
    condolenceImage: row.condolence_image_id
      ? getCondolenceImage(row.condolence_image_id)
      : undefined,
    equipmentData: equipmentData || undefined,
    equipmentBase: equipmentData
      ? getEquipmentById(equipmentData.equipment_base_id)
      : undefined,
    message: row.message || undefined,
    enhancementHistoryId: row.enhancement_history_id || undefined,
    isClaimed: row.is_claimed,
    claimedAt: row.claimed_at ? new Date(row.claimed_at) : undefined,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
  }
}

export function useGift() {
  const { user } = useAuth()
  const [state, setState] = useState<GiftState>({
    receivedGifts: [],
    unclaimedCount: { total: 0, condolence: 0, equipment: 0 },
    isLoading: true,
    error: null,
  })

  // 선물 목록 로드
  const loadGifts = useCallback(async () => {
    if (!user) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 받은 선물 로드 (미만료 + sender username 조인)
      const { data: receivedData, error: receivedError } = await supabase
        .from('gifts')
        .select(`
          *,
          sender:sender_id(username)
        `)
        .eq('receiver_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (receivedError) throw receivedError

      // GiftRow를 Gift로 변환
      const receivedGifts: Gift[] = (receivedData || []).map(row =>
        transformGiftRow(row as GiftRow)
      )

      // 미수령 카운트 계산
      const unclaimed = receivedGifts.filter(g => !g.isClaimed)
      const unclaimedCount: GiftCount = {
        total: unclaimed.length,
        condolence: unclaimed.filter(g => g.giftType === 'condolence').length,
        equipment: unclaimed.filter(g => g.giftType === 'equipment').length,
      }

      setState({
        receivedGifts,
        unclaimedCount,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      console.error('Failed to load gifts:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '선물 로드 실패',
      }))
    }
  }, [user])

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    if (!user) {
      setState({
        receivedGifts: [],
        unclaimedCount: { total: 0, condolence: 0, equipment: 0 },
        isLoading: false,
        error: null,
      })
      return
    }

    loadGifts()

    // 실시간 구독 (새 선물 알림)
    const channel = supabase
      .channel('gifts_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadGifts() // 새 선물 도착 시 새로고침
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadGifts])

  // 묵념 이미지 전송
  const sendCondolence = useCallback(async (
    request: SendCondolenceRequest
  ): Promise<boolean> => {
    if (!user) return false

    // 자기 자신에게 보내기 불가
    if (user.id === request.receiverId) {
      console.error('Cannot send to yourself')
      return false
    }

    try {
      const { error } = await supabase
        .from('gifts')
        .insert({
          sender_id: user.id,
          receiver_id: request.receiverId,
          gift_type: 'condolence',
          condolence_image_id: request.condolenceImageId,
          message: request.message || null,
          enhancement_history_id: request.enhancementHistoryId || null,
        })

      if (error) throw error
      return true
    } catch (err) {
      console.error('Failed to send condolence:', err)
      return false
    }
  }, [user])

  // 장비 선물 (RPC 함수 호출)
  const sendEquipment = useCallback(async (
    request: SendEquipmentRequest
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase.rpc('send_equipment_gift', {
        p_sender_id: user.id,
        p_receiver_id: request.receiverId,
        p_equipment_id: request.equipmentId,
        p_message: request.message || null,
      })

      if (error) throw error
      return !!data
    } catch (err) {
      console.error('Failed to send equipment:', err)
      return false
    }
  }, [user])

  // 선물 수령 (묵념 - 단순히 확인 처리)
  const claimCondolence = useCallback(async (giftId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('gifts')
        .update({ is_claimed: true, claimed_at: new Date().toISOString() })
        .eq('id', giftId)
        .eq('receiver_id', user.id)

      if (error) throw error

      // 로컬 상태 업데이트
      setState(prev => {
        const updated = prev.receivedGifts.map(g =>
          g.id === giftId ? { ...g, isClaimed: true, claimedAt: new Date() } : g
        )
        const unclaimed = updated.filter(g => !g.isClaimed)
        return {
          ...prev,
          receivedGifts: updated,
          unclaimedCount: {
            total: unclaimed.length,
            condolence: unclaimed.filter(g => g.giftType === 'condolence').length,
            equipment: unclaimed.filter(g => g.giftType === 'equipment').length,
          },
        }
      })

      return true
    } catch (err) {
      console.error('Failed to claim condolence:', err)
      return false
    }
  }, [user])

  // 장비 선물 수령 (RPC 함수 호출) - 인벤토리에 추가됨
  const claimEquipment = useCallback(async (
    giftId: string
  ): Promise<string | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase.rpc('claim_equipment_gift', {
        p_gift_id: giftId,
        p_user_id: user.id,
      })

      if (error) throw error

      // 로컬 상태 업데이트
      setState(prev => {
        const updated = prev.receivedGifts.map(g =>
          g.id === giftId ? { ...g, isClaimed: true, claimedAt: new Date() } : g
        )
        const unclaimed = updated.filter(g => !g.isClaimed)
        return {
          ...prev,
          receivedGifts: updated,
          unclaimedCount: {
            total: unclaimed.length,
            condolence: unclaimed.filter(g => g.giftType === 'condolence').length,
            equipment: unclaimed.filter(g => g.giftType === 'equipment').length,
          },
        }
      })

      return data as string // 새 equipment_id
    } catch (err) {
      console.error('Failed to claim equipment:', err)
      return null
    }
  }, [user])

  // 유저 검색 (장비 선물 시 사용)
  const searchUsers = useCallback(async (
    query: string
  ): Promise<UserSearchResult[]> => {
    if (!user || !query || query.length < 2) return []

    try {
      const { data, error } = await supabase.rpc('search_users_by_username', {
        p_query: query,
        p_exclude_user_id: user.id,
        p_limit: 10,
      })

      if (error) throw error

      return (data || []).map((row: { user_id: string; username: string }) => ({
        userId: row.user_id,
        username: row.username,
      }))
    } catch (err) {
      console.error('Failed to search users:', err)
      return []
    }
  }, [user])

  // 미수령 선물만 필터링
  const unclaimedGifts = state.receivedGifts.filter(g => !g.isClaimed)

  // 미수령 묵념만 필터링
  const unclaimedCondolences = unclaimedGifts.filter(g => g.giftType === 'condolence')

  // 미수령 장비만 필터링
  const unclaimedEquipments = unclaimedGifts.filter(g => g.giftType === 'equipment')

  return {
    ...state,
    unclaimedGifts,
    unclaimedCondolences,
    unclaimedEquipments,
    loadGifts,
    sendCondolence,
    sendEquipment,
    claimCondolence,
    claimEquipment,
    searchUsers,
  }
}
