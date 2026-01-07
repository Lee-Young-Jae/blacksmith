import { useState } from 'react'
import { GiPresent } from 'react-icons/gi'
import type { Gift, GiftType, GiftCount } from '../../types/gift'
import { getTimeUntilExpiry, GIFT_TYPE_NAMES, GIFT_TYPE_ICONS } from '../../types/gift'
import { getEquipmentName } from '../../types/equipment'
import { GiftDetailModal } from './GiftDetailModal'

type FilterType = 'all' | GiftType

interface TicketClaimResult {
  ticketLevel: number
  ticketCount: number
}

interface GiftBoxPanelProps {
  gifts: Gift[]
  unclaimedCount: GiftCount
  isLoading: boolean
  onClaimCondolence: (giftId: string) => Promise<boolean>
  onClaimEquipment: (giftId: string) => Promise<string | null>
  onClaimGold: (giftId: string) => Promise<number | null>
  onClaimTicket: (giftId: string) => Promise<TicketClaimResult | null>
  onEquipmentClaimed?: () => void
  onGoldClaimed?: (amount: number) => void
  onTicketClaimed?: (level: number, count: number) => void
  onSendEquipment?: () => void
  onClose: () => void
  // 관리자 기능 (모바일 지원)
  isAdmin?: boolean
  onAdminGold?: () => void
  onAdminTicket?: () => void
}

export function GiftBoxPanel({
  gifts,
  unclaimedCount,
  isLoading,
  onClaimCondolence,
  onClaimEquipment,
  onClaimGold,
  onClaimTicket,
  onEquipmentClaimed,
  onGoldClaimed,
  onTicketClaimed,
  onSendEquipment,
  onClose,
  isAdmin,
  onAdminGold,
  onAdminTicket,
}: GiftBoxPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null)

  // 필터링된 선물 목록 (미수령만)
  const unclaimedGifts = gifts.filter(g => !g.isClaimed)
  const filteredGifts = filter === 'all'
    ? unclaimedGifts
    : unclaimedGifts.filter(g => g.giftType === filter)

  // 선물 수령 처리
  const handleClaim = async () => {
    if (!selectedGift) return

    let success = false

    if (selectedGift.giftType === 'condolence') {
      success = await onClaimCondolence(selectedGift.id)
    } else if (selectedGift.giftType === 'equipment') {
      const equipmentId = await onClaimEquipment(selectedGift.id)
      success = !!equipmentId
      if (success && onEquipmentClaimed) {
        onEquipmentClaimed()
      }
    } else if (selectedGift.giftType === 'gold') {
      const goldAmount = await onClaimGold(selectedGift.id)
      success = goldAmount !== null
      if (success && goldAmount && onGoldClaimed) {
        onGoldClaimed(goldAmount)
      }
    } else if (selectedGift.giftType === 'ticket') {
      const result = await onClaimTicket(selectedGift.id)
      success = result !== null
      if (success && result && onTicketClaimed) {
        onTicketClaimed(result.ticketLevel, result.ticketCount)
      }
    }

    if (success) {
      setSelectedGift(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 패널 */}
      <div className="relative bg-[var(--color-bg-elevated-1)] rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GiPresent className="w-6 h-6 text-[var(--color-accent)]" />
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              선물함
            </h2>
            {unclaimedCount.total > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unclaimedCount.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSendEquipment && (
              <button
                onClick={onSendEquipment}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white transition-colors"
              >
                장비 선물하기
              </button>
            )}
            {/* 관리자 버튼 (모바일 지원) */}
            {isAdmin && onAdminGold && (
              <button
                onClick={onAdminGold}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                골드 지급
              </button>
            )}
            {isAdmin && onAdminTicket && (
              <button
                onClick={onAdminTicket}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
              >
                강화권 지급
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--color-bg-elevated-2)] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 필터 탭 */}
        <div className="p-2 border-b border-[var(--color-border)] shrink-0">
          <div className="flex gap-2 overflow-x-auto">
            <FilterTab
              label="전체"
              count={unclaimedCount.total}
              isActive={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterTab
              label="묵념"
              count={unclaimedCount.condolence}
              isActive={filter === 'condolence'}
              onClick={() => setFilter('condolence')}
            />
            <FilterTab
              label="장비"
              count={unclaimedCount.equipment}
              isActive={filter === 'equipment'}
              onClick={() => setFilter('equipment')}
            />
            <FilterTab
              label="골드"
              count={unclaimedCount.gold}
              isActive={filter === 'gold'}
              onClick={() => setFilter('gold')}
            />
            <FilterTab
              label="강화권"
              count={unclaimedCount.ticket}
              isActive={filter === 'ticket'}
              onClick={() => setFilter('ticket')}
            />
          </div>
        </div>

        {/* 선물 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredGifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-6xl mb-4">📭</span>
              <p className="text-[var(--color-text-muted)]">
                {filter === 'all' ? '받은 선물이 없습니다' : `${GIFT_TYPE_NAMES[filter as GiftType]} 선물이 없습니다`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredGifts.map(gift => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  onClick={() => setSelectedGift(gift)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 선물 상세 모달 */}
      {selectedGift && (
        <GiftDetailModal
          gift={selectedGift}
          onClaim={handleClaim}
          onClose={() => setSelectedGift(null)}
        />
      )}
    </div>
  )
}

// 필터 탭 컴포넌트
function FilterTab({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
        isActive
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-bg-elevated-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated-3)]'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
          isActive ? 'bg-white/20' : 'bg-[var(--color-bg-elevated-3)]'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

// 선물 카드 컴포넌트
function GiftCard({ gift, onClick }: { gift: Gift; onClick: () => void }) {
  const isCondolence = gift.giftType === 'condolence'
  const isGold = gift.giftType === 'gold'
  const isEquipment = gift.giftType === 'equipment'
  const isTicket = gift.giftType === 'ticket'

  // 장비 이름 가져오기
  const equipmentName = isEquipment && gift.equipmentBase && gift.equipmentData
    ? getEquipmentName(gift.equipmentBase, gift.equipmentData.star_level)
    : null

  // 아이콘 결정
  const getIcon = () => {
    if (isCondolence) {
      if (gift.condolenceImage) {
        return (
          <img
            src={gift.condolenceImage.src}
            alt=""
            className="w-10 h-10 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = '<span class="text-3xl">🙏</span>'
            }}
          />
        )
      }
      return <span className="text-3xl">🙏</span>
    }
    if (isGold) {
      return <span className="text-3xl">🪙</span>
    }
    if (isTicket && gift.ticketLevel) {
      return (
        <img
          src={`/images/tickets/${gift.ticketLevel}.png`}
          alt=""
          className="w-10 h-10 object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            target.parentElement!.innerHTML = '<span class="text-3xl">🎫</span>'
          }}
        />
      )
    }
    return <span className="text-3xl">{gift.equipmentBase?.emoji || '🎁'}</span>
  }

  // 이름 결정
  const getName = () => {
    if (isCondolence) {
      return gift.condolenceImage?.name || '묵념'
    }
    if (isGold) {
      return `${gift.goldAmount?.toLocaleString() || 0} 골드`
    }
    if (isTicket) {
      return `${gift.ticketLevel}성 강화권 x${gift.ticketCount || 1}`
    }
    return equipmentName || '장비'
  }

  // 배경색 결정
  const getBgColor = () => {
    if (isGold) return 'bg-amber-500/20'
    if (isTicket) return 'bg-cyan-500/20'
    return 'bg-[var(--color-bg-elevated-3)]'
  }

  // 텍스트 색상 결정
  const getTextColor = () => {
    if (isGold) return 'text-[var(--color-accent)]'
    if (isTicket) return 'text-cyan-400'
    return 'text-[var(--color-text-primary)]'
  }

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-xl bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated-3)] hover:border-[var(--color-primary)]/50 transition-all text-left flex items-center gap-4"
    >
      {/* 아이콘 */}
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${getBgColor()}`}>
        {getIcon()}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-bg-elevated-3)] text-[var(--color-text-muted)]">
            {GIFT_TYPE_ICONS[gift.giftType]} {GIFT_TYPE_NAMES[gift.giftType]}
          </span>
        </div>
        <p className={`font-bold truncate ${getTextColor()}`}>
          {getName()}
          {isEquipment && gift.equipmentData && gift.equipmentData.star_level > 0 && (
            <span className="text-yellow-400 ml-1">+{gift.equipmentData.star_level}</span>
          )}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] truncate">
          {gift.senderName}님으로부터 · {getTimeUntilExpiry(gift.expiresAt)}
        </p>
      </div>

      {/* 화살표 */}
      <svg className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
