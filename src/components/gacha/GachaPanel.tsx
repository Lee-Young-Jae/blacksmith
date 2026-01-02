import type { GachaResult } from '../../types/gacha'
import { GACHA_SINGLE_COST, GACHA_MULTI_COST } from '../../types/gacha'
import GachaResultDisplay from './GachaResult'

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
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">장비 뽑기</h2>
        <p className="text-sm text-white/80">
          랜덤한 장비를 획득하세요!
        </p>
        <div className="mt-4 bg-black/30 rounded-lg p-3 inline-block">
          <div className="text-xs text-white/70">총 뽑기 횟수</div>
          <div className="text-xl font-bold text-white">{pullCount}회</div>
        </div>
      </div>

      {/* Pull Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Single Pull */}
        <button
          onClick={() => onPullSingle(gold)}
          disabled={!canAffordSingle || isAnimating}
          className={`
            py-4 rounded-xl font-bold text-lg transition-all
            ${canAffordSingle && !isAnimating
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isAnimating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
          ) : (
            <>
              <div>1회 뽑기</div>
              <div className={`text-sm ${canAffordSingle ? 'text-blue-200' : 'text-gray-500'}`}>
                {GACHA_SINGLE_COST.toLocaleString()}G
              </div>
            </>
          )}
        </button>

        {/* Multi Pull */}
        <button
          onClick={() => onPullMulti(gold)}
          disabled={!canAffordMulti || isAnimating}
          className={`
            py-4 rounded-xl font-bold text-lg transition-all relative overflow-hidden
            ${canAffordMulti && !isAnimating
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {canAffordMulti && !isAnimating && (
            <div className="absolute top-1 right-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">
              10% 할인
            </div>
          )}
          {isAnimating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
          ) : (
            <>
              <div>10회 뽑기</div>
              <div className={`text-sm ${canAffordMulti ? 'text-purple-200' : 'text-gray-500'}`}>
                {GACHA_MULTI_COST.toLocaleString()}G
              </div>
            </>
          )}
        </button>
      </div>

      {/* Gold Display */}
      <div className="text-center">
        <span className="text-gray-400">보유 골드: </span>
        <span className="text-yellow-400 font-bold text-lg">
          {gold.toLocaleString()}G
        </span>
      </div>

      {/* Info */}
      <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-400 space-y-2">
        <div>뽑기로 획득한 장비의 잠재옵션 슬롯은 잠겨 있습니다.</div>
        <div>골드를 사용하여 슬롯을 해제하고 잠재능력을 활성화하세요.</div>
      </div>
    </div>
  )
}
