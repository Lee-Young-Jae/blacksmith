import EquipmentImage from './EquipmentImage'
import type { UserEquipment } from '../../types/equipment'
import {
  getEquipmentName,
  getLevelTier,
  LEVEL_TIER_COLORS,
  LEVEL_TIER_NAMES,
  EQUIPMENT_SLOT_NAMES,
  calculateEquipmentStats,
} from '../../types/equipment'

interface EquipmentDisplayProps {
  equipment: UserEquipment
  isEnhancing?: boolean
}

// 레벨별 배경 그라데이션
const LEVEL_BG_COLORS: Record<string, string> = {
  novice: 'from-gray-600 to-gray-800',
  apprentice: 'from-green-600 to-green-900',
  journeyman: 'from-blue-600 to-blue-900',
  expert: 'from-purple-600 to-purple-900',
  master: 'from-yellow-500 to-orange-700',
}

export default function EquipmentDisplay({
  equipment,
  isEnhancing = false,
}: EquipmentDisplayProps) {
  const { equipmentBase, starLevel } = equipment
  const levelTier = getLevelTier(starLevel)
  const levelColor = LEVEL_TIER_COLORS[levelTier]
  const levelBg = LEVEL_BG_COLORS[levelTier]
  const equipmentName = getEquipmentName(equipmentBase, starLevel)
  const slotName = EQUIPMENT_SLOT_NAMES[equipmentBase.slot]
  const stats = calculateEquipmentStats(equipment)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 장비 이미지 영역 */}
      <div
        className={`relative transition-all duration-300 ${
          isEnhancing ? 'animate-pulse scale-110' : ''
        }`}
      >
        {/* 배경 글로우 */}
        <div
          className={`absolute inset-0 rounded-full blur-3xl opacity-40 bg-gradient-to-b ${levelBg}`}
          style={{ transform: 'scale(1.5)' }}
        />

        {/* 장비 이미지/이모지 */}
        <div className="relative w-44 h-44 flex items-center justify-center transition-all duration-500">
          <EquipmentImage
            equipment={equipment}
            size="2xl"
          />
        </div>

        {/* 강화 레벨 뱃지 */}
        {starLevel > 0 && (
          <div
            className={`absolute -top-1 -right-1 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl border-2 border-white/20 ${
              starLevel >= 20
                ? 'bg-gradient-to-br from-red-400 to-red-600 animate-pulse'
                : starLevel >= 15
                  ? 'bg-gradient-to-br from-purple-400 to-purple-600'
                  : starLevel >= 10
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                    : starLevel >= 5
                      ? 'bg-gradient-to-br from-green-400 to-green-600'
                      : 'bg-gradient-to-br from-yellow-400 to-yellow-600'
            }`}
          >
            +{starLevel}
          </div>
        )}

        {/* 장착 표시 */}
        {equipment.isEquipped && (
          <div className="absolute -bottom-1 -left-1 px-2 py-1 rounded-full bg-[var(--color-success)] text-white text-xs font-bold shadow-lg">
            장착중
          </div>
        )}
      </div>

      {/* 장비 정보 */}
      <div className="text-center">
        {/* 슬롯 태그 */}
        <div className="inline-block px-3 py-1 bg-[var(--color-bg-elevated-2)] rounded-full mb-2">
          <span className="text-[var(--color-text-muted)] text-xs">{slotName}</span>
        </div>

        <h2 className={`text-2xl font-bold ${levelColor}`}>
          {equipmentName}
        </h2>

        {/* 스탯 표시 */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {stats.attack > 0 && (
            <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--color-bg-elevated-2)] rounded-lg">
              <span className="text-[var(--color-text-muted)] text-xs">공격력</span>
              <span className="text-[var(--color-text-primary)] font-bold">{stats.attack}</span>
            </div>
          )}
          {stats.defense > 0 && (
            <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--color-bg-elevated-2)] rounded-lg">
              <span className="text-[var(--color-text-muted)] text-xs">방어력</span>
              <span className="text-[var(--color-text-primary)] font-bold">{stats.defense}</span>
            </div>
          )}
          {stats.hp > 0 && (
            <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--color-bg-elevated-2)] rounded-lg">
              <span className="text-[var(--color-text-muted)] text-xs">HP</span>
              <span className="text-[var(--color-text-primary)] font-bold">{stats.hp}</span>
            </div>
          )}
        </div>

        {/* 등급 */}
        <p className={`text-sm mt-2 ${levelColor}`}>
          {LEVEL_TIER_NAMES[levelTier]} 등급
        </p>
      </div>
    </div>
  )
}
