import { useState } from 'react'

interface GoldDisplayProps {
  gold: number
  canClaimDaily: boolean
  onClaimDaily: () => Promise<boolean>
}

export function GoldDisplay({ gold, canClaimDaily, onClaimDaily }: GoldDisplayProps) {
  const [isClaiming, setIsClaiming] = useState(false)

  const handleClaim = async () => {
    if (isClaiming) return  // 중복 클릭 방지

    setIsClaiming(true)
    try {
      await onClaimDaily()
    } finally {
      setIsClaiming(false)
    }
  }

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
          onClick={handleClaim}
          disabled={isClaiming}
          className={`btn btn-accent text-sm ${isClaiming ? 'opacity-50 cursor-not-allowed' : 'animate-bounce'}`}
        >
          {isClaiming ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <>
              <span>🎁</span>
              <span className="hidden sm:inline">일일 보상</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
