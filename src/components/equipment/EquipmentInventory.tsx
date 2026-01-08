import { useState, useMemo } from "react";
import { GiTicket, GiSwordman, GiSwapBag } from "react-icons/gi";
import type { UserEquipment, EquipmentSlot } from "../../types/equipment";
import {
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_NAMES,
  EQUIPMENT_SLOT_EMOJIS,
  calculateEquipmentStats,
  getEquipmentDisplayName,
} from "../../types/equipment";
import { calculateCombatPower } from "../../types/stats";
import type { EnhancementTicket } from "../../hooks/useEnhancementTickets";
import EquipmentCard from "./EquipmentCard";
import EquipmentDetail from "./EquipmentDetail";
import EquipmentImage from "./EquipmentImage";

interface EquipmentInventoryProps {
  inventory: UserEquipment[];
  onEquip: (equipmentId: string) => Promise<boolean>;
  onUnequip: (slot: EquipmentSlot) => Promise<boolean>;
  onSell: (equipmentId: string) => Promise<number>;
  filterSlot?: EquipmentSlot | null;
  onFilterChange?: (slot: EquipmentSlot | null) => void;
  // 강화권 관련
  tickets?: EnhancementTicket[];
  onUseTicket?: (ticketLevel: number, equipment: UserEquipment) => Promise<void>;
  isUsingTicket?: boolean;
}

type SortOption = "recent" | "combatPower" | "starLevel";

export default function EquipmentInventory({
  inventory,
  onEquip,
  onUnequip,
  onSell,
  filterSlot,
  onFilterChange,
  tickets = [],
  onUseTicket,
  isUsingTicket = false,
}: EquipmentInventoryProps) {
  const [selectedEquipment, setSelectedEquipment] =
    useState<UserEquipment | null>(null);
  const [internalFilterSlot, setInternalFilterSlot] =
    useState<EquipmentSlot | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // 강화권 모달 상태
  const [selectedTicket, setSelectedTicket] = useState<{
    ticketLevel: number;
    quantity: number;
  } | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // 선택한 강화권보다 낮은 레벨의 장비만 필터링
  const getEligibleEquipments = (ticketLevel: number) => {
    return inventory.filter((eq) => eq.starLevel < ticketLevel);
  };

  const handleTicketClick = (ticket: { ticketLevel: number; quantity: number }) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
  };

  const handleSelectEquipmentForTicket = async (equipment: UserEquipment) => {
    if (!selectedTicket || !onUseTicket) return;

    const confirmed = window.confirm(
      `${getEquipmentDisplayName(equipment)}에 ${selectedTicket.ticketLevel}성 강화권을 사용하시겠습니까?\n\n` +
        `현재: ${equipment.starLevel}성 → ${selectedTicket.ticketLevel}성\n` +
        `(파괴 없이 즉시 강화됩니다)`
    );

    if (confirmed) {
      await onUseTicket(selectedTicket.ticketLevel, equipment);
      setIsTicketModalOpen(false);
      setSelectedTicket(null);
    }
  };

  const closeTicketModal = () => {
    setIsTicketModalOpen(false);
    setSelectedTicket(null);
  };

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
    <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
      <div className="p-4 border-b border-amber-700/30 bg-gradient-to-r from-amber-900/20 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-amber-100 flex items-center gap-2">
            <GiSwapBag className="text-xl text-amber-400" />
            인벤토리
            <span className="text-sm text-amber-200/50 font-normal">
              ({filteredInventory.length})
            </span>
          </h2>

          {/* Sort dropdown - 대장간 테마 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-stone-800 text-amber-100 text-sm rounded-lg px-2 py-1.5 border border-stone-600 focus:border-amber-500 focus:outline-none"
          >
            <option value="recent">최신순</option>
            <option value="combatPower">전투력순</option>
            <option value="starLevel">레벨순</option>
          </select>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 강화권 섹션 */}
        {tickets.length > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-2">
              <GiTicket className="text-cyan-400 text-lg" />
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                보유 강화권
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tickets.map((ticket) => (
                <button
                  key={ticket.ticketLevel}
                  onClick={() => handleTicketClick(ticket)}
                  disabled={isUsingTicket}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] border border-cyan-500/30 hover:border-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="relative">
                    <img
                      src={`/images/tickets/${ticket.ticketLevel}.png`}
                      alt={`${ticket.ticketLevel}성 강화권`}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {ticket.quantity}
                    </div>
                  </div>
                  <span className="text-xs text-cyan-300 font-medium">
                    {ticket.ticketLevel}성
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              강화권을 클릭하여 장비에 적용
            </p>
          </div>
        )}

        {/* Slot filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <button
            onClick={() => setActiveFilterSlot(null)}
            className={`
              flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px]
              ${
                !activeFilterSlot
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-elevated-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated-3)]"
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
                  flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px]
                  flex items-center gap-1.5
                  ${
                    activeFilterSlot === slot
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-bg-elevated-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated-3)]"
                  }
                `}
              >
                <span>{EQUIPMENT_SLOT_EMOJIS[slot]}</span>
                <span className="hidden sm:inline">{EQUIPMENT_SLOT_NAMES[slot]}</span>
                <span className="text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Equipment grid */}
        {filteredInventory.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📦</span>
            <span className="empty-state-text">인벤토리가 비어있습니다</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
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
      </div>

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

      {/* 강화권 장비 선택 모달 */}
      {isTicketModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[var(--color-bg-elevated)] rounded-xl border border-cyan-500/30 w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <img
                  src={`/images/tickets/${selectedTicket.ticketLevel}.png`}
                  alt=""
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <h3 className="font-bold text-white">
                  {selectedTicket.ticketLevel}성 강화권 사용
                </h3>
              </div>
              <button
                onClick={closeTicketModal}
                className="p-2 text-gray-400 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-gray-400 mb-4">
                강화할 장비를 선택하세요 ({selectedTicket.ticketLevel}성 미만의
                장비만 표시)
              </p>

              {(() => {
                const eligibleEquipments = getEligibleEquipments(
                  selectedTicket.ticketLevel
                );

                if (eligibleEquipments.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <GiSwordman className="text-4xl text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {selectedTicket.ticketLevel}성 미만의 장비가 없습니다
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        강화권보다 낮은 레벨의 장비가 있어야 사용할 수 있습니다
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {eligibleEquipments.map((equipment) => (
                      <button
                        key={equipment.id}
                        onClick={() => handleSelectEquipmentForTicket(equipment)}
                        disabled={isUsingTicket}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] border border-transparent hover:border-cyan-500/50 transition-all disabled:opacity-50"
                      >
                        <div className="relative">
                          <EquipmentImage equipment={equipment} size="md" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-accent)] text-black text-[9px] font-bold flex items-center justify-center">
                            {equipment.starLevel}
                          </div>
                        </div>
                        <span className="text-[9px] text-[var(--color-text-secondary)] truncate w-full text-center">
                          {getEquipmentDisplayName(equipment).split(" ")[0]}
                        </span>
                        <span className="text-[8px] text-cyan-400">
                          → {selectedTicket.ticketLevel}성
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <p className="text-[10px] text-gray-500 text-center">
                강화권 사용 시 파괴 없이 즉시 해당 성급으로 강화됩니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
