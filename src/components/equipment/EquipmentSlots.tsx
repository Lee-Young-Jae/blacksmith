import { useState } from 'react'
import type { EquipmentSlot, UserEquipment, EquippedItems } from '../../types/equipment'
import {
  EQUIPMENT_SLOT_NAMES,
  EQUIPMENT_SLOT_EMOJIS,
  getEquipmentDisplayName,
} from '../../types/equipment'
import EquipmentDetail from './EquipmentDetail'
import EquipmentImage from './EquipmentImage'
import { GiChestArmor } from 'react-icons/gi'

interface EquipmentSlotsProps {
  equipped: EquippedItems
  inventory: UserEquipment[]
  onEquip: (equipmentId: string) => Promise<boolean>
  onUnequip: (slot: EquipmentSlot) => Promise<boolean>
  onOpenInventory: (slot: EquipmentSlot) => void
}

export default function EquipmentSlots({
  equipped,
  inventory,
  onEquip,
  onUnequip,
  onOpenInventory,
}: EquipmentSlotsProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<UserEquipment | null>(null)

  const handleSlotClick = (slot: EquipmentSlot) => {
    const equippedItem = equipped[slot]
    if (equippedItem) {
      setSelectedEquipment(equippedItem)
    } else {
      onOpenInventory(slot)
    }
  }

  return (
    <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
      <div className="p-4 border-b border-amber-700/30 bg-gradient-to-r from-amber-900/20 to-transparent">
        <h2 className="text-base font-bold text-amber-100 flex items-center gap-2">
          <GiChestArmor className="text-xl text-amber-400" />
          장착 장비
        </h2>
      </div>
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
