/**
 * 강화권 관리 훅
 *
 * 시즌 보상으로 받은 강화권을 조회하고 사용하는 기능 제공
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface EnhancementTicket {
  ticketLevel: number  // 강화권 레벨 (예: 17 = 17성 강화권)
  quantity: number     // 보유 개수
}

interface UseEnhancementTicketsReturn {
  tickets: EnhancementTicket[]
  isLoading: boolean
  error: string | null
  refreshTickets: () => Promise<void>
  useTicket: (ticketLevel: number) => Promise<boolean>
  getAvailableTicketsForLevel: (currentLevel: number) => EnhancementTicket[]
}

export function useEnhancementTickets(): UseEnhancementTicketsReturn {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<EnhancementTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 보유 강화권 목록 로드
  const refreshTickets = useCallback(async () => {
    if (!user) {
      setTickets([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase.rpc('get_user_enhancement_tickets', {
        p_user_id: user.id,
      })

      if (fetchError) throw fetchError

      setTickets((data || []).map((t: { ticket_level: number; quantity: number }) => ({
        ticketLevel: t.ticket_level,
        quantity: t.quantity,
      })))
    } catch (err) {
      console.error('Failed to load enhancement tickets:', err)
      setError('강화권 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // 초기 로드
  useEffect(() => {
    refreshTickets()
  }, [refreshTickets])

  // 강화권 사용 (DB에서 차감)
  const useTicket = useCallback(async (ticketLevel: number): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error: useError } = await supabase.rpc('use_enhancement_ticket', {
        p_user_id: user.id,
        p_ticket_level: ticketLevel,
      })

      if (useError) throw useError

      if (data === true) {
        // 사용 성공 - 로컬 상태 업데이트
        setTickets(prev => prev.map(t =>
          t.ticketLevel === ticketLevel
            ? { ...t, quantity: t.quantity - 1 }
            : t
        ).filter(t => t.quantity > 0))
        return true
      }

      return false
    } catch (err) {
      console.error('Failed to use enhancement ticket:', err)
      return false
    }
  }, [user])

  // 현재 레벨보다 높은 강화권만 필터링
  const getAvailableTicketsForLevel = useCallback((currentLevel: number): EnhancementTicket[] => {
    return tickets.filter(t => t.ticketLevel > currentLevel && t.quantity > 0)
  }, [tickets])

  return {
    tickets,
    isLoading,
    error,
    refreshTickets,
    useTicket,
    getAvailableTicketsForLevel,
  }
}
