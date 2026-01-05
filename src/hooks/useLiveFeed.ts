import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EnhancementFeedItem, EnhanceResult } from '../types/starforce'

interface EnhancementHistoryRow {
  id: string
  user_id: string
  weapon_name: string
  from_level: number
  to_level: number
  result: string
  was_chance_time: boolean
  created_at: string
  user_profiles: {
    username: string
  } | null
}

export function useLiveFeed() {
  const [items, setItems] = useState<EnhancementFeedItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 초기 데이터 로드 (직접 테이블 조회)
    const loadInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from('enhancement_history')
          .select(`
            id,
            user_id,
            weapon_name,
            from_level,
            to_level,
            result,
            was_chance_time,
            created_at,
            user_profiles (username)
          `)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error

        if (data) {
          const typedData = data as unknown as EnhancementHistoryRow[]
          console.log('📡 Loaded enhancement history:', typedData.length, 'items')
          setItems(typedData.map(row => ({
            id: row.id,
            userId: row.user_id,
            username: row.user_profiles?.username || '알 수 없음',
            weaponName: row.weapon_name,
            fromLevel: row.from_level,
            toLevel: row.to_level,
            result: row.result as EnhanceResult,
            wasChanceTime: row.was_chance_time,
            timestamp: new Date(row.created_at),
          })))
        }
        setIsConnected(true)
      } catch (err) {
        console.error('Failed to load feed:', err)
        setError('피드 로드 실패')
      }
    }

    loadInitialData()

    // 실시간 구독
    const channel = supabase
      .channel('enhancement_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'enhancement_history',
        },
        async (payload) => {
          console.log('🔔 New enhancement received:', payload.new)

          // 새 강화 기록이 추가되면 조인해서 가져오기
          const { data, error } = await supabase
            .from('enhancement_history')
            .select(`
              id,
              user_id,
              weapon_name,
              from_level,
              to_level,
              result,
              was_chance_time,
              created_at,
              user_profiles (username)
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            console.error('Failed to fetch new enhancement:', error)
            return
          }

          if (data) {
            const typedData = data as unknown as EnhancementHistoryRow
            const newItem: EnhancementFeedItem = {
              id: typedData.id,
              userId: typedData.user_id,
              username: typedData.user_profiles?.username || '알 수 없음',
              weaponName: typedData.weapon_name,
              fromLevel: typedData.from_level,
              toLevel: typedData.to_level,
              result: typedData.result as EnhanceResult,
              wasChanceTime: typedData.was_chance_time,
              timestamp: new Date(typedData.created_at),
            }

            console.log('📥 Adding to feed:', newItem)
            setItems(prev => [newItem, ...prev.slice(0, 19)])
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { items, isConnected, error }
}
