import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getEquipmentById, getRandomEquipmentBySlot, getRandomEquipment } from '../data/equipment'
import { generateInitialPotentials } from '../types/potential'
import type { PotentialTier, PotentialLine } from '../types/potential'
import { calculateEquipmentStats, getEquipmentSellPrice } from '../types/equipment'
import type {
  UserEquipment,
  EquipmentBase,
  EquipmentSlot,
  EquippedItems,
  EquipmentWithStats,
} from '../types/equipment'
import type { CharacterStats } from '../types/stats'
import { mergeStats, calculateCombatPower } from '../types/stats'

// DB Row 타입
interface UserEquipmentRow {
  id: string
  user_id: string
  equipment_base_id: string
  star_level: number
  consecutive_fails: number
  is_equipped: boolean
  equipped_slot: EquipmentSlot | null
  created_at: string
  updated_at: string
}

interface PotentialRow {
  id: string
  equipment_id: string
  line_index: number
  stat_type: keyof CharacterStats
  stat_value: number
  is_percentage: boolean
  tier: PotentialTier
  is_locked: boolean
  is_unlocked: boolean
}

interface EquipmentState {
  inventory: UserEquipment[]
  equipped: EquippedItems
  isLoading: boolean
  error: string | null
}

export function useEquipment() {
  const { user } = useAuth()
  const [state, setState] = useState<EquipmentState>({
    inventory: [],
    equipped: {},
    isLoading: true,
    error: null,
  })

  // 장비 데이터 로드
  useEffect(() => {
    if (!user) {
      setState({ inventory: [], equipped: {}, isLoading: false, error: null })
      return
    }

    loadEquipment()
  }, [user])

  // 장비 로드 함수
  const loadEquipment = useCallback(async () => {
    if (!user) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 유저의 모든 장비 로드
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('user_equipment')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (equipmentError) throw equipmentError

      const typedEquipment = (equipmentData || []) as UserEquipmentRow[]

      // 모든 장비의 잠재옵션 로드
      const equipmentIds = typedEquipment.map(e => e.id)
      let potentialsMap: Record<string, PotentialLine[]> = {}

      if (equipmentIds.length > 0) {
        const { data: potentialsData, error: potentialsError } = await supabase
          .from('equipment_potentials')
          .select('*')
          .in('equipment_id', equipmentIds)

        if (potentialsError) throw potentialsError

        const typedPotentials = (potentialsData || []) as PotentialRow[]

        // 장비별로 잠재옵션 그룹화
        for (const pot of typedPotentials) {
          if (!potentialsMap[pot.equipment_id]) {
            potentialsMap[pot.equipment_id] = []
          }
          potentialsMap[pot.equipment_id].push({
            stat: pot.stat_type,
            value: pot.stat_value,
            isPercentage: pot.is_percentage,
            tier: pot.tier,
            isLocked: pot.is_locked,
            isUnlocked: pot.is_unlocked,
          })
        }
      }

      // UserEquipment 객체로 변환
      const inventory: UserEquipment[] = []
      const equipped: EquippedItems = {}

      for (const row of typedEquipment) {
        const equipmentBase = getEquipmentById(row.equipment_base_id)
        if (!equipmentBase) continue

        const equipment: UserEquipment = {
          id: row.id,
          equipmentBaseId: row.equipment_base_id,
          equipmentBase,
          starLevel: row.star_level,
          consecutiveFails: row.consecutive_fails,
          potentials: potentialsMap[row.id] || [],
          isEquipped: row.is_equipped,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }

        inventory.push(equipment)

        if (row.is_equipped && row.equipped_slot) {
          equipped[row.equipped_slot] = equipment
        }
      }

      setState({
        inventory,
        equipped,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      console.error('Failed to load equipment:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '장비 로드 실패',
      }))
    }
  }, [user])

  // 새 장비 획득 (가챠용)
  const acquireEquipment = useCallback(async (
    equipmentBase: EquipmentBase
  ): Promise<UserEquipment | null> => {
    if (!user) return null

    try {
      // DB에 장비 생성
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('user_equipment')
        .insert({
          user_id: user.id,
          equipment_base_id: equipmentBase.id,
          star_level: 0,
          consecutive_fails: 0,
          is_equipped: false,
          equipped_slot: null,
        })
        .select()
        .single()

      if (equipmentError) throw equipmentError

      const typedEquipment = equipmentData as UserEquipmentRow

      // 초기 잠재옵션 생성 (모든 슬롯 잠김 상태)
      const potentials = generateInitialPotentials(equipmentBase.potentialSlots || 3)
      const potentialInserts = potentials.map((pot, index) => ({
        equipment_id: typedEquipment.id,
        line_index: index,
        stat_type: pot.stat,
        stat_value: pot.value,
        is_percentage: pot.isPercentage,
        tier: pot.tier,
        is_locked: pot.isLocked,
        is_unlocked: pot.isUnlocked,
      }))

      if (potentialInserts.length > 0) {
        const { error: potentialsError } = await supabase
          .from('equipment_potentials')
          .insert(potentialInserts)

        if (potentialsError) throw potentialsError
      }

      const newEquipment: UserEquipment = {
        id: typedEquipment.id,
        equipmentBaseId: equipmentBase.id,
        equipmentBase,
        starLevel: 0,
        consecutiveFails: 0,
        potentials,
        isEquipped: false,
        createdAt: new Date(typedEquipment.created_at),
        updatedAt: new Date(typedEquipment.updated_at),
      }

      setState(prev => ({
        ...prev,
        inventory: [newEquipment, ...prev.inventory],
      }))

      return newEquipment
    } catch (err) {
      console.error('Failed to acquire equipment:', err)
      return null
    }
  }, [user])

  // 랜덤 장비 획득
  const acquireRandomEquipment = useCallback(async (
    slot?: EquipmentSlot
  ): Promise<UserEquipment | null> => {
    const equipmentBase = slot
      ? getRandomEquipmentBySlot(slot)
      : getRandomEquipment()
    return acquireEquipment(equipmentBase)
  }, [acquireEquipment])

  // 장비 장착
  const equipItem = useCallback(async (equipmentId: string): Promise<boolean> => {
    if (!user) return false

    const equipment = state.inventory.find(e => e.id === equipmentId)
    if (!equipment) return false

    const slot = equipment.equipmentBase.slot

    try {
      // 기존 장착 해제
      const currentEquipped = state.equipped[slot]
      if (currentEquipped) {
        const { error: unequipError } = await supabase
          .from('user_equipment')
          .update({ is_equipped: false, equipped_slot: null })
          .eq('id', currentEquipped.id)

        if (unequipError) throw unequipError
      }

      // 새 장비 장착
      const { error: equipError } = await supabase
        .from('user_equipment')
        .update({ is_equipped: true, equipped_slot: slot })
        .eq('id', equipmentId)

      if (equipError) throw equipError

      setState(prev => {
        const newInventory = prev.inventory.map(e => {
          if (e.id === equipmentId) {
            return { ...e, isEquipped: true }
          }
          if (currentEquipped && e.id === currentEquipped.id) {
            return { ...e, isEquipped: false }
          }
          return e
        })

        return {
          ...prev,
          inventory: newInventory,
          equipped: {
            ...prev.equipped,
            [slot]: equipment,
          },
        }
      })

      return true
    } catch (err) {
      console.error('Failed to equip item:', err)
      return false
    }
  }, [user, state.inventory, state.equipped])

  // 장비 해제
  const unequipItem = useCallback(async (slot: EquipmentSlot): Promise<boolean> => {
    if (!user) return false

    const equipment = state.equipped[slot]
    if (!equipment) return false

    try {
      const { error } = await supabase
        .from('user_equipment')
        .update({ is_equipped: false, equipped_slot: null })
        .eq('id', equipment.id)

      if (error) throw error

      setState(prev => {
        const newInventory = prev.inventory.map(e =>
          e.id === equipment.id ? { ...e, isEquipped: false } : e
        )

        const newEquipped = { ...prev.equipped }
        delete newEquipped[slot]

        return {
          ...prev,
          inventory: newInventory,
          equipped: newEquipped,
        }
      })

      return true
    } catch (err) {
      console.error('Failed to unequip item:', err)
      return false
    }
  }, [user, state.equipped])

  // 장비 판매
  const sellEquipment = useCallback(async (equipmentId: string): Promise<number> => {
    if (!user) return 0

    const equipment = state.inventory.find(e => e.id === equipmentId)
    if (!equipment) return 0

    // 장착 중인 장비는 판매 불가
    if (equipment.isEquipped) return 0

    const sellPrice = getEquipmentSellPrice(equipment)

    try {
      // 장비 삭제
      const { error: deleteError } = await supabase
        .from('user_equipment')
        .delete()
        .eq('id', equipmentId)

      if (deleteError) throw deleteError

      setState(prev => ({
        ...prev,
        inventory: prev.inventory.filter(e => e.id !== equipmentId),
      }))

      return sellPrice
    } catch (err) {
      console.error('Failed to sell equipment:', err)
      return 0
    }
  }, [user, state.inventory])

  // 장비 업데이트 (강화 후)
  const updateEquipment = useCallback(async (
    equipmentId: string,
    updates: Partial<Pick<UserEquipment, 'starLevel' | 'consecutiveFails'>>
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const dbUpdates: Record<string, unknown> = {}

      if (updates.starLevel !== undefined) {
        dbUpdates.star_level = updates.starLevel
      }
      if (updates.consecutiveFails !== undefined) {
        dbUpdates.consecutive_fails = updates.consecutiveFails
      }

      const { error } = await supabase
        .from('user_equipment')
        .update(dbUpdates)
        .eq('id', equipmentId)

      if (error) throw error

      setState(prev => {
        const newInventory = prev.inventory.map(e =>
          e.id === equipmentId ? { ...e, ...updates } : e
        )

        const newEquipped = { ...prev.equipped }
        for (const slot of Object.keys(newEquipped) as EquipmentSlot[]) {
          if (newEquipped[slot]?.id === equipmentId) {
            newEquipped[slot] = { ...newEquipped[slot]!, ...updates }
          }
        }

        return {
          ...prev,
          inventory: newInventory,
          equipped: newEquipped,
        }
      })

      return true
    } catch (err) {
      console.error('Failed to update equipment:', err)
      return false
    }
  }, [user])

  // 잠재옵션 업데이트
  const updatePotentials = useCallback(async (
    equipmentId: string,
    potentials: PotentialLine[]
  ): Promise<boolean> => {
    if (!user) return false

    try {
      // 기존 잠재옵션 삭제
      const { error: deleteError } = await supabase
        .from('equipment_potentials')
        .delete()
        .eq('equipment_id', equipmentId)

      if (deleteError) throw deleteError

      // 새 잠재옵션 추가
      const potentialInserts = potentials.map((pot, index) => ({
        equipment_id: equipmentId,
        line_index: index,
        stat_type: pot.stat,
        stat_value: pot.value,
        is_percentage: pot.isPercentage,
        tier: pot.tier,
        is_locked: pot.isLocked,
        is_unlocked: pot.isUnlocked,
      }))

      if (potentialInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('equipment_potentials')
          .insert(potentialInserts)

        if (insertError) throw insertError
      }

      setState(prev => {
        const newInventory = prev.inventory.map(e =>
          e.id === equipmentId ? { ...e, potentials } : e
        )

        const newEquipped = { ...prev.equipped }
        for (const slot of Object.keys(newEquipped) as EquipmentSlot[]) {
          if (newEquipped[slot]?.id === equipmentId) {
            newEquipped[slot] = { ...newEquipped[slot]!, potentials }
          }
        }

        return {
          ...prev,
          inventory: newInventory,
          equipped: newEquipped,
        }
      })

      return true
    } catch (err) {
      console.error('Failed to update potentials:', err)
      return false
    }
  }, [user])

  // 장착 장비 총 스탯 계산
  const getEquippedStats = useCallback((): CharacterStats => {
    const statsList: CharacterStats[] = []

    for (const equipment of Object.values(state.equipped)) {
      if (equipment) {
        statsList.push(calculateEquipmentStats(equipment))
      }
    }

    return mergeStats(...statsList)
  }, [state.equipped])

  // 총 전투력 계산
  const getTotalCombatPower = useCallback((): number => {
    const stats = getEquippedStats()
    return calculateCombatPower(stats)
  }, [getEquippedStats])

  // 슬롯별 인벤토리 필터
  const getInventoryBySlot = useCallback((slot: EquipmentSlot): UserEquipment[] => {
    return state.inventory.filter(e => e.equipmentBase.slot === slot)
  }, [state.inventory])

  // 장비 스탯과 함께 반환
  const getEquipmentWithStats = useCallback((equipment: UserEquipment): EquipmentWithStats => {
    const calculatedStats = calculateEquipmentStats(equipment)
    const combatPower = calculateCombatPower(calculatedStats)
    return {
      ...equipment,
      calculatedStats,
      combatPower,
    }
  }, [])

  return {
    ...state,
    loadEquipment,
    acquireEquipment,
    acquireRandomEquipment,
    equipItem,
    unequipItem,
    sellEquipment,
    updateEquipment,
    updatePotentials,
    getEquippedStats,
    getTotalCombatPower,
    getInventoryBySlot,
    getEquipmentWithStats,
  }
}
