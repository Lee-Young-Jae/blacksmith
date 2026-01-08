import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getEquipmentById, getRandomEquipmentBySlot, getRandomEquipment } from '../data/equipment'
import { generateInitialPotentials } from '../types/potential'
import type { PotentialTier, PotentialLine } from '../types/potential'
import { calculateEquipmentStats, calculatePercentPotentialBonus, getEquipmentSellPrice } from '../types/equipment'
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

// 파괴된 장비 정보 (복구용)
export interface DestroyedEquipment {
  id: string  // DB id
  equipment: UserEquipment
  destroyedAt: Date
  originalStarLevel: number
}

// DB Row 타입 (파괴된 장비)
interface DestroyedEquipmentRow {
  id: string
  user_id: string
  equipment_base_id: string
  original_star_level: number
  potentials_snapshot: PotentialLine[]
  destroyed_at: string
}

interface EquipmentState {
  inventory: UserEquipment[]
  equipped: EquippedItems
  destroyedEquipments: DestroyedEquipment[]  // 복구 가능한 파괴된 장비
  isLoading: boolean
  error: string | null
}

// 복구 기본 비용 (재료 장비 + 골드)
const RECOVERY_BASE_COST = 500

// 필요한 재료 개수 계산 (스타레벨 기반)
// ★0-5: 1개, ★6-10: 2개, ★11-15: 3개, ★16-20: 4개, ★21+: 5개
export function getRequiredMaterialCount(starLevel: number): number {
  if (starLevel <= 5) return 1
  if (starLevel <= 10) return 2
  if (starLevel <= 15) return 3
  if (starLevel <= 20) return 4
  return 5
}

export function useEquipment() {
  const { user } = useAuth()
  const [state, setState] = useState<EquipmentState>({
    inventory: [],
    equipped: {},
    destroyedEquipments: [],
    isLoading: true,
    error: null,
  })

  // 장비 데이터 로드
  useEffect(() => {
    if (!user) {
      setState({ inventory: [], equipped: {}, destroyedEquipments: [], isLoading: false, error: null })
      return
    }

    loadEquipment()
    loadDestroyedEquipments()
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

      // 모든 장비의 잠재옵션 로드 (URL 길이 제한으로 배치 처리)
      const equipmentIds = typedEquipment.map(e => e.id)
      let potentialsMap: Record<string, PotentialLine[]> = {}

      if (equipmentIds.length > 0) {
        // 50개씩 배치로 나누어 쿼리 (URL 길이 제한 방지)
        const BATCH_SIZE = 50
        const batches: string[][] = []
        for (let i = 0; i < equipmentIds.length; i += BATCH_SIZE) {
          batches.push(equipmentIds.slice(i, i + BATCH_SIZE))
        }

        // 모든 배치를 병렬로 쿼리
        const batchResults = await Promise.all(
          batches.map(batch =>
            supabase
              .from('equipment_potentials')
              .select('*')
              .in('equipment_id', batch)
          )
        )

        // 결과 병합
        for (const result of batchResults) {
          if (result.error) throw result.error

          const typedPotentials = (result.data || []) as PotentialRow[]

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

      setState(prev => ({
        inventory,
        equipped,
        destroyedEquipments: prev.destroyedEquipments,  // 복구 목록 유지
        isLoading: false,
        error: null,
      }))
    } catch (err) {
      console.error('Failed to load equipment:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '장비 로드 실패',
      }))
    }
  }, [user])

  // 파괴된 장비 로드 함수 (Supabase)
  const loadDestroyedEquipments = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('destroyed_equipment')
        .select('*')
        .eq('user_id', user.id)
        .order('destroyed_at', { ascending: false })

      if (error) throw error

      const typedData = (data || []) as DestroyedEquipmentRow[]

      const destroyedEquipments: DestroyedEquipment[] = typedData
        .map(row => {
          const equipmentBase = getEquipmentById(row.equipment_base_id)
          if (!equipmentBase) return null

          // 가상 UserEquipment 객체 생성 (복구 UI용)
          const equipment: UserEquipment = {
            id: row.id, // destroyed_equipment의 id 사용
            equipmentBaseId: row.equipment_base_id,
            equipmentBase,
            starLevel: row.original_star_level,
            consecutiveFails: 0,
            potentials: row.potentials_snapshot || [],
            isEquipped: false,
            createdAt: new Date(row.destroyed_at),
            updatedAt: new Date(row.destroyed_at),
          }

          return {
            id: row.id,
            equipment,
            destroyedAt: new Date(row.destroyed_at),
            originalStarLevel: row.original_star_level,
          }
        })
        .filter((item): item is DestroyedEquipment => item !== null)

      setState(prev => ({
        ...prev,
        destroyedEquipments,
      }))
    } catch (err) {
      console.error('Failed to load destroyed equipments:', err)
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

  // 장비 파괴 (강화 실패 시) - Supabase에 복구용 데이터 저장
  const destroyEquipment = useCallback(async (equipmentId: string): Promise<boolean> => {
    if (!user) return false

    const equipment = state.inventory.find(e => e.id === equipmentId)
    if (!equipment) return false

    // 잠재옵션이 해제된 슬롯이 있는지 확인
    const hasUnlockedPotentials = equipment.potentials.some(p => p.isUnlocked)

    try {
      // 장착 중이면 먼저 해제
      if (equipment.isEquipped) {
        const { error: unequipError } = await supabase
          .from('user_equipment')
          .update({ is_equipped: false, equipped_slot: null })
          .eq('id', equipmentId)

        if (unequipError) throw unequipError
      }

      // 잠재옵션이 해제된 장비만 destroyed_equipment에 저장
      if (hasUnlockedPotentials) {
        const { data: destroyedData, error: destroyedError } = await supabase
          .from('destroyed_equipment')
          .insert({
            user_id: user.id,
            equipment_base_id: equipment.equipmentBaseId,
            original_star_level: equipment.starLevel,
            potentials_snapshot: equipment.potentials,
          })
          .select()
          .single()

        if (destroyedError) throw destroyedError

        // 로컬 상태에 추가
        const newDestroyedItem: DestroyedEquipment = {
          id: destroyedData.id,
          equipment: { ...equipment, isEquipped: false },
          destroyedAt: new Date(),
          originalStarLevel: equipment.starLevel,
        }

        setState(prev => ({
          ...prev,
          destroyedEquipments: [newDestroyedItem, ...prev.destroyedEquipments].slice(0, 5),
        }))
      }

      // DB에서 장비 삭제
      const { error: deleteError } = await supabase
        .from('user_equipment')
        .delete()
        .eq('id', equipmentId)

      if (deleteError) throw deleteError

      setState(prev => {
        // 인벤토리에서 제거
        const newInventory = prev.inventory.filter(e => e.id !== equipmentId)

        // 장착 목록에서도 제거
        const slot = equipment.equipmentBase.slot
        const newEquipped = { ...prev.equipped }
        if (prev.equipped[slot]?.id === equipmentId) {
          delete newEquipped[slot]
        }

        return {
          ...prev,
          inventory: newInventory,
          equipped: newEquipped,
        }
      })

      return true
    } catch (err) {
      console.error('Failed to destroy equipment:', err)
      return false
    }
  }, [user, state.inventory])

  // 복구 비용 계산: 기본 1,000G + (해제된 슬롯 × 500G) + (원래 스타레벨 × 300G)
  // 재료로 동일 슬롯의 장비가 추가로 필요함
  const getRecoveryCost = useCallback((destroyed: DestroyedEquipment): number => {
    const unlockedSlots = destroyed.equipment.potentials.filter(p => p.isUnlocked).length
    const slotCost = unlockedSlots * 500
    const levelCost = destroyed.originalStarLevel * 300
    return RECOVERY_BASE_COST + slotCost + levelCost
  }, [])

  // 복구 가능한 재료 장비 조회 (동일 슬롯의 미장착 장비)
  const getRecoveryMaterials = useCallback((destroyed: DestroyedEquipment): UserEquipment[] => {
    const targetSlot = destroyed.equipment.equipmentBase.slot
    return state.inventory.filter(e =>
      e.equipmentBase.slot === targetSlot &&
      !e.isEquipped &&
      e.id !== destroyed.equipment.id  // 자기 자신은 제외 (혹시 남아있을 경우)
    )
  }, [state.inventory])

  // 장비 복구 (다중 재료 장비 + 골드 소모, ★1로 복구)
  const recoverEquipment = useCallback(async (
    destroyedId: string,
    materialEquipmentIds: string[]
  ): Promise<UserEquipment | null> => {
    if (!user) return null

    const destroyed = state.destroyedEquipments.find(d => d.id === destroyedId)
    if (!destroyed) return null

    // 필요한 재료 개수 확인
    const requiredCount = getRequiredMaterialCount(destroyed.originalStarLevel)
    if (materialEquipmentIds.length < requiredCount) return null

    // 재료 장비들 확인
    const targetSlot = destroyed.equipment.equipmentBase.slot
    const materials = materialEquipmentIds.map(id => state.inventory.find(e => e.id === id))

    // 모든 재료가 유효한지 확인
    for (const material of materials) {
      if (!material) return null
      if (material.equipmentBase.slot !== targetSlot) return null
      if (material.isEquipped) return null
    }

    try {
      // 1. 재료 장비들 삭제
      const { error: deleteError } = await supabase
        .from('user_equipment')
        .delete()
        .in('id', materialEquipmentIds)

      if (deleteError) throw deleteError

      // 2. DB에 장비 재생성 (★1로 복구)
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('user_equipment')
        .insert({
          user_id: user.id,
          equipment_base_id: destroyed.equipment.equipmentBaseId,
          star_level: 1,  // ★1로 복구
          consecutive_fails: 0,
          is_equipped: false,
          equipped_slot: null,
        })
        .select()
        .single()

      if (equipmentError) throw equipmentError

      const typedEquipment = equipmentData as UserEquipmentRow

      // 잠재옵션 복구 (원래 상태 그대로)
      const potentialInserts = destroyed.equipment.potentials.map((pot, index) => ({
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

      // 3. destroyed_equipment에서 삭제
      const { error: removeDestroyedError } = await supabase
        .from('destroyed_equipment')
        .delete()
        .eq('id', destroyedId)

      if (removeDestroyedError) throw removeDestroyedError

      const recoveredEquipment: UserEquipment = {
        id: typedEquipment.id,
        equipmentBaseId: destroyed.equipment.equipmentBaseId,
        equipmentBase: destroyed.equipment.equipmentBase,
        starLevel: 1,  // ★1로 복구
        consecutiveFails: 0,
        potentials: destroyed.equipment.potentials,
        isEquipped: false,
        createdAt: new Date(typedEquipment.created_at),
        updatedAt: new Date(typedEquipment.updated_at),
      }

      setState(prev => ({
        ...prev,
        // 재료 장비들 제거 + 복구된 장비 추가
        inventory: [recoveredEquipment, ...prev.inventory.filter(e => !materialEquipmentIds.includes(e.id))],
        destroyedEquipments: prev.destroyedEquipments.filter(d => d.id !== destroyedId),
      }))

      return recoveredEquipment
    } catch (err) {
      console.error('Failed to recover equipment:', err)
      return null
    }
  }, [user, state.destroyedEquipments, state.inventory])

  // 복구 목록에서 제거 (Supabase에서도 삭제)
  const removeFromDestroyedList = useCallback(async (destroyedId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('destroyed_equipment')
        .delete()
        .eq('id', destroyedId)

      if (error) throw error

      setState(prev => ({
        ...prev,
        destroyedEquipments: prev.destroyedEquipments.filter(d => d.id !== destroyedId),
      }))
    } catch (err) {
      console.error('Failed to remove from destroyed list:', err)
    }
  }, [user])

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

  // 장착 장비 총 스탯 계산 (2단계: 기본 스탯 합산 → % 공격력/방어력/HP 적용)
  const getEquippedStats = useCallback((): CharacterStats => {
    const equippedList = Object.values(state.equipped).filter((e): e is UserEquipment => !!e)

    // 1단계: 기본 스탯 + 스타포스 + 고정 잠재능력 + % critRate 등 합산
    const baseStatsList: CharacterStats[] = equippedList.map(e => calculateEquipmentStats(e))
    const totalBaseStats = mergeStats(...baseStatsList)

    // 2단계: % 공격력/방어력/HP 잠재능력을 총 기본 스탯 기준으로 적용
    let finalStats = { ...totalBaseStats }
    for (const equipment of equippedList) {
      const percentBonus = calculatePercentPotentialBonus(equipment, totalBaseStats)
      finalStats.attack += percentBonus.attack || 0
      finalStats.defense += percentBonus.defense || 0
      finalStats.hp += percentBonus.hp || 0
    }

    return finalStats
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
    destroyEquipment,
    recoverEquipment,
    getRecoveryCost,
    getRecoveryMaterials,
    removeFromDestroyedList,
    updateEquipment,
    updatePotentials,
    getEquippedStats,
    getTotalCombatPower,
    getInventoryBySlot,
    getEquipmentWithStats,
  }
}
