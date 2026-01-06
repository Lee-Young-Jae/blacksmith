/**
 * 아이템 인벤토리 컴포넌트
 *
 * 보유한 아이템(강화권 등)을 표시하고, 클릭 시 사용할 수 있는 모달 제공
 */

import { useState } from 'react'
import { GiTicket, GiSwordman } from 'react-icons/gi'
import { FaTimes } from 'react-icons/fa'
import type { EnhancementTicket } from '../../hooks/useEnhancementTickets'
import type { UserEquipment } from '../../types/equipment'
import { getEquipmentDisplayName } from '../../types/equipment'
import EquipmentImage from './EquipmentImage'

interface ItemInventoryProps {
  tickets: EnhancementTicket[]
  equipments: UserEquipment[]
  onUseTicket: (ticketLevel: number, equipment: UserEquipment) => Promise<void>
  isUsingTicket?: boolean
}

export function ItemInventory({
  tickets,
  equipments,
  onUseTicket,
  isUsingTicket = false,
}: ItemInventoryProps) {
  const [selectedTicket, setSelectedTicket] = useState<EnhancementTicket | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 선택한 강화권보다 낮은 레벨의 장비만 필터링
  const getEligibleEquipments = (ticketLevel: number) => {
    return equipments.filter(eq => eq.starLevel < ticketLevel)
  }

  const handleTicketClick = (ticket: EnhancementTicket) => {
    setSelectedTicket(ticket)
    setIsModalOpen(true)
  }

  const handleSelectEquipment = async (equipment: UserEquipment) => {
    if (!selectedTicket) return

    const confirmed = window.confirm(
      `${getEquipmentDisplayName(equipment)}에 ${selectedTicket.ticketLevel}성 강화권을 사용하시겠습니까?\n\n` +
      `현재: ${equipment.starLevel}성 → ${selectedTicket.ticketLevel}성\n` +
      `(파괴 없이 즉시 강화됩니다)`
    )

    if (confirmed) {
      await onUseTicket(selectedTicket.ticketLevel, equipment)
      setIsModalOpen(false)
      setSelectedTicket(null)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTicket(null)
  }

  if (tickets.length === 0) {
    return null
  }

  return (
    <>
      {/* 인벤토리 섹션 */}
      <div className="card">
        <div className="card-body py-3">
          <div className="flex items-center gap-2 mb-3">
            <GiTicket className="text-cyan-400 text-lg" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">보유 아이템</h3>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.ticketLevel}
                onClick={() => handleTicketClick(ticket)}
                disabled={isUsingTicket}
                className="flex-shrink-0 w-20 flex flex-col items-center gap-1 p-2 rounded-lg bg-gradient-to-b from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 hover:border-cyan-400 hover:from-cyan-800/40 hover:to-blue-800/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative">
                  <img
                    src={`/images/tickets/${ticket.ticketLevel}.png`}
                    alt={`${ticket.ticketLevel}성 강화권`}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {ticket.quantity}
                  </div>
                </div>
                <span className="text-[10px] text-cyan-300 font-medium">
                  {ticket.ticketLevel}성 강화권
                </span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-gray-500 mt-1">
            강화권을 클릭하면 적용할 장비를 선택할 수 있습니다
          </p>
        </div>
      </div>

      {/* 장비 선택 모달 */}
      {isModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[var(--color-bg-elevated)] rounded-xl border border-cyan-500/30 w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <img
                  src={`/images/tickets/${selectedTicket.ticketLevel}.png`}
                  alt=""
                  className="w-6 h-6 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <h3 className="font-bold text-white">
                  {selectedTicket.ticketLevel}성 강화권 사용
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-gray-400 mb-4">
                강화할 장비를 선택하세요 ({selectedTicket.ticketLevel}성 미만의 장비만 표시)
              </p>

              {(() => {
                const eligibleEquipments = getEligibleEquipments(selectedTicket.ticketLevel)

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
                  )
                }

                return (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {eligibleEquipments.map((equipment) => (
                      <button
                        key={equipment.id}
                        onClick={() => handleSelectEquipment(equipment)}
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
                          {getEquipmentDisplayName(equipment).split(' ')[0]}
                        </span>
                        <span className="text-[8px] text-cyan-400">
                          → {selectedTicket.ticketLevel}성
                        </span>
                      </button>
                    ))}
                  </div>
                )
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
    </>
  )
}
