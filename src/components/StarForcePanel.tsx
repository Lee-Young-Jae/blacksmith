import { ChanceTimeIndicator } from './ChanceTimeIndicator'
import type { EnhanceResult } from '../types/starforce'

interface StarForcePanelProps {
  level: number
  successRate: number
  maintainRate: number
  destroyRate: number
  consecutiveFails: number
  chanceTimeActive: boolean
  isNextSpecialLevel: boolean
  isEnhancing: boolean
  isDestroyed: boolean
  lastResult: EnhanceResult | null
  gold: number
  enhanceCost: number
  currentAttackBonus: number
  nextAttackBonus: number
  canDestroy: boolean
  blacksmithComment: string
  nextLevelComment: string
  onEnhance: () => void
  onGetNewWeapon: () => void
}

export function StarForcePanel({
  level,
  successRate,
  maintainRate,
  destroyRate,
  consecutiveFails,
  chanceTimeActive,
  isNextSpecialLevel,
  isEnhancing,
  isDestroyed,
  lastResult,
  gold,
  enhanceCost,
  currentAttackBonus,
  nextAttackBonus,
  canDestroy,
  blacksmithComment,
  nextLevelComment,
  onEnhance,
  onGetNewWeapon,
}: StarForcePanelProps) {
  const canAfford = gold >= enhanceCost
  const isFirstDestroyLevel = level === 11 && !canDestroy

  // 파괴된 경우
  if (isDestroyed) {
    return (
      <div className="bg-gray-800/90 backdrop-blur rounded-2xl p-6 w-full max-w-sm border border-gray-700/50 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-900/30 flex items-center justify-center">
            <span className="text-5xl">💔</span>
          </div>
          <h3 className="text-xl font-bold text-red-400">무기가 파괴되었습니다</h3>
          <p className="text-gray-400 mt-2 text-sm">새로운 무기를 획득하여 다시 도전하세요</p>
        </div>

        {/* 대장장이 위로 */}
        <div className="mb-6 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">👨‍🔧</span>
            <div>
              <p className="text-amber-300 text-sm font-medium">대장장이</p>
              <p className="text-gray-300 text-sm mt-1 italic">
                "이런... 아쉽군. 하지만 포기하지 마라, 더 좋은 무기가 기다리고 있을 거야!"
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onGetNewWeapon}
          className="w-full py-4 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/20"
        >
          🎲 새 무기 획득하기
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/90 backdrop-blur rounded-2xl p-6 w-full max-w-sm border border-gray-700/50 shadow-xl">
      {/* 현재 레벨 헤더 */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-full">
          <span className="text-yellow-400 text-lg">⭐</span>
          <span className="text-white font-bold text-lg">{level}성</span>
          <span className="text-gray-400">→</span>
          <span className="text-green-400 font-bold text-lg">{level + 1}성</span>
        </div>
      </div>

      {/* 특별 레벨 표시 */}
      {isNextSpecialLevel && (
        <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl text-center">
          <p className="text-yellow-400 font-bold text-lg">🌟 특별 구간!</p>
          <p className="text-yellow-300 text-sm">다음 강화 100% 성공 보장</p>
        </div>
      )}

      {/* 12성 첫 도전 경고 */}
      {isFirstDestroyLevel && (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <p className="text-red-400 font-bold">주의! 위험 구간 진입</p>
          </div>
          <p className="text-gray-300 text-sm">
            12성부터는 강화 실패 시 무기가 파괴될 수 있습니다.
          </p>
        </div>
      )}

      {/* 찬스타임 표시 */}
      <div className="mb-4">
        <ChanceTimeIndicator
          consecutiveFails={consecutiveFails}
          isActive={chanceTimeActive}
        />
      </div>

      {/* 확률 표시 - 통합 바 */}
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-2 text-gray-400">
          <span>확률</span>
          <div className="flex gap-3">
            <span className="text-green-400">성공 {successRate}%</span>
            <span className="text-gray-400">유지 {maintainRate}%</span>
            {canDestroy && <span className="text-red-400">파괴 {destroyRate}%</span>}
          </div>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
            style={{ width: `${successRate}%` }}
          />
          <div
            className="h-full bg-gray-500 transition-all duration-500"
            style={{ width: `${maintainRate}%` }}
          />
          {canDestroy && (
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
              style={{ width: `${destroyRate}%` }}
            />
          )}
        </div>
      </div>

      {/* 파괴 경고 */}
      {canDestroy && !chanceTimeActive && !isFirstDestroyLevel && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm text-center flex items-center justify-center gap-2">
            <span>💀</span>
            <span>실패 시 {destroyRate}% 확률로 파괴</span>
          </p>
        </div>
      )}

      {/* 정보 카드들 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* 공격력 변화 */}
        <div className="p-3 bg-gray-700/30 rounded-xl border border-gray-600/30">
          <p className="text-gray-400 text-xs mb-1">공격력</p>
          <p className="text-white font-bold">
            +{currentAttackBonus} <span className="text-green-400">→ +{nextAttackBonus}</span>
          </p>
        </div>

        {/* 비용 표시 */}
        <div className="p-3 bg-gray-700/30 rounded-xl border border-gray-600/30">
          <p className="text-gray-400 text-xs mb-1">강화 비용</p>
          <p className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
            🪙 {enhanceCost.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 결과 메시지 + 대장장이 코멘트 */}
      {lastResult && (
        <div
          className={`mb-5 p-4 rounded-xl border ${
            lastResult === 'success'
              ? 'bg-green-900/20 border-green-500/30'
              : lastResult === 'destroy'
                ? 'bg-red-900/20 border-red-500/30'
                : 'bg-gray-700/30 border-gray-600/30'
          }`}
        >
          {/* 결과 헤더 */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {lastResult === 'success' && (
              <>
                <span className="text-2xl">🎉</span>
                <span className="text-green-400 font-bold text-lg">강화 성공!</span>
              </>
            )}
            {lastResult === 'maintain' && (
              <>
                <span className="text-2xl">😢</span>
                <span className="text-gray-300 font-bold text-lg">실패 (레벨 유지)</span>
              </>
            )}
            {lastResult === 'destroy' && (
              <>
                <span className="text-2xl">💥</span>
                <span className="text-red-400 font-bold text-lg">무기 파괴!</span>
              </>
            )}
          </div>

          {/* 대장장이 코멘트 */}
          <div className="flex items-start gap-3 pt-3 border-t border-gray-600/30">
            <span className="text-xl">👨‍🔧</span>
            <div>
              <p className="text-amber-300 text-xs font-medium">대장장이</p>
              <p className="text-gray-300 text-sm mt-1 italic">
                "{lastResult === 'success' ? nextLevelComment : blacksmithComment}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 대장장이 코멘트 (결과가 없을 때) */}
      {!lastResult && (
        <div className="mb-5 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30">
          <div className="flex items-start gap-3">
            <span className="text-xl">👨‍🔧</span>
            <div>
              <p className="text-amber-300 text-xs font-medium">대장장이</p>
              <p className="text-gray-300 text-sm mt-1 italic">"{blacksmithComment}"</p>
            </div>
          </div>
        </div>
      )}

      {/* 강화 버튼 */}
      <button
        onClick={onEnhance}
        disabled={isEnhancing || !canAfford}
        className={`w-full py-4 px-4 font-bold rounded-xl transition-all ${
          isEnhancing
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : !canAfford
              ? 'bg-gray-600 text-red-400 cursor-not-allowed'
              : chanceTimeActive
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:scale-[1.02] shadow-lg shadow-yellow-500/20'
                : canDestroy
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:scale-[1.02] shadow-lg shadow-red-500/20'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-[1.02] shadow-lg shadow-purple-500/20'
        }`}
      >
        {isEnhancing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            강화 중...
          </span>
        ) : !canAfford ? (
          '💰 골드가 부족합니다'
        ) : chanceTimeActive ? (
          `🌟 ${level + 1}성 강화 (100% 성공!)`
        ) : canDestroy ? (
          `⚔️ ${level + 1}성 강화 (위험!)`
        ) : (
          `⭐ ${level + 1}성 강화하기`
        )}
      </button>

      {/* 도움말 */}
      <p className="text-gray-500 text-xs text-center mt-3">
        {chanceTimeActive
          ? '찬스타임! 이번 강화는 무조건 성공합니다'
          : consecutiveFails === 1
            ? '1회 더 실패하면 찬스타임!'
            : '2연속 실패 시 찬스타임 발동'}
      </p>
    </div>
  )
}
