import { useState } from 'react'

interface EquipmentAcquireButtonProps {
  gold: number
  onAcquire: () => Promise<unknown>
  onUpdateGold: (newGold: number) => Promise<boolean>
}

const ACQUIRE_COST = 200

export default function EquipmentAcquireButton({
  gold,
  onAcquire,
  onUpdateGold,
}: EquipmentAcquireButtonProps) {
  const [isAcquiring, setIsAcquiring] = useState(false)

  const canAfford = gold >= ACQUIRE_COST

  const handleAcquire = async () => {
    if (!canAfford || isAcquiring) return

    setIsAcquiring(true)
    try {
      await onUpdateGold(gold - ACQUIRE_COST)
      await onAcquire()
    } finally {
      setIsAcquiring(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🎁</span>
        장비 획득
      </h3>

      {/* Cost display */}
      <div className="text-sm text-gray-400 mb-4">
        비용: <span className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
          {ACQUIRE_COST.toLocaleString()}G
        </span>
        {!canAfford && <span className="text-red-400 ml-2">(골드 부족)</span>}
      </div>

      {/* Acquire button */}
      <button
        onClick={handleAcquire}
        disabled={!canAfford || isAcquiring}
        className={`
          w-full py-3 rounded-lg font-bold text-lg transition-all
          ${canAfford && !isAcquiring
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {isAcquiring ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            획득 중...
          </span>
        ) : (
          '랜덤 장비 획득'
        )}
      </button>

      <p className="text-xs text-gray-500 mt-2 text-center">
        랜덤 슬롯의 장비를 획득합니다
      </p>
    </div>
  )
}
