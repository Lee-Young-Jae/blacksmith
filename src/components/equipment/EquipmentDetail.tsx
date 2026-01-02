import type { UserEquipment } from "../../types/equipment";
import {
  EQUIPMENT_SLOT_NAMES,
  getEquipmentDisplayName,
  getEquipmentComment,
  calculateEquipmentStats,
  getEquipmentSellPrice,
  shouldWarnOnSell,
} from "../../types/equipment";
import EquipmentImage from "./EquipmentImage";
import {
  POTENTIAL_TIER_NAMES,
  POTENTIAL_TIER_COLORS,
  POTENTIAL_TIER_BG,
  formatPotentialLine,
  getUnlockedSlotCount,
} from "../../types/potential";
import type { PotentialTier } from "../../types/potential";
import {
  calculateCombatPower,
  STAT_NAMES,
  STAT_ICONS,
  STAT_COLORS,
} from "../../types/stats";
import type { CharacterStats } from "../../types/stats";
import EquipmentCard from "./EquipmentCard";

interface EquipmentDetailProps {
  equipment: UserEquipment;
  onClose: () => void;
  onUnequip?: () => void;
  onEquip?: (equipmentId: string) => void;
  onSell?: () => void;
  inventory?: UserEquipment[];
}

export default function EquipmentDetail({
  equipment,
  onClose,
  onUnequip,
  onEquip,
  onSell,
  inventory,
}: EquipmentDetailProps) {
  const {
    equipmentBase,
    starLevel,
    potentials,
    isEquipped,
  } = equipment;
  const displayName = getEquipmentDisplayName(equipment);
  const comment = getEquipmentComment(equipmentBase, starLevel);
  const unlockedCount = getUnlockedSlotCount(potentials);
  const stats = calculateEquipmentStats(equipment);
  const combatPower = calculateCombatPower(stats);
  const sellPrice = getEquipmentSellPrice(equipment);
  const warnOnSell = shouldWarnOnSell(equipment);

  // Get other equipment of same slot for comparison
  const sameSlotItems =
    inventory?.filter(
      (e) =>
        e.equipmentBase.slot === equipmentBase.slot && e.id !== equipment.id
    ) || [];

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gray-700/50 rounded-t-xl border-b border-gray-700">
          <div className="flex items-center gap-3">
            <EquipmentImage equipment={equipment} size="xl" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {displayName}
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">
                  {EQUIPMENT_SLOT_NAMES[equipmentBase.slot]}
                </span>
                {isEquipped && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-green-400">장착중</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Blacksmith Comment */}
          <div className="mt-3 text-sm text-gray-300 italic">"{comment}"</div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Star Level */}
          {starLevel > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-xl">★</span>
              <span className="text-yellow-400 text-lg font-bold">
                {starLevel}
              </span>
              <span className="text-gray-400 text-sm">장비레벨</span>
            </div>
          )}

          {/* Combat Power */}
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-400">전투력</div>
            <div className="text-2xl font-bold text-yellow-400">
              {combatPower.toLocaleString()}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="text-sm font-bold text-gray-400 mb-2">장비 스탯</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(stats) as (keyof CharacterStats)[]).map((stat) => {
                const value = stats[stat];
                if (value === 0) return null;
                const isPercentage = [
                  "critRate",
                  "critDamage",
                  "penetration",
                ].includes(stat);
                return (
                  <div key={stat} className="flex items-center gap-2">
                    <span>{STAT_ICONS[stat]}</span>
                    <span className="text-gray-400 text-sm">
                      {STAT_NAMES[stat]}
                    </span>
                    <span className={`font-bold ${STAT_COLORS[stat]}`}>
                      +{value}
                      {isPercentage ? "%" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Potentials */}
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-400">잠재옵션</h3>
              <span className="text-sm text-gray-400">
                {unlockedCount}/3 해제
              </span>
            </div>
            <div className="space-y-2">
              {potentials.map((line, index) => {
                const tierColor = POTENTIAL_TIER_COLORS[line.tier as PotentialTier];
                const tierBg = POTENTIAL_TIER_BG[line.tier as PotentialTier];
                return (
                  <div
                    key={index}
                    className={`
                      flex items-center gap-2 text-sm p-2 rounded
                      ${line.isUnlocked ? tierBg : 'bg-gray-900'}
                    `}
                  >
                    {!line.isUnlocked ? (
                      <span className="text-gray-500">🔒 슬롯 잠김</span>
                    ) : (
                      <>
                        {line.isLocked && <span className="text-yellow-400">📌</span>}
                        <span className={tierColor}>{formatPotentialLine(line)}</span>
                        <span className={`text-xs ${tierColor} ml-auto`}>
                          {POTENTIAL_TIER_NAMES[line.tier as PotentialTier]}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sell Price */}
          <div className="text-sm text-gray-400">
            판매가:{" "}
            <span className="text-yellow-400 font-bold">
              {sellPrice.toLocaleString()}
            </span>{" "}
            골드
            {warnOnSell && (
              <span className="text-orange-400 ml-2">
                (해제된 잠재옵션 있음!)
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isEquipped && onUnequip && (
              <button
                onClick={onUnequip}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                해제
              </button>
            )}
            {!isEquipped && onEquip && (
              <button
                onClick={() => onEquip(equipment.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                장착
              </button>
            )}
            {!isEquipped && onSell && (
              <button
                onClick={onSell}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                판매 ({sellPrice.toLocaleString()}G)
              </button>
            )}
          </div>

          {/* Other Equipment in Same Slot */}
          {sameSlotItems.length > 0 && (
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-sm font-bold text-gray-400 mb-2">
                같은 슬롯 장비 ({sameSlotItems.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sameSlotItems.slice(0, 5).map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    compact
                    onClick={() => onEquip?.(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
