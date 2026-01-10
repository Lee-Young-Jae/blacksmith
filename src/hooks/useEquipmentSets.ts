/**
 * 장비 세트 관리 훅
 *
 * 장비 착용 구성을 세트로 저장하고 빠르게 전환할 수 있습니다.
 * - 세트 1, 세트 2 두 개의 슬롯 제공
 * - DB에 저장되어 기기 간 동기화
 * - 삭제된 장비 등 예외 케이스 처리
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { EquipmentSlot } from '../types/equipment'

// =============================================
// 타입 정의
// =============================================

export interface EquipmentSet {
  setNumber: 1 | 2
  setName: string | null
  equipmentIds: Partial<Record<EquipmentSlot, string | null>>
  updatedAt: Date
}

interface LoadSetResult {
  success: boolean
  warning?: string
  error?: string
  missingSlots?: EquipmentSlot[]
  message: string
}

interface UseEquipmentSetsState {
  sets: EquipmentSet[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
}

interface UseEquipmentSetsReturn extends UseEquipmentSetsState {
  // 세트 조회
  getSet: (setNumber: 1 | 2) => EquipmentSet | undefined
  hasSet: (setNumber: 1 | 2) => boolean

  // 세트 저장/불러오기
  saveSet: (setNumber: 1 | 2, setName?: string) => Promise<boolean>
  loadSet: (setNumber: 1 | 2) => Promise<LoadSetResult>

  // 세트 관리
  deleteSet: (setNumber: 1 | 2) => Promise<boolean>
  renameSet: (setNumber: 1 | 2, newName: string) => Promise<boolean>

  // 새로고침
  refreshSets: () => Promise<void>
}

// =============================================
// 훅 구현
// =============================================

export function useEquipmentSets(): UseEquipmentSetsReturn {
  const { user } = useAuth()

  const [state, setState] = useState<UseEquipmentSetsState>({
    sets: [],
    isLoading: true,
    isSaving: false,
    error: null,
  })

  // =============================================
  // 세트 목록 로드
  // =============================================

  const loadSets = useCallback(async () => {
    if (!user) {
      setState({ sets: [], isLoading: false, isSaving: false, error: null })
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const { data, error } = await supabase.rpc('get_equipment_sets', {
        p_user_id: user.id,
      })

      if (error) throw error

      const sets: EquipmentSet[] = (data || []).map((row: {
        set_number: number
        set_name: string | null
        equipment_ids: Record<string, string | null>
        updated_at: string
      }) => ({
        setNumber: row.set_number as 1 | 2,
        setName: row.set_name,
        equipmentIds: row.equipment_ids as Partial<Record<EquipmentSlot, string | null>>,
        updatedAt: new Date(row.updated_at),
      }))

      setState({
        sets,
        isLoading: false,
        isSaving: false,
        error: null,
      })
    } catch (err) {
      console.error('Failed to load equipment sets:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '세트 로드 실패',
      }))
    }
  }, [user])

  // 초기 로드
  useEffect(() => {
    loadSets()
  }, [loadSets])

  // =============================================
  // 세트 조회 헬퍼
  // =============================================

  const getSet = useCallback((setNumber: 1 | 2): EquipmentSet | undefined => {
    return state.sets.find(s => s.setNumber === setNumber)
  }, [state.sets])

  const hasSet = useCallback((setNumber: 1 | 2): boolean => {
    const set = getSet(setNumber)
    if (!set) return false
    // 최소 1개 이상의 장비가 저장되어 있어야 함
    return Object.values(set.equipmentIds).some(id => id != null)
  }, [getSet])

  // =============================================
  // 세트 저장 (현재 착용 상태를 세트로 저장)
  // =============================================

  const saveSet = useCallback(async (setNumber: 1 | 2, setName?: string): Promise<boolean> => {
    if (!user) return false

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const { data, error } = await supabase.rpc('save_equipment_set', {
        p_user_id: user.id,
        p_set_number: setNumber,
        p_set_name: setName || null,
      })

      if (error) throw error

      // 로컬 상태 업데이트
      const newSet: EquipmentSet = {
        setNumber,
        setName: setName || null,
        equipmentIds: data as Partial<Record<EquipmentSlot, string | null>>,
        updatedAt: new Date(),
      }

      setState(prev => {
        const existingIndex = prev.sets.findIndex(s => s.setNumber === setNumber)
        let newSets: EquipmentSet[]

        if (existingIndex >= 0) {
          newSets = [...prev.sets]
          newSets[existingIndex] = newSet
        } else {
          newSets = [...prev.sets, newSet].sort((a, b) => a.setNumber - b.setNumber)
        }

        return {
          ...prev,
          sets: newSets,
          isSaving: false,
        }
      })

      return true
    } catch (err) {
      console.error('Failed to save equipment set:', err)
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err instanceof Error ? err.message : '세트 저장 실패',
      }))
      return false
    }
  }, [user])

  // =============================================
  // 세트 불러오기 (세트의 장비들을 일괄 착용)
  // =============================================

  const loadSet = useCallback(async (setNumber: 1 | 2): Promise<LoadSetResult> => {
    if (!user) {
      return { success: false, error: 'NOT_LOGGED_IN', message: '로그인이 필요합니다.' }
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const { data, error } = await supabase.rpc('load_equipment_set', {
        p_user_id: user.id,
        p_set_number: setNumber,
      })

      if (error) throw error

      const result = data as {
        success: boolean
        warning?: string
        error?: string
        missing_slots?: string[]
        message: string
      }

      setState(prev => ({ ...prev, isSaving: false }))

      return {
        success: result.success,
        warning: result.warning,
        error: result.error,
        missingSlots: result.missing_slots as EquipmentSlot[] | undefined,
        message: result.message,
      }
    } catch (err) {
      console.error('Failed to load equipment set:', err)
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err instanceof Error ? err.message : '세트 불러오기 실패',
      }))
      return {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : '세트 불러오기 실패',
      }
    }
  }, [user])

  // =============================================
  // 세트 삭제
  // =============================================

  const deleteSet = useCallback(async (setNumber: 1 | 2): Promise<boolean> => {
    if (!user) return false

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const { error } = await supabase.rpc('delete_equipment_set', {
        p_user_id: user.id,
        p_set_number: setNumber,
      })

      if (error) throw error

      setState(prev => ({
        ...prev,
        sets: prev.sets.filter(s => s.setNumber !== setNumber),
        isSaving: false,
      }))

      return true
    } catch (err) {
      console.error('Failed to delete equipment set:', err)
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err instanceof Error ? err.message : '세트 삭제 실패',
      }))
      return false
    }
  }, [user])

  // =============================================
  // 세트 이름 변경
  // =============================================

  const renameSet = useCallback(async (setNumber: 1 | 2, newName: string): Promise<boolean> => {
    if (!user) return false

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const { error } = await supabase.rpc('rename_equipment_set', {
        p_user_id: user.id,
        p_set_number: setNumber,
        p_new_name: newName,
      })

      if (error) throw error

      setState(prev => ({
        ...prev,
        sets: prev.sets.map(s =>
          s.setNumber === setNumber ? { ...s, setName: newName, updatedAt: new Date() } : s
        ),
        isSaving: false,
      }))

      return true
    } catch (err) {
      console.error('Failed to rename equipment set:', err)
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err instanceof Error ? err.message : '세트 이름 변경 실패',
      }))
      return false
    }
  }, [user])

  // =============================================
  // 반환
  // =============================================

  return {
    ...state,
    getSet,
    hasSet,
    saveSet,
    loadSet,
    deleteSet,
    renameSet,
    refreshSets: loadSets,
  }
}
