import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EnhancementFeedItem, EnhanceResult } from '../types/starforce'

interface RecentEnhancementRow {
  id: string
  username: string
  weapon_name: string
  from_level: number
  to_level: number
  result: string
  was_chance_time: boolean
  created_at: string
}

export function useLiveFeed() {
  const [items, setItems] = useState<EnhancementFeedItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 초기 데이터 로드 (RPC 함수 사용)
    const loadInitialData = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_recent_enhancements', { p_limit: 20 })

        if (error) {
          // RPC 함수가 없으면 뷰로 폴백
          console.warn('RPC not available, falling back to view:', error)
          const { data: viewData, error: viewError } = await supabase
            .from('recent_enhancements')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

          if (viewError) throw viewError

          if (viewData) {
            const typedData = viewData as unknown as RecentEnhancementRow[]
            setItems(typedData.map(row => ({
              id: row.id,
              username: row.username,
              weaponName: row.weapon_name,
              fromLevel: row.from_level,
              toLevel: row.to_level,
              result: row.result as EnhanceResult,
              wasChanceTime: row.was_chance_time,
              timestamp: new Date(row.created_at),
            })))
          }
        } else if (data) {
          const typedData = data as unknown as RecentEnhancementRow[]
          setItems(typedData.map(row => ({
            id: row.id,
            username: row.username,
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
          // 새 강화 기록이 추가되면 조인해서 가져오기
          const { data } = await supabase
            .from('recent_enhancements')
            .select('*')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            const typedData = data as unknown as RecentEnhancementRow
            const newItem: EnhancementFeedItem = {
              id: typedData.id,
              username: typedData.username,
              weaponName: typedData.weapon_name,
              fromLevel: typedData.from_level,
              toLevel: typedData.to_level,
              result: typedData.result as EnhanceResult,
              wasChanceTime: typedData.was_chance_time,
              timestamp: new Date(typedData.created_at),
            }

            setItems(prev => [newItem, ...prev.slice(0, 19)])
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { items, isConnected, error }
}
