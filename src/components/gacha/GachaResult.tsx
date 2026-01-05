import { useState, useEffect } from 'react'
import type { GachaResult } from '../../types/gacha'
import { EQUIPMENT_SLOT_NAMES } from '../../types/equipment'
import { EquipmentImage } from '../equipment'
import { GiFastForwardButton } from 'react-icons/gi'

interface GachaResultDisplayProps {
  results: GachaResult[]
  onClose: () => void
}

export default function GachaResultDisplay({
  results,
  onClose,
}: GachaResultDisplayProps) {
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const isSinglePull = results.length === 1
  const allRevealed = revealedIndices.size >= results.length || showAll

  // Auto-reveal animation for single pull
  useEffect(() => {
    if (isSinglePull) {
      const timer = setTimeout(() => setRevealedIndices(new Set([0])), 500)
      return () => clearTimeout(timer)
    }
  }, [isSinglePull])

  // Skip animation
  const handleSkip = () => {
    setShowAll(true)
  }

  // Reveal specific card by index
  const handleRevealIndex = (index: number) => {
    setRevealedIndices(prev => new Set([...prev, index]))
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 overflow-y-auto"
      onClick={allRevealed ? onClose : undefined}
    >
      <div className="min-h-full flex flex-col items-center justify-center p-3 sm:p-4 py-8">
        <div className="relative max-w-4xl w-full">
          {/* Skip Button - Above cards */}
          {!allRevealed && (
            <div className="flex justify-end mb-3 sticky top-0 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSkip()
                }}
                className="text-gray-400 hover:text-white px-3 py-2 flex items-center gap-1.5 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors shadow-lg"
              >
                <GiFastForwardButton className="text-lg" />
                <span className="text-sm">전체 공개</span>
              </button>
            </div>
          )}

          {/* Single Pull Result */}
          {isSinglePull && (
            <div className="flex flex-col items-center">
              {revealedIndices.has(0) ? (
                <ResultCard result={results[0]} large />
              ) : (
                <div className="w-48 h-64 bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-4xl">✨</span>
                </div>
              )}
            </div>
          )}

          {/* Multi Pull Results - Responsive grid */}
          {!isSinglePull && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {results.map((result, index) => (
                <div key={index} className="aspect-[3/4]">
                  {revealedIndices.has(index) || showAll ? (
                    <ResultCard result={result} />
                  ) : (
                    <div
                      className="w-full h-full bg-gray-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-700 active:scale-95 hover:scale-105 transition-all border-2 border-gray-700 hover:border-purple-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRevealIndex(index)
                      }}
                    >
                      <span className="text-2xl sm:text-3xl">?</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Close Hint */}
          {allRevealed && (
            <div className="text-center mt-6 text-gray-400 animate-pulse">
              터치하여 닫기
            </div>
          )}

          {/* Summary for Multi Pull */}
          {!isSinglePull && allRevealed && (
            <div className="mt-4 bg-gray-800/80 rounded-xl p-3 sm:p-4">
              <h3 className="text-center text-white font-bold mb-2 text-sm sm:text-base">획득한 장비</h3>
              <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
                {(['weapon', 'hat', 'top', 'bottom', 'gloves', 'shoes', 'earring'] as const).map(slot => {
                  const count = results.filter(r => r.slot === slot).length
                  if (count === 0) return null
                  return (
                    <div key={slot} className="text-center">
                      <div className="text-base sm:text-lg font-bold text-white">
                        {count}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400">
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
        ${large ? 'w-48 p-6' : 'w-full h-full p-2 sm:p-3'}
        animate-[fadeIn_0.3s_ease-out]
      `}
    >
      {/* Equipment Icon */}
      <div className={`flex justify-center ${large ? 'mb-4' : 'mb-1 sm:mb-2'}`}>
        <EquipmentImage
          equipmentBase={equipment}
          starLevel={0}
          size={large ? 'xl' : 'md'}
        />
      </div>

      {/* Equipment Info */}
      <div className="text-center">
        <div className={`font-bold truncate text-white ${large ? 'text-lg' : 'text-[10px] sm:text-xs'}`}>
          {equipment.levels[0].name}
        </div>
        <div className={`text-gray-400 ${large ? 'text-sm' : 'text-[9px] sm:text-[10px]'}`}>
          {EQUIPMENT_SLOT_NAMES[equipment.slot]}
        </div>
      </div>

      {/* New Badge */}
      {result.isNew && (
        <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-green-500 text-white text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded">
          NEW
        </div>
      )}
    </div>
  )
}
