interface GoldDisplayProps {
  gold: number
  canClaimDaily: boolean
  onClaimDaily: () => void
}

export function GoldDisplay({ gold, canClaimDaily, onClaimDaily }: GoldDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="currency">
        <span className="text-xl">🪙</span>
        <span className="currency-value text-base">
          {gold.toLocaleString()}
        </span>
      </div>

      {canClaimDaily && (
        <button
          onClick={onClaimDaily}
          className="btn btn-accent text-sm animate-bounce"
        >
          <span>🎁</span>
          <span className="hidden sm:inline">일일 보상</span>
        </button>
      )}
    </div>
  )
}
