import { useState, useMemo } from "react";
import type { UserEquipment, EquipmentSlot } from "../../types/equipment";
import {
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_NAMES,
  EQUIPMENT_SLOT_EMOJIS,
  calculateEquipmentStats,
} from "../../types/equipment";
import { calculateCombatPower } from "../../types/stats";
import EquipmentCard from "./EquipmentCard";
import EquipmentDetail from "./EquipmentDetail";

interface EquipmentInventoryProps {
  inventory: UserEquipment[];
  onEquip: (equipmentId: string) => Promise<boolean>;
  onUnequip: (slot: EquipmentSlot) => Promise<boolean>;
  onSell: (equipmentId: string) => Promise<number>;
  filterSlot?: EquipmentSlot | null;
  onFilterChange?: (slot: EquipmentSlot | null) => void;
}

type SortOption = "recent" | "combatPower" | "starLevel";

export default function EquipmentInventory({
  inventory,
  onEquip,
  onUnequip,
  onSell,
  filterSlot,
  onFilterChange,
}: EquipmentInventoryProps) {
  const [selectedEquipment, setSelectedEquipment] =
    useState<UserEquipment | null>(null);
  const [internalFilterSlot, setInternalFilterSlot] =
    useState<EquipmentSlot | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const activeFilterSlot = filterSlot ?? internalFilterSlot;
  const setActiveFilterSlot = onFilterChange ?? setInternalFilterSlot;

  // Filter and sort inventory
  const filteredInventory = useMemo(() => {
    let items = [...inventory];

    // Filter by slot
    if (activeFilterSlot) {
      items = items.filter((e) => e.equipmentBase.slot === activeFilterSlot);
    }

    // Sort
    items.sort((a, b) => {
      switch (sortBy) {
        case "combatPower": {
          const cpA = calculateCombatPower(calculateEquipmentStats(a));
          const cpB = calculateCombatPower(calculateEquipmentStats(b));
          return cpB - cpA;
        }
        case "starLevel":
          return b.starLevel - a.starLevel;
        case "recent":
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return items;
  }, [inventory, activeFilterSlot, sortBy]);

  const handleSell = async () => {
    if (!selectedEquipment) return;
    const gold = await onSell(selectedEquipment.id);
    if (gold > 0) {
      setSelectedEquipment(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🎒</span>
          인벤토리
          <span className="text-sm text-gray-400 font-normal">
            ({filteredInventory.length}개)
          </span>
        </h2>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
        >
          <option value="recent">최신순</option>
          <option value="combatPower">전투력순</option>
          <option value="starLevel">장비레벨순</option>
        </select>
      </div>

      {/* Slot filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFilterSlot(null)}
          className={`
            flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${
              !activeFilterSlot
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }
          `}
        >
          전체
        </button>
        {EQUIPMENT_SLOTS.map((slot) => {
          const count = inventory.filter(
            (e) => e.equipmentBase.slot === slot
          ).length;
          return (
            <button
              key={slot}
              onClick={() => setActiveFilterSlot(slot)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                flex items-center gap-1
                ${
                  activeFilterSlot === slot
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                }
              `}
            >
              <span>{EQUIPMENT_SLOT_EMOJIS[slot]}</span>
              <span>{EQUIPMENT_SLOT_NAMES[slot]}</span>
              <span className="text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Equipment grid */}
      {filteredInventory.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📦</div>
          <div>인벤토리가 비어있습니다</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
          {filteredInventory.map((equipment) => (
            <EquipmentCard
              key={equipment.id}
              equipment={equipment}
              onClick={() => setSelectedEquipment(equipment)}
              showStats
            />
          ))}
        </div>
      )}

      {/* Equipment Detail Modal */}
      {selectedEquipment && (
        <EquipmentDetail
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onEquip={async (id) => {
            const success = await onEquip(id);
            if (success) setSelectedEquipment(null);
          }}
          onUnequip={async () => {
            const success = await onUnequip(
              selectedEquipment.equipmentBase.slot
            );
            if (success) setSelectedEquipment(null);
          }}
          onSell={handleSell}
          inventory={inventory}
        />
      )}
    </div>
  );
}
