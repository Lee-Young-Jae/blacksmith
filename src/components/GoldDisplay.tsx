interface GoldDisplayProps {
  gold: number
  canClaimDaily: boolean
  onClaimDaily: () => void
}

export function GoldDisplay({ gold, canClaimDaily, onClaimDaily }: GoldDisplayProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
        <span className="text-2xl">🪙</span>
        <span className="text-yellow-400 font-bold text-lg">
          {gold.toLocaleString()}
        </span>
      </div>

      {canClaimDaily && (
        <button
          onClick={onClaimDaily}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white px-4 py-2 rounded-full font-bold transition-all hover:scale-105 animate-bounce"
        >
          <span>🎁</span>
          일일 보상 받기
        </button>
      )}
    </div>
  )
}
