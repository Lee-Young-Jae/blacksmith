import type { UserEquipment } from '../../types/equipment'
import {
  EQUIPMENT_SLOT_NAMES,
  getEquipmentDisplayName,
  calculateEquipmentStats,
} from '../../types/equipment'
import {
  POTENTIAL_TIER_COLORS,
  POTENTIAL_TIER_NAMES,
  getUnlockedSlotCount,
} from '../../types/potential'
import { calculateCombatPower } from '../../types/stats'
import EquipmentImage from './EquipmentImage'

interface EquipmentCardProps {
  equipment: UserEquipment
  onClick?: () => void
  isSelected?: boolean
  showStats?: boolean
  compact?: boolean
}

// 가장 높은 잠재옵션 등급 가져오기
function getBestPotentialTier(equipment: UserEquipment): string | null {
  const unlockedPotentials = equipment.potentials.filter(p => p.isUnlocked)
  if (unlockedPotentials.length === 0) return null

  const tierOrder = ['legendary', 'unique', 'epic', 'rare', 'common']
  for (const tier of tierOrder) {
    if (unlockedPotentials.some(p => p.tier === tier)) {
      return tier
    }
  }
  return null
}

export default function EquipmentCard({
  equipment,
  onClick,
  isSelected,
  showStats = false,
  compact = false,
}: EquipmentCardProps) {
  const { equipmentBase, starLevel, potentials, isEquipped } = equipment
  const displayName = getEquipmentDisplayName(equipment)
  const unlockedCount = getUnlockedSlotCount(potentials)
  const bestTier = getBestPotentialTier(equipment)

  const stats = calculateEquipmentStats(equipment)
  const combatPower = calculateCombatPower(stats)

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          w-full flex items-center gap-2 p-2 rounded-lg transition-all
          bg-gray-700/50 border border-gray-600
          ${isSelected ? 'ring-2 ring-blue-400' : ''}
          ${onClick ? 'hover:scale-[1.02] cursor-pointer' : ''}
        `}
      >
        <EquipmentImage equipment={equipment} size="lg" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {displayName}
          </div>
          <div className="text-xs text-gray-400">
            {EQUIPMENT_SLOT_NAMES[equipmentBase.slot]}
          </div>
        </div>
        {isEquipped && (
          <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
            장착
          </span>
        )}
        <div className="text-xs text-yellow-400 font-bold">
          CP {combatPower.toLocaleString()}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-lg transition-all
        bg-gray-700/50 border border-gray-600
        ${isSelected ? 'ring-2 ring-blue-400' : ''}
        ${onClick ? 'hover:scale-[1.02] cursor-pointer' : ''}
      `}
    >
      {/* Header: Image + Name + Star */}
      <div className="flex items-center gap-2 mb-2">
        <EquipmentImage equipment={equipment} size="xl" />
        <div className="flex-1 text-left min-w-0">
          <div className="font-bold text-white truncate">
            {displayName}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">
              {EQUIPMENT_SLOT_NAMES[equipmentBase.slot]}
            </span>
          </div>
        </div>
        {isEquipped && (
          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
            장착중
          </span>
        )}
      </div>

      {/* Star Level */}
      {starLevel > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-yellow-400 text-sm">★</span>
          <span className="text-yellow-400 text-sm font-bold">{starLevel}</span>
        </div>
      )}

      {/* Potential Info */}
      <div className="text-xs mb-2">
        {unlockedCount > 0 ? (
          <span className={bestTier ? POTENTIAL_TIER_COLORS[bestTier as keyof typeof POTENTIAL_TIER_COLORS] : 'text-gray-400'}>
            잠재옵션 {unlockedCount}/3 해제
            {bestTier && ` (${POTENTIAL_TIER_NAMES[bestTier as keyof typeof POTENTIAL_TIER_NAMES]})`}
          </span>
        ) : (
          <span className="text-gray-500">잠재옵션 잠김</span>
        )}
      </div>

      {/* Stats (optional) */}
      {showStats && (
        <div className="grid grid-cols-2 gap-1 text-xs border-t border-gray-600 pt-2 mt-2">
          {stats.attack > 0 && (
            <div className="text-red-400">공격력 +{stats.attack}</div>
          )}
          {stats.defense > 0 && (
            <div className="text-blue-400">방어력 +{stats.defense}</div>
          )}
          {stats.hp > 0 && (
            <div className="text-green-400">HP +{stats.hp}</div>
          )}
          {stats.critRate > 0 && (
            <div className="text-yellow-400">치명타 +{stats.critRate}%</div>
          )}
          {stats.critDamage > 0 && (
            <div className="text-orange-400">치명타 뎀 +{stats.critDamage}%</div>
          )}
          {stats.penetration > 0 && (
            <div className="text-purple-400">관통력 +{stats.penetration}%</div>
          )}
        </div>
      )}

      {/* Combat Power */}
      <div className="text-right mt-2">
        <span className="text-xs text-gray-400">전투력 </span>
        <span className="text-yellow-400 font-bold">{combatPower.toLocaleString()}</span>
      </div>
    </button>
  )
}
