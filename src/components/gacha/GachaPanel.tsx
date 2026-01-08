import { useMemo } from 'react'
import type { GachaResult } from '../../types/gacha'
import { GACHA_SINGLE_COST, GACHA_MULTI_COST } from '../../types/gacha'
import GachaResultDisplay from './GachaResult'
import { GiAnvil, GiHammerNails, GiFireBowl, GiMetalBar } from 'react-icons/gi'
import { FaFire } from 'react-icons/fa'

interface GachaPanelProps {
  gold: number
  pullCount: number
  isAnimating: boolean
  lastResults: GachaResult[] | null
  onPullSingle: (gold: number) => Promise<GachaResult | null>
  onPullMulti: (gold: number) => Promise<unknown>
  onClearResults: () => void
}

export default function GachaPanel({
  gold,
  pullCount,
  isAnimating,
  lastResults,
  onPullSingle,
  onPullMulti,
  onClearResults,
}: GachaPanelProps) {
  const canAffordSingle = gold >= GACHA_SINGLE_COST
  const canAffordMulti = gold >= GACHA_MULTI_COST

  // 불꽃 애니메이션용 고정 랜덤 값 (리렌더링에도 유지)
  const embers = useMemo(() =>
    [...Array(8)].map((_, i) => ({
      id: i,
      left: 20 + (i * 7.5) + (Math.random() * 5), // 분산된 위치
      duration: 3 + Math.random() * 2,
      delay: -(Math.random() * 3), // 음수로 애니메이션 중간부터 시작
      size: 0.8 + Math.random() * 0.4,
    }))
  , [])

  // Show results if we have any
  if (lastResults && lastResults.length > 0) {
    return (
      <GachaResultDisplay
        results={lastResults}
        onClose={onClearResults}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Forge Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-700/30">
        {/* Background with fire glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-orange-600/20 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-red-500/30 blur-[40px] rounded-full animate-pulse" />

        {/* Floating embers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {embers.map((ember) => (
            <div
              key={ember.id}
              className="absolute bg-orange-400 rounded-full animate-float-up"
              style={{
                left: `${ember.left}%`,
                bottom: '10%',
                width: `${ember.size * 4}px`,
                height: `${ember.size * 4}px`,
                animationDelay: `${ember.delay}s`,
                animationDuration: `${ember.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative p-6 text-center">
          {/* Anvil Icon */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              <GiAnvil className="text-5xl text-amber-400 drop-shadow-lg" />
              <FaFire className="absolute -top-2 -right-2 text-xl text-orange-500 animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-amber-100 mb-1">대장간</h2>
          <p className="text-sm text-amber-200/60">
            뜨거운 화로에서 새로운 장비를 단조하세요
          </p>

          {/* Stats */}
          <div className="mt-4 flex justify-center gap-4">
            <div className="bg-stone-900/60 rounded-lg px-4 py-2 border border-amber-700/30">
              <div className="text-xs text-amber-200/50">총 단조</div>
              <div className="text-lg font-bold text-amber-100 flex items-center justify-center gap-1">
                <GiHammerNails className="text-amber-400" />
                {pullCount}회
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forge Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Single Forge */}
        <button
          id="gacha-pull-button"
          onClick={() => onPullSingle(gold)}
          disabled={!canAffordSingle || isAnimating}
          className={`
            relative overflow-hidden rounded-xl py-4 min-h-[100px] flex flex-col items-center justify-center gap-2
            transition-all duration-300
            ${canAffordSingle && !isAnimating
              ? 'bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 border-2 border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-900/50 hover:shadow-amber-700/50 active:scale-95'
              : 'bg-stone-800/50 border border-stone-700/50 opacity-50 cursor-not-allowed'
            }
          `}
        >
          {/* Fire glow effect */}
          {canAffordSingle && !isAnimating && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-10 bg-orange-500/30 blur-xl rounded-full" />
          )}

          <div className="relative z-10">
            {isAnimating ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <GiFireBowl className="text-2xl text-amber-300 animate-pulse" />
              </div>
            ) : (
              <GiMetalBar className="text-2xl text-amber-200" />
            )}
          </div>

          <div className="relative z-10 font-bold text-amber-100">
            {isAnimating ? '단조 중...' : '1회 단조'}
          </div>

          <div className={`relative z-10 text-sm text-amber-200/70 ${isAnimating ? 'invisible' : ''}`}>
            {GACHA_SINGLE_COST.toLocaleString()}G
          </div>
        </button>

        {/* Multi Forge */}
        <button
          id="gacha-pull-multi-button"
          onClick={() => onPullMulti(gold)}
          disabled={!canAffordMulti || isAnimating}
          className={`
            relative overflow-hidden rounded-xl py-4 min-h-[100px] flex flex-col items-center justify-center gap-2
            transition-all duration-300
            ${canAffordMulti && !isAnimating
              ? 'bg-gradient-to-b from-orange-600 to-red-900 hover:from-orange-500 hover:to-red-800 border-2 border-orange-400/50 hover:border-orange-300 shadow-lg shadow-red-900/50 hover:shadow-orange-700/50 active:scale-95'
              : 'bg-stone-800/50 border border-stone-700/50 opacity-50 cursor-not-allowed'
            }
          `}
        >
          {/* Fire glow effect */}
          {canAffordMulti && !isAnimating && (
            <>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-12 bg-orange-500/40 blur-xl rounded-full animate-pulse" />
              <div className="absolute top-1 right-2 text-xs bg-amber-400 text-stone-900 px-1.5 py-0.5 rounded font-bold">
                10% 할인
              </div>
            </>
          )}

          <div className="relative z-10">
            {isAnimating ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <GiFireBowl className="text-2xl text-orange-300 animate-pulse" />
              </div>
            ) : (
              <div className="relative">
                <GiMetalBar className="text-2xl text-orange-200" />
                <span className="absolute -top-1 -right-3 text-xs font-bold text-orange-300">x10</span>
              </div>
            )}
          </div>

          <div className="relative z-10 font-bold text-orange-100">
            {isAnimating ? '단조 중...' : '10회 단조'}
          </div>

          <div className={`relative z-10 text-sm text-orange-200/70 ${isAnimating ? 'invisible' : ''}`}>
            {GACHA_MULTI_COST.toLocaleString()}G
          </div>
        </button>
      </div>

      {/* Gold Display */}
      <div className="text-center py-3 px-4 rounded-xl bg-stone-800/50 border border-stone-700/50">
        <span className="text-amber-200/60">보유 골드: </span>
        <span className="text-amber-400 font-bold text-lg">
          {gold.toLocaleString()}G
        </span>
      </div>

      {/* Info */}
      <div className="rounded-xl bg-stone-800/30 border border-amber-900/30 p-4 space-y-2 text-sm text-amber-200/50">
        <div className="flex items-start gap-2">
          <GiHammerNails className="text-amber-600 mt-0.5 flex-shrink-0" />
          <span>단조로 획득한 장비의 잠재옵션 슬롯은 잠겨 있습니다.</span>
        </div>
        <div className="flex items-start gap-2">
          <GiFireBowl className="text-orange-600 mt-0.5 flex-shrink-0" />
          <span>골드를 사용하여 슬롯을 해제하고 잠재능력을 활성화하세요.</span>
        </div>
      </div>
    </div>
  )
}
