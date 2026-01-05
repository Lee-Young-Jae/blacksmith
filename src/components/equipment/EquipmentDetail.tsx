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
      className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-bg-elevated-1)] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[var(--color-bg-elevated-2)] border-b border-[var(--color-border)] flex-shrink-0">
          {/* Mobile drag handle */}
          <div className="w-10 h-1 bg-[var(--color-text-muted)] rounded-full mx-auto mb-3 sm:hidden" />

          <div className="flex items-center gap-3">
            <EquipmentImage equipment={equipment} size="xl" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] truncate">
                {displayName}
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  {EQUIPMENT_SLOT_NAMES[equipmentBase.slot]}
                </span>
                {isEquipped && (
                  <>
                    <span className="text-[var(--color-text-muted)]">•</span>
                    <span className="text-[var(--color-success)]">장착중</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-2xl rounded-full hover:bg-[var(--color-bg-elevated-3)]"
            >
              ×
            </button>
          </div>

          {/* Blacksmith Comment */}
          <div className="mt-3 text-sm text-[var(--color-text-secondary)] italic">"{comment}"</div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Star Level */}
          {starLevel > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-accent)] text-xl">★</span>
              <span className="text-[var(--color-accent)] text-lg font-bold">
                {starLevel}
              </span>
              <span className="text-[var(--color-text-muted)] text-sm">장비레벨</span>
            </div>
          )}

          {/* Combat Power */}
          <div className="combat-power">
            <span className="combat-power-label">전투력</span>
            <span className="combat-power-value">{combatPower.toLocaleString()}</span>
          </div>

          {/* Stats */}
          <div className="info-box">
            <h3 className="text-sm font-bold text-[var(--color-text-secondary)] mb-3">장비 스탯</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(stats) as (keyof CharacterStats)[]).map((stat) => {
                const value = stats[stat];
                if (value === 0) return null;
                const isPercentage = [
                  "critRate",
                  "critDamage",
                  "penetration",
                  "attackSpeed",
                  "evasion",
                ].includes(stat);
                return (
                  <div key={stat} className="flex items-center gap-2 py-1">
                    <span>{STAT_ICONS[stat]}</span>
                    <span className="text-[var(--color-text-secondary)] text-sm">
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
          <div className="info-box">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">잠재옵션</h3>
              <span className="text-sm text-[var(--color-text-muted)]">
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
                      flex items-center gap-2 text-sm p-2.5 rounded-lg min-h-[40px]
                      ${line.isUnlocked ? tierBg : 'bg-[var(--color-bg-elevated-2)]'}
                    `}
                  >
                    {!line.isUnlocked ? (
                      <span className="text-[var(--color-text-muted)]">🔒 슬롯 잠김</span>
                    ) : (
                      <>
                        {line.isLocked && <span className="text-[var(--color-accent)]">📌</span>}
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
          <div className="text-sm text-[var(--color-text-secondary)]">
            판매가:{" "}
            <span className="text-[var(--color-accent)] font-bold">
              {sellPrice.toLocaleString()}
            </span>{" "}
            골드
            {warnOnSell && (
              <span className="text-orange-400 ml-2">
                (해제된 잠재옵션 있음!)
              </span>
            )}
          </div>

          {/* Other Equipment in Same Slot */}
          {sameSlotItems.length > 0 && (
            <div className="border-t border-[var(--color-border)] pt-4">
              <h3 className="text-sm font-bold text-[var(--color-text-secondary)] mb-2">
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

        {/* Actions - Fixed at bottom */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated-1)] flex-shrink-0 safe-area-bottom">
          <div className="flex gap-3">
            {isEquipped && onUnequip && (
              <button onClick={onUnequip} className="btn btn-danger flex-1">
                해제
              </button>
            )}
            {!isEquipped && onEquip && (
              <button onClick={() => onEquip(equipment.id)} className="btn btn-primary flex-1">
                장착
              </button>
            )}
            {!isEquipped && onSell && (
              <button onClick={onSell} className="btn btn-accent flex-1">
                판매 ({sellPrice.toLocaleString()}G)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
