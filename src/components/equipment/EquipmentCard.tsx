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
          list-item w-full min-h-[56px]
          ${isSelected ? 'ring-2 ring-[var(--color-primary)]' : ''}
        `}
      >
        <EquipmentImage equipment={equipment} size="lg" />
        <div className="list-item-content">
          <span className="list-item-title">{displayName}</span>
          <span className="list-item-subtitle">{EQUIPMENT_SLOT_NAMES[equipmentBase.slot]}</span>
        </div>
        {isEquipped && (
          <span className="badge badge-success">장착</span>
        )}
        <div className="text-xs text-[var(--color-accent)] font-bold">
          CP {combatPower.toLocaleString()}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 sm:p-4 rounded-xl transition-all min-h-[80px]
        bg-[var(--color-bg-elevated-1)] border border-[var(--color-border)]
        ${isSelected ? 'ring-2 ring-[var(--color-primary)]' : ''}
        ${onClick ? 'hover:bg-[var(--color-bg-elevated-2)] active:scale-[0.98] cursor-pointer' : ''}
      `}
    >
      {/* Header: Image + Name + Star */}
      <div className="flex items-center gap-3 mb-2">
        <EquipmentImage equipment={equipment} size="xl" />
        <div className="flex-1 text-left min-w-0">
          <div className="font-bold text-[var(--color-text-primary)] truncate">
            {displayName}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--color-text-secondary)]">
              {EQUIPMENT_SLOT_NAMES[equipmentBase.slot]}
            </span>
            {starLevel > 0 && (
              <span className="text-[var(--color-accent)] font-bold">★{starLevel}</span>
            )}
          </div>
        </div>
        {isEquipped && (
          <span className="badge badge-success">장착중</span>
        )}
      </div>

      {/* Potential Info */}
      <div className="text-xs mb-2">
        {unlockedCount > 0 ? (
          <span className={bestTier ? POTENTIAL_TIER_COLORS[bestTier as keyof typeof POTENTIAL_TIER_COLORS] : 'text-[var(--color-text-secondary)]'}>
            잠재옵션 {unlockedCount}/3
            {bestTier && ` (${POTENTIAL_TIER_NAMES[bestTier as keyof typeof POTENTIAL_TIER_NAMES]})`}
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)]">잠재옵션 잠김</span>
        )}
      </div>

      {/* Stats (optional) */}
      {showStats && (
        <div className="grid grid-cols-2 gap-1 text-xs border-t border-[var(--color-border)] pt-2 mt-2">
          {stats.attack > 0 && (
            <div className="text-[var(--color-danger)]">공격력 +{stats.attack}</div>
          )}
          {stats.defense > 0 && (
            <div className="text-[var(--color-primary)]">방어력 +{stats.defense}</div>
          )}
          {stats.hp > 0 && (
            <div className="text-[var(--color-success)]">HP +{stats.hp}</div>
          )}
          {stats.critRate > 0 && (
            <div className="text-[var(--color-accent)]">치명타 +{stats.critRate}%</div>
          )}
          {stats.critDamage > 0 && (
            <div className="text-orange-400">치명타 뎀 +{stats.critDamage}%</div>
          )}
          {stats.penetration > 0 && (
            <div className="text-[var(--color-magic)]">관통력 +{stats.penetration}%</div>
          )}
          {stats.attackSpeed > 0 && (
            <div className="text-cyan-400">공격속도 +{stats.attackSpeed}%</div>
          )}
          {stats.evasion > 0 && (
            <div className="text-emerald-400">회피율 +{stats.evasion}%</div>
          )}
        </div>
      )}

      {/* Combat Power */}
      <div className="text-right mt-2">
        <span className="text-xs text-[var(--color-text-muted)]">전투력 </span>
        <span className="text-[var(--color-accent)] font-bold">{combatPower.toLocaleString()}</span>
      </div>
    </button>
  )
}
