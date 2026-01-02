import { useState } from 'react'
import type { BattleCardSlot, BattleCard } from '../types/battleCard'
import {
  BATTLE_CARD_TIER_NAMES,
  BATTLE_CARD_TIER_COLORS,
} from '../types/battleCard'

interface BattleCardSelectProps {
  cardSlots: BattleCardSlot[]
  onReroll: (index: number) => boolean
  onSelect: (index: number) => void
  onCancel: () => void
  canReroll: (index: number) => boolean
}

export function BattleCardSelect({
  cardSlots,
  onReroll,
  onSelect,
  onCancel,
  canReroll,
}: BattleCardSelectProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [rerollingIndex, setRerollingIndex] = useState<number | null>(null)

  const handleReroll = async (index: number) => {
    if (!canReroll(index)) return

    setRerollingIndex(index)
    // 짧은 애니메이션 딜레이
    await new Promise(resolve => setTimeout(resolve, 300))
    onReroll(index)
    setRerollingIndex(null)
  }

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      onSelect(selectedIndex)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            배틀 카드 선택
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm">
            3장 중 1장을 선택하세요. 각 카드는 1회 리롤 가능합니다.
          </p>
        </div>

        {/* 카드 3장 */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          {cardSlots.map((slot, index) => (
            <BattleCardItem
              key={slot.card.id}
              card={slot.card}
              hasRerolled={slot.hasRerolled}
              isSelected={selectedIndex === index}
              isRerolling={rerollingIndex === index}
              canReroll={canReroll(index)}
              onSelect={() => setSelectedIndex(index)}
              onReroll={() => handleReroll(index)}
            />
          ))}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="btn btn-ghost px-6 py-3"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIndex === null}
            className={`btn px-8 py-3 ${
              selectedIndex !== null ? 'btn-primary' : 'btn-ghost opacity-50'
            }`}
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  )
}

interface BattleCardItemProps {
  card: BattleCard
  hasRerolled: boolean
  isSelected: boolean
  isRerolling: boolean
  canReroll: boolean
  onSelect: () => void
  onReroll: () => void
}

function BattleCardItem({
  card,
  hasRerolled,
  isSelected,
  isRerolling,
  canReroll,
  onSelect,
  onReroll,
}: BattleCardItemProps) {
  const tierColors = BATTLE_CARD_TIER_COLORS[card.tier]
  const tierName = BATTLE_CARD_TIER_NAMES[card.tier]

  return (
    <div
      className={`
        relative flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer
        ${tierColors}
        ${isSelected
          ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg-primary)] scale-105'
          : 'hover:scale-102'
        }
        ${isRerolling ? 'animate-pulse' : ''}
      `}
      onClick={onSelect}
    >
      {/* 등급 배지 */}
      <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full ${tierColors}`}>
        {tierName}
      </div>

      {/* 카드 내용 */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col items-center text-center">
        {/* 이모지 */}
        <div className="text-4xl sm:text-5xl mb-3">{card.emoji}</div>

        {/* 카드 이름 */}
        <h3 className={`font-bold text-sm sm:text-base mb-2 ${tierColors.split(' ')[0]}`}>
          {card.name}
        </h3>

        {/* 효과 설명 */}
        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
          {card.description}
        </p>
      </div>

      {/* 리롤 버튼 */}
      <div className="p-2 border-t border-[var(--color-border)]">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (canReroll) onReroll()
          }}
          disabled={!canReroll || isRerolling}
          className={`
            w-full py-2 rounded-lg text-xs sm:text-sm font-medium transition-all
            ${canReroll && !isRerolling
              ? 'bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] text-[var(--color-text-primary)]'
              : 'bg-[var(--color-bg-elevated-1)] text-[var(--color-text-muted)] cursor-not-allowed'
            }
          `}
        >
          {isRerolling ? (
            <span className="flex items-center justify-center gap-1">
              <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              리롤 중
            </span>
          ) : hasRerolled ? (
            '리롤 완료'
          ) : (
            '리롤 (1회)'
          )}
        </button>
      </div>

      {/* 선택됨 표시 */}
      {isSelected && (
        <div className="absolute inset-0 bg-[var(--color-accent)]/10 pointer-events-none flex items-center justify-center">
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
            <span className="text-white text-sm">✓</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default BattleCardSelect
