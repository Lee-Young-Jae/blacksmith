import { GiPresent } from 'react-icons/gi'

interface GiftIconProps {
  unclaimedCount: number
  onClick: () => void
}

export function GiftIcon({ unclaimedCount, onClick }: GiftIconProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] transition-colors"
      title="선물함"
    >
      <GiPresent className="w-5 h-5 text-[var(--color-text-secondary)]" />

      {unclaimedCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-bold text-white bg-red-500 rounded-full">
          {unclaimedCount > 99 ? '99+' : unclaimedCount}
        </span>
      )}
    </button>
  )
}
