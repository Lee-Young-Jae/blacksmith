import { useState } from 'react'
import type { EquipmentSlot, UserEquipment, EquippedItems } from '../../types/equipment'
import {
  EQUIPMENT_SLOT_NAMES,
  EQUIPMENT_SLOT_EMOJIS,
  getEquipmentDisplayName,
} from '../../types/equipment'
import EquipmentDetail from './EquipmentDetail'
import EquipmentImage from './EquipmentImage'

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
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🛡️</span>
        장착 장비
      </h2>

      {/* 7 Equipment Slots Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Top row: hat, top, weapon */}
        <div className="col-start-2">
          <EquipmentSlotBox
            slot="hat"
            equipment={equipped.hat}
            onClick={() => handleSlotClick('hat')}
          />
        </div>
        <div className="col-start-3 row-start-1 row-span-2 flex items-center">
          <EquipmentSlotBox
            slot="weapon"
            equipment={equipped.weapon}
            onClick={() => handleSlotClick('weapon')}
            isLarge
          />
        </div>

        {/* Second row: earring, top */}
        <div className="col-start-1">
          <EquipmentSlotBox
            slot="earring"
            equipment={equipped.earring}
            onClick={() => handleSlotClick('earring')}
          />
        </div>
        <div className="col-start-2">
          <EquipmentSlotBox
            slot="top"
            equipment={equipped.top}
            onClick={() => handleSlotClick('top')}
          />
        </div>

        {/* Third row: gloves, bottom */}
        <div className="col-start-1">
          <EquipmentSlotBox
            slot="gloves"
            equipment={equipped.gloves}
            onClick={() => handleSlotClick('gloves')}
          />
        </div>
        <div className="col-start-2">
          <EquipmentSlotBox
            slot="bottom"
            equipment={equipped.bottom}
            onClick={() => handleSlotClick('bottom')}
          />
        </div>
        <div className="col-start-3">
          <EquipmentSlotBox
            slot="shoes"
            equipment={equipped.shoes}
            onClick={() => handleSlotClick('shoes')}
          />
        </div>
      </div>

      {/* Equipment Detail Modal */}
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

  if (!equipment) {
    // Empty slot
    return (
      <button
        onClick={onClick}
        className={`
          ${isLarge ? 'w-20 h-24' : 'w-16 h-16'}
          bg-gray-700/50 border-2 border-dashed border-gray-600
          rounded-lg flex flex-col items-center justify-center
          hover:border-gray-500 hover:bg-gray-700 transition-all
          cursor-pointer
        `}
      >
        <span className={`${isLarge ? 'text-2xl' : 'text-xl'} opacity-50`}>
          {slotEmoji}
        </span>
        <span className="text-xs text-gray-500 mt-1">{slotName}</span>
      </button>
    )
  }

  // Equipped item
  return (
    <button
      onClick={onClick}
      className={`
        ${isLarge ? 'w-20 h-24' : 'w-16 h-16'}
        bg-gray-700/50 border border-gray-600
        rounded-lg flex flex-col items-center justify-center
        hover:scale-105 transition-all cursor-pointer
        relative overflow-hidden
      `}
    >
      {/* Star level badge */}
      {equipment.starLevel > 0 && (
        <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-1 rounded-bl">
          {equipment.starLevel}
        </div>
      )}

      <EquipmentImage equipment={equipment} size={isLarge ? 'lg' : 'md'} />

      <span className="text-[10px] text-white truncate max-w-full px-1">
        {getEquipmentDisplayName(equipment).split(' ')[0]}
      </span>
    </button>
  )
}
