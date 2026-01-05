import { useState } from 'react'
import type { UserEquipment } from '../../types/equipment'
import type { DestroyedEquipment } from '../../hooks/useEquipment'
import { getRequiredMaterialCount } from '../../hooks/useEquipment'
import { getEquipmentDisplayName, EQUIPMENT_SLOT_NAMES, getEquipmentAtLevel } from '../../types/equipment'
import EquipmentImage from './EquipmentImage'

interface EquipmentRecoveryPanelProps {
  destroyedEquipments: DestroyedEquipment[]
  inventory: UserEquipment[]
  gold: number
  getRecoveryCost: (destroyed: DestroyedEquipment) => number
  getRecoveryMaterials: (destroyed: DestroyedEquipment) => UserEquipment[]
  onRecover: (destroyedId: string, materialIds: string[]) => Promise<void>
  onRemove: (destroyedId: string) => Promise<void>
}

export default function EquipmentRecoveryPanel({
  destroyedEquipments,
  gold,
  getRecoveryCost,
  getRecoveryMaterials,
  onRecover,
  onRemove,
}: EquipmentRecoveryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [isRecovering, setIsRecovering] = useState(false)

  const handleToggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setSelectedMaterials([])
    } else {
      setExpandedId(id)
      setSelectedMaterials([])
    }
  }

  const handleToggleMaterial = (materialId: string, requiredCount: number) => {
    setSelectedMaterials(prev => {
      if (prev.includes(materialId)) {
        return prev.filter(id => id !== materialId)
      }
      // 최대 필요 개수까지만 선택 가능
      if (prev.length >= requiredCount) {
        return prev
      }
      return [...prev, materialId]
    })
  }

  const handleRecover = async (destroyedId: string) => {
    setIsRecovering(true)
    try {
      await onRecover(destroyedId, selectedMaterials)
      setExpandedId(null)
      setSelectedMaterials([])
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--color-danger)]">파괴된 장비 복구</h3>
          <span className="text-xs text-[var(--color-text-muted)]">
            {destroyedEquipments.length}개
          </span>
        </div>
      </div>
      <div className="card-body py-2 space-y-2">
        <p className="text-xs text-[var(--color-text-secondary)]">
          동일 슬롯 장비 + 골드로 ★1 상태로 복구합니다. (잠재옵션 유지)
        </p>
        {destroyedEquipments.map((destroyed) => {
          const recoveryCost = getRecoveryCost(destroyed)
          const canAffordGold = gold >= recoveryCost
          const materials = getRecoveryMaterials(destroyed)
          const requiredCount = getRequiredMaterialCount(destroyed.originalStarLevel)
          const hasMaterials = materials.length >= requiredCount
          const unlockedCount = destroyed.equipment.potentials.filter(p => p.isUnlocked).length
          const isExpanded = expandedId === destroyed.id
          const slotName = EQUIPMENT_SLOT_NAMES[destroyed.equipment.equipmentBase.slot]

          return (
            <div
              key={destroyed.id}
              className="rounded-lg bg-[var(--color-bg-elevated-2)] overflow-hidden"
            >
              {/* 기본 정보 */}
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <EquipmentImage equipment={destroyed.equipment} size="md" />
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {getEquipmentDisplayName(destroyed.equipment)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      잠재옵션 {unlockedCount}개 | 원래 ★{destroyed.originalStarLevel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleExpand(destroyed.id)}
                    disabled={isRecovering}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      hasMaterials
                        ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80'
                        : 'bg-[var(--color-bg-elevated-1)] text-[var(--color-text-muted)] cursor-not-allowed'
                    }`}
                    title={!hasMaterials ? `${slotName} ${requiredCount}개 필요` : undefined}
                  >
                    {isExpanded ? '닫기' : hasMaterials ? `복구 (${requiredCount}개)` : `${slotName} ${requiredCount}개 필요`}
                  </button>
                  <button
                    onClick={() => onRemove(destroyed.id)}
                    className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] rounded"
                    title="영구 삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 확장된 재료 선택 UI */}
              {isExpanded && (
                <div className="px-2 pb-2 pt-1 border-t border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    재료로 사용할 {slotName} 장비 {requiredCount}개 선택 (소모됨):
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {materials.map(material => {
                      const isSelected = selectedMaterials.includes(material.id)
                      const canSelect = isSelected || selectedMaterials.length < requiredCount
                      return (
                        <button
                          key={material.id}
                          onClick={() => handleToggleMaterial(material.id, requiredCount)}
                          disabled={!canSelect}
                          className={`
                            flex-shrink-0 w-14 flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all
                            ${isSelected
                              ? 'bg-[var(--color-danger)]/20 ring-2 ring-[var(--color-danger)]'
                              : canSelect
                                ? 'bg-[var(--color-bg-elevated-3)] hover:bg-[var(--color-bg-elevated-1)]'
                                : 'bg-[var(--color-bg-elevated-3)] opacity-50 cursor-not-allowed'
                            }
                          `}
                        >
                          <div className="relative">
                            <EquipmentImage equipment={material} size="sm" />
                            {material.starLevel > 0 && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--color-accent)] text-black text-[7px] font-bold flex items-center justify-center">
                                {material.starLevel}
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-danger)] text-white text-[8px] font-bold flex items-center justify-center">
                                ✓
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] text-[var(--color-text-secondary)] truncate w-full text-center">
                            {getEquipmentAtLevel(material.equipmentBase, material.starLevel).name.split(' ')[0]}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* 선택 상태 및 복구 버튼 */}
                  <div className="mt-2 flex items-center justify-between p-2 rounded bg-[var(--color-bg-elevated-3)]">
                    <div className="text-xs">
                      <span className="text-[var(--color-text-secondary)]">
                        선택: {selectedMaterials.length}/{requiredCount}개
                      </span>
                      <span className="text-[var(--color-text-muted)] mx-2">|</span>
                      <span className="text-[var(--color-text-secondary)]">비용: </span>
                      <span className={canAffordGold ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}>
                        {recoveryCost.toLocaleString()}G
                      </span>
                    </div>
                    <button
                      onClick={() => handleRecover(destroyed.id)}
                      disabled={!canAffordGold || selectedMaterials.length < requiredCount || isRecovering}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg ${
                        canAffordGold && selectedMaterials.length >= requiredCount && !isRecovering
                          ? 'bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]/80'
                          : 'bg-[var(--color-bg-elevated-1)] text-[var(--color-text-muted)] cursor-not-allowed'
                      }`}
                    >
                      {isRecovering ? '복구 중...' : '★1 복구'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
