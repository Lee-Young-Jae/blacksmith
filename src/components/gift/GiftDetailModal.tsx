import { useState } from 'react'
import type { Gift } from '../../types/gift'
import { getTimeUntilExpiry, GIFT_TYPE_NAMES } from '../../types/gift'
import { getEquipmentName } from '../../types/equipment'

interface GiftDetailModalProps {
  gift: Gift
  onClaim: () => Promise<void>
  onClose: () => void
}

export function GiftDetailModal({ gift, onClaim, onClose }: GiftDetailModalProps) {
  const [isClaiming, setIsClaiming] = useState(false)

  const handleClaim = async () => {
    setIsClaiming(true)
    try {
      await onClaim()
    } finally {
      setIsClaiming(false)
    }
  }

  const isCondolence = gift.giftType === 'condolence'
  const isEquipment = gift.giftType === 'equipment'
  const isGold = gift.giftType === 'gold'

  // 장비 이름 가져오기
  const equipmentName = isEquipment && gift.equipmentBase && gift.equipmentData
    ? getEquipmentName(gift.equipmentBase, gift.equipmentData.star_level)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-[var(--color-bg-elevated-1)] rounded-2xl w-full max-w-md shadow-2xl border border-[var(--color-border)] overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {GIFT_TYPE_NAMES[gift.giftType]} 선물
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {gift.senderName}님으로부터
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-elevated-2)] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-4">
          {/* 묵념 이미지 */}
          {isCondolence && gift.condolenceImage && (
            <div className="text-center">
              <div className="w-48 h-48 mx-auto bg-[var(--color-bg-elevated-2)] rounded-xl flex items-center justify-center overflow-hidden">
                <img
                  src={gift.condolenceImage.src}
                  alt={gift.condolenceImage.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    // 이미지 로드 실패 시 이모지로 대체
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.parentElement!.innerHTML = '<span class="text-8xl">🙏</span>'
                  }}
                />
              </div>
              <p className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">
                {gift.condolenceImage.name}
              </p>
            </div>
          )}

          {/* 장비 */}
          {isEquipment && gift.equipmentBase && gift.equipmentData && (
            <div className="text-center space-y-3">
              <div className="w-24 h-24 mx-auto bg-[var(--color-bg-elevated-2)] rounded-xl flex items-center justify-center">
                <span className="text-5xl">{gift.equipmentBase.emoji}</span>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">
                  {equipmentName}
                </p>
                {gift.equipmentData.star_level > 0 && (
                  <p className="text-yellow-400 font-bold">
                    +{gift.equipmentData.star_level}
                  </p>
                )}
              </div>

              {/* 잠재옵션 미리보기 */}
              {gift.equipmentData.potentials && gift.equipmentData.potentials.length > 0 && (
                <div className="bg-[var(--color-bg-elevated-2)] rounded-lg p-3 text-left">
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">잠재옵션</p>
                  {gift.equipmentData.potentials.map((pot, idx) => (
                    <p key={idx} className="text-sm text-[var(--color-text-secondary)]">
                      {pot.stat} +{pot.value}{pot.isPercentage ? '%' : ''}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 골드 */}
          {isGold && (
            <div className="text-center space-y-3">
              <div className="w-32 h-32 mx-auto bg-amber-500/20 rounded-2xl flex items-center justify-center">
                <span className="text-7xl">🪙</span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-accent)]">
                {gift.goldAmount?.toLocaleString() || 0} 골드
              </p>
            </div>
          )}

          {/* 메시지 */}
          {gift.message && (
            <div className="bg-[var(--color-bg-elevated-2)] rounded-lg p-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">메시지</p>
              <p className="text-sm text-[var(--color-text-primary)]">"{gift.message}"</p>
            </div>
          )}

          {/* 만료 시간 */}
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            {getTimeUntilExpiry(gift.expiresAt)}
          </p>
        </div>

        {/* 버튼 */}
        <div className="p-4 border-t border-[var(--color-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] text-[var(--color-text-primary)] font-bold transition-colors"
          >
            닫기
          </button>
          {!gift.isClaimed && (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  수령 중...
                </>
              ) : (
                isEquipment || isGold ? '수령하기' : '확인'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
