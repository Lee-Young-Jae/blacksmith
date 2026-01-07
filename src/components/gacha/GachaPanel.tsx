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
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-magic)] p-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">장비 뽑기</h2>
          <p className="text-sm text-white/80">
            랜덤한 장비를 획득하세요!
          </p>
          <div className="mt-4 bg-black/30 rounded-lg p-3 inline-block">
            <div className="text-xs text-white/70">총 뽑기 횟수</div>
            <div className="text-xl font-bold text-white">{pullCount}회</div>
          </div>
        </div>
      </div>

      {/* Pull Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Single Pull */}
        <button
          id="gacha-pull-button"
          onClick={() => onPullSingle(gold)}
          disabled={!canAffordSingle || isAnimating}
          className={`btn py-4 min-h-[80px] min-w-[140px] flex-col ${canAffordSingle && !isAnimating ? 'btn-primary' : 'btn-ghost opacity-50'}`}
        >
          <div className="font-bold text-base">
            {isAnimating ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              '1회 뽑기'
            )}
          </div>
          <div className={`text-sm opacity-80 ${isAnimating ? 'invisible' : ''}`}>
            {GACHA_SINGLE_COST.toLocaleString()}G
          </div>
        </button>

        {/* Multi Pull */}
        <button
          id="gacha-pull-multi-button"
          onClick={() => onPullMulti(gold)}
          disabled={!canAffordMulti || isAnimating}
          className={`btn py-4 min-h-[80px] min-w-[140px] flex-col relative overflow-hidden ${canAffordMulti && !isAnimating ? 'btn-magic' : 'btn-ghost opacity-50'}`}
        >
          {canAffordMulti && !isAnimating && (
            <div className="absolute top-1 right-2 text-xs bg-[var(--color-accent)] text-black px-1.5 py-0.5 rounded font-bold">
              10% 할인
            </div>
          )}
          <div className="font-bold text-base">
            {isAnimating ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              '10회 뽑기'
            )}
          </div>
          <div className={`text-sm opacity-80 ${isAnimating ? 'invisible' : ''}`}>
            {GACHA_MULTI_COST.toLocaleString()}G
          </div>
        </button>
      </div>

      {/* Gold Display */}
      <div className="text-center">
        <span className="text-[var(--color-text-secondary)]">보유 골드: </span>
        <span className="text-[var(--color-accent)] font-bold text-lg">
          {gold.toLocaleString()}G
        </span>
      </div>

      {/* Info */}
      <div className="info-box space-y-2 text-sm text-[var(--color-text-secondary)]">
        <div>뽑기로 획득한 장비의 잠재옵션 슬롯은 잠겨 있습니다.</div>
        <div>골드를 사용하여 슬롯을 해제하고 잠재능력을 활성화하세요.</div>
      </div>
    </div>
  )
}
