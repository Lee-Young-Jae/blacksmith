import { useState } from 'react'
import type { EquipmentSlot, UserEquipment, EquippedItems } from '../../types/equipment'
import {
  EQUIPMENT_SLOT_NAMES,
  EQUIPMENT_SLOT_EMOJIS,
  getEquipmentDisplayName,
} from '../../types/equipment'
import EquipmentDetail from './EquipmentDetail'
import EquipmentImage from './EquipmentImage'
import { GiChestArmor, GiSave } from 'react-icons/gi'
import { FaDownload, FaSave, FaTrash } from 'react-icons/fa'
import { useEquipmentSets } from '../../hooks/useEquipmentSets'

interface EquipmentSlotsProps {
  equipped: EquippedItems
  inventory: UserEquipment[]
  onEquip: (equipmentId: string) => Promise<boolean>
  onUnequip: (slot: EquipmentSlot) => Promise<boolean>
  onOpenInventory: (slot: EquipmentSlot) => void
  onRefreshEquipment?: () => Promise<void>  // 세트 불러오기 후 장비 상태 새로고침
}

export default function EquipmentSlots({
  equipped,
  inventory,
  onEquip,
  onUnequip,
  onOpenInventory,
  onRefreshEquipment,
}: EquipmentSlotsProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<UserEquipment | null>(null)
  const [activeSetMenu, setActiveSetMenu] = useState<1 | 2 | null>(null)
  const [setMessage, setSetMessage] = useState<{ type: 'success' | 'warning' | 'error', text: string } | null>(null)

  // 장비 세트 훅
  const {
    isLoading: setsLoading,
    isSaving,
    getSet,
    hasSet,
    saveSet,
    loadSet,
    deleteSet,
  } = useEquipmentSets()

  const handleSlotClick = (slot: EquipmentSlot) => {
    const equippedItem = equipped[slot]
    if (equippedItem) {
      setSelectedEquipment(equippedItem)
    } else {
      onOpenInventory(slot)
    }
  }

  // 세트 저장
  const handleSaveSet = async (setNumber: 1 | 2) => {
    const success = await saveSet(setNumber)
    if (success) {
      setSetMessage({ type: 'success', text: `세트 ${setNumber}에 저장했습니다.` })
    } else {
      setSetMessage({ type: 'error', text: '저장에 실패했습니다.' })
    }
    setActiveSetMenu(null)
    setTimeout(() => setSetMessage(null), 2000)
  }

  // 세트 불러오기
  const handleLoadSet = async (setNumber: 1 | 2) => {
    const result = await loadSet(setNumber)
    if (result.success) {
      if (result.warning) {
        setSetMessage({ type: 'warning', text: result.message })
      } else {
        setSetMessage({ type: 'success', text: `세트 ${setNumber}을 불러왔습니다.` })
      }
      // 장비 상태 새로고침
      if (onRefreshEquipment) {
        await onRefreshEquipment()
      }
    } else {
      setSetMessage({ type: 'error', text: result.message })
    }
    setActiveSetMenu(null)
    setTimeout(() => setSetMessage(null), 3000)
  }

  // 세트 삭제
  const handleDeleteSet = async (setNumber: 1 | 2) => {
    const success = await deleteSet(setNumber)
    if (success) {
      setSetMessage({ type: 'success', text: `세트 ${setNumber}을 삭제했습니다.` })
    } else {
      setSetMessage({ type: 'error', text: '삭제에 실패했습니다.' })
    }
    setActiveSetMenu(null)
    setTimeout(() => setSetMessage(null), 2000)
  }

  // 현재 착용 중인 장비가 있는지
  const hasEquippedItems = Object.values(equipped).some(e => e != null)

  return (
    <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
      <div className="p-4 border-b border-amber-700/30 bg-gradient-to-r from-amber-900/20 to-transparent">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-amber-100 flex items-center gap-2">
            <GiChestArmor className="text-xl text-amber-400" />
            장착 장비
          </h2>

          {/* 세트 버튼들 */}
          <div className="flex items-center gap-2">
            {[1, 2].map((num) => {
              const setNumber = num as 1 | 2
              const set = getSet(setNumber)
              const hasSavedSet = hasSet(setNumber)

              return (
                <div key={setNumber} className="relative">
                  <button
                    onClick={() => setActiveSetMenu(activeSetMenu === setNumber ? null : setNumber)}
                    disabled={setsLoading || isSaving}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                      hasSavedSet
                        ? 'bg-amber-600/80 text-white hover:bg-amber-500'
                        : 'bg-stone-700/60 text-amber-200/60 hover:bg-stone-600/60 hover:text-amber-100'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <GiSave className="text-sm" />
                    {set?.setName || `세트${setNumber}`}
                  </button>

                  {/* 드롭다운 메뉴 */}
                  {activeSetMenu === setNumber && (
                    <div className="absolute top-full right-0 mt-1 bg-stone-800 border border-amber-700/50 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
                      {hasSavedSet ? (
                        <>
                          <button
                            onClick={() => handleLoadSet(setNumber)}
                            disabled={isSaving}
                            className="w-full px-3 py-2 text-left text-sm text-amber-100 hover:bg-amber-700/30 flex items-center gap-2 transition-colors"
                          >
                            <FaDownload className="text-green-400" /> 불러오기
                          </button>
                          <button
                            onClick={() => handleSaveSet(setNumber)}
                            disabled={isSaving || !hasEquippedItems}
                            className="w-full px-3 py-2 text-left text-sm text-amber-100 hover:bg-amber-700/30 flex items-center gap-2 transition-colors disabled:opacity-50"
                          >
                            <FaSave className="text-blue-400" /> 덮어쓰기
                          </button>
                          <div className="border-t border-amber-700/30" />
                          <button
                            onClick={() => handleDeleteSet(setNumber)}
                            disabled={isSaving}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                          >
                            <FaTrash /> 삭제
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleSaveSet(setNumber)}
                          disabled={isSaving || !hasEquippedItems}
                          className="w-full px-3 py-2 text-left text-sm text-amber-100 hover:bg-amber-700/30 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <FaSave className="text-blue-400" /> 현재 장비 저장
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 메시지 표시 */}
        {setMessage && (
          <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs ${
            setMessage.type === 'success' ? 'bg-green-900/50 text-green-300' :
            setMessage.type === 'warning' ? 'bg-yellow-900/50 text-yellow-300' :
            'bg-red-900/50 text-red-300'
          }`}>
            {setMessage.text}
          </div>
        )}
      </div>

      {/* 메뉴 닫기용 오버레이 */}
      {activeSetMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveSetMenu(null)}
        />
      )}

      <div className="p-4">

      {/* 8 Equipment Slots Grid - 인체 실루엣 스타일 */}
      <div className="grid grid-cols-[repeat(3,4rem)] gap-2 w-fit mx-auto">
        {/* Row 1: 모자 (중앙) */}
        <div className="col-start-2 row-start-1">
          <EquipmentSlotBox
            slot="hat"
            equipment={equipped.hat}
            onClick={() => handleSlotClick('hat')}
          />
        </div>

        {/* Row 2: 귀걸이, 상의, 무기 */}
        <div className="col-start-1 row-start-2">
          <EquipmentSlotBox
            slot="earring"
            equipment={equipped.earring}
            onClick={() => handleSlotClick('earring')}
          />
        </div>
        <div className="col-start-2 row-start-2">
          <EquipmentSlotBox
            slot="top"
            equipment={equipped.top}
            onClick={() => handleSlotClick('top')}
          />
        </div>
        <div className="col-start-3 row-start-2">
          <EquipmentSlotBox
            slot="weapon"
            equipment={equipped.weapon}
            onClick={() => handleSlotClick('weapon')}
          />
        </div>

        {/* Row 3: 반지, 하의, 장갑 */}
        <div className="col-start-1 row-start-3">
          <EquipmentSlotBox
            slot="ring"
            equipment={equipped.ring}
            onClick={() => handleSlotClick('ring')}
          />
        </div>
        <div className="col-start-2 row-start-3">
          <EquipmentSlotBox
            slot="bottom"
            equipment={equipped.bottom}
            onClick={() => handleSlotClick('bottom')}
          />
        </div>
        <div className="col-start-3 row-start-3">
          <EquipmentSlotBox
            slot="gloves"
            equipment={equipped.gloves}
            onClick={() => handleSlotClick('gloves')}
          />
        </div>

        {/* Row 4: 신발 (중앙) */}
        <div className="col-start-2 row-start-4">
          <EquipmentSlotBox
            slot="shoes"
            equipment={equipped.shoes}
            onClick={() => handleSlotClick('shoes')}
          />
        </div>
      </div>
      </div>

      {/* Equipment Detail Modal - 대장간 테마 */}
      {selectedEquipment && (
        <EquipmentDetail
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onUnequip={async () => {
            const success = await onUnequip(selectedEquipment.equipmentBase.slot)
            if (success) setSelectedEquipment(null)
          }}
          inventory={inventory}
          onEquip={async (id) => {
            const success = await onEquip(id)
            if (success) setSelectedEquipment(null)
          }}
        />
      )}
    </div>
  )
}

interface EquipmentSlotBoxProps {
  slot: EquipmentSlot
  equipment?: UserEquipment
  onClick: () => void
  isLarge?: boolean
}

function EquipmentSlotBox({ slot, equipment, onClick, isLarge }: EquipmentSlotBoxProps) {
  const slotName = EQUIPMENT_SLOT_NAMES[slot]
  const slotEmoji = EQUIPMENT_SLOT_EMOJIS[slot]

  // isLarge: 너비는 동일(w-16), 높이만 크게(h-[4.5rem] ≈ 72px)
  const sizeClass = isLarge ? 'w-16 h-[4.5rem]' : 'w-16 h-16'

  if (!equipment) {
    // Empty slot
    return (
      <button
        onClick={onClick}
        className={`${sizeClass} item-slot border-dashed flex-col gap-1`}
      >
        <span className={`${isLarge ? 'text-2xl' : 'text-lg'} opacity-40`}>
          {slotEmoji}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{slotName}</span>
      </button>
    )
  }

  // Equipped item
  return (
    <button
      onClick={onClick}
      className={`${sizeClass} item-slot equipped flex-col relative`}
    >
      {/* Star level badge */}
      {equipment.starLevel > 0 && (
        <div className="star-badge">
          {equipment.starLevel}
        </div>
      )}

      <EquipmentImage equipment={equipment} size={isLarge ? 'lg' : 'md'} />

      <span className="text-[10px] text-[var(--color-text-primary)] truncate max-w-full px-1 mt-0.5">
        {getEquipmentDisplayName(equipment).split(' ')[0]}
      </span>
    </button>
  )
}
