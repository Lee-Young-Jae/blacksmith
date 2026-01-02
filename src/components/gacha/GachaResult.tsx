import { useState, useEffect } from 'react'
import type { GachaResult } from '../../types/gacha'
import { EQUIPMENT_SLOT_NAMES } from '../../types/equipment'
import { EquipmentImage } from '../equipment'

interface GachaResultDisplayProps {
  results: GachaResult[]
  onClose: () => void
}

export default function GachaResultDisplay({
  results,
  onClose,
}: GachaResultDisplayProps) {
  const [revealedCount, setRevealedCount] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const isSinglePull = results.length === 1
  const allRevealed = revealedCount >= results.length

  // Auto-reveal animation for single pull
  useEffect(() => {
    if (isSinglePull) {
      const timer = setTimeout(() => setRevealedCount(1), 500)
      return () => clearTimeout(timer)
    }
  }, [isSinglePull])

  // Skip animation
  const handleSkip = () => {
    setRevealedCount(results.length)
    setShowAll(true)
  }

  // Reveal next card
  const handleRevealNext = () => {
    if (revealedCount < results.length) {
      setRevealedCount(prev => prev + 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
      onClick={allRevealed ? onClose : handleRevealNext}
    >
      <div className="relative max-w-4xl w-full">
        {/* Skip Button */}
        {!allRevealed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSkip()
            }}
            className="absolute top-0 right-0 text-gray-400 hover:text-white text-sm px-4 py-2"
          >
            스킵 →
          </button>
        )}

        {/* Single Pull Result */}
        {isSinglePull && (
          <div className="flex flex-col items-center">
            {revealedCount > 0 ? (
              <ResultCard result={results[0]} large />
            ) : (
              <div className="w-48 h-64 bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-4xl">✨</span>
              </div>
            )}
          </div>
        )}

        {/* Multi Pull Results */}
        {!isSinglePull && (
          <div className="grid grid-cols-5 gap-3">
            {results.map((result, index) => (
              <div key={index} className="aspect-[3/4]">
                {index < revealedCount || showAll ? (
                  <ResultCard result={result} />
                ) : (
                  <div
                    className="w-full h-full bg-gray-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRevealNext()
                    }}
                  >
                    <span className="text-2xl">?</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Close Hint */}
        {allRevealed && (
          <div className="text-center mt-8 text-gray-400 animate-pulse">
            터치하여 닫기
          </div>
        )}

        {/* Summary for Multi Pull */}
        {!isSinglePull && allRevealed && (
          <div className="mt-6 bg-gray-800/80 rounded-xl p-4">
            <h3 className="text-center text-white font-bold mb-3">획득한 장비</h3>
            <div className="flex justify-center gap-4 flex-wrap">
              {(['weapon', 'hat', 'top', 'bottom', 'gloves', 'shoes', 'earring'] as const).map(slot => {
                const count = results.filter(r => r.slot === slot).length
                if (count === 0) return null
                return (
                  <div key={slot} className="text-center">
                    <div className="text-lg font-bold text-white">
                      {count}
                    </div>
                    <div className="text-xs text-gray-400">
                      {EQUIPMENT_SLOT_NAMES[slot]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ResultCardProps {
  result: GachaResult
  large?: boolean
}

function ResultCard({ result, large }: ResultCardProps) {
  const { equipment } = result

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden transition-all duration-500
        bg-gray-700/50 border-2 border-gray-600
        ${large ? 'w-48 p-6' : 'w-full h-full p-3'}
        animate-[fadeIn_0.3s_ease-out]
      `}
    >
      {/* Equipment Icon */}
      <div className={`flex justify-center ${large ? 'mb-4' : 'mb-2'}`}>
        <EquipmentImage
          equipmentBase={equipment}
          starLevel={0}
          size={large ? 'xl' : 'lg'}
        />
      </div>

      {/* Equipment Info */}
      <div className="text-center">
        <div className={`font-bold truncate text-white ${large ? 'text-lg' : 'text-xs'}`}>
          {equipment.levels[0].name}
        </div>
        <div className={`text-gray-400 ${large ? 'text-sm' : 'text-[10px]'}`}>
          {EQUIPMENT_SLOT_NAMES[equipment.slot]}
        </div>
      </div>

      {/* New Badge */}
      {result.isNew && (
        <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          NEW
        </div>
      )}
    </div>
  )
}
