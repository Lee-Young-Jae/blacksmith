import type { UserEquipment } from '../../types/equipment'
import { getEquipmentDisplayName, getEquipmentComment } from '../../types/equipment'
import type { EnhanceResult } from '../../types/starforce'
import EquipmentImage from './EquipmentImage'

interface EquipmentEnhancePanelProps {
  equipment: UserEquipment | null
  isEnhancing: boolean
  isDestroyed: boolean
  lastResult: EnhanceResult | null
  gold: number

  // Calculated values
  currentLevel: number
  successRate: number
  maintainRate: number
  destroyRate: number
  enhanceCost: number
  currentCombatPower: number
  nextCombatPower: number
  combatPowerGain: number

  // Chance time
  consecutiveFails: number
  chanceTimeActive: boolean
  isNextSpecialLevel: boolean
  canDestroy: boolean

  // Actions
  onEnhance: () => Promise<EnhanceResult | null>
  onResetAfterDestroy: () => void
}

export default function EquipmentEnhancePanel({
  equipment,
  isEnhancing,
  isDestroyed,
  lastResult,
  gold,
  currentLevel,
  successRate,
  maintainRate,
  destroyRate,
  enhanceCost,
  currentCombatPower,
  nextCombatPower,
  combatPowerGain,
  consecutiveFails,
  chanceTimeActive,
  isNextSpecialLevel,
  canDestroy,
  onEnhance,
  onResetAfterDestroy,
}: EquipmentEnhancePanelProps) {
  if (!equipment) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">⬆️</div>
        <h2 className="text-xl font-bold text-white mb-2">장비 강화</h2>
        <p className="text-gray-400">좌측에서 강화할 장비를 선택하세요</p>
      </div>
    )
  }

  if (isDestroyed) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <div className="text-6xl mb-4 animate-pulse">💥</div>
        <h2 className="text-2xl font-bold text-red-400 mb-2">장비 파괴!</h2>
        <p className="text-gray-400 mb-6">
          {getEquipmentDisplayName(equipment)}이(가) 파괴되었습니다...
        </p>
        <button
          onClick={onResetAfterDestroy}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
        >
          다른 장비 선택
        </button>
      </div>
    )
  }

  const canAfford = gold >= enhanceCost
  const displayName = getEquipmentDisplayName(equipment)
  const comment = getEquipmentComment(equipment.equipmentBase, currentLevel)

  // Button style based on state
  let buttonBg = 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
  if (chanceTimeActive) {
    buttonBg = 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700'
  } else if (canDestroy) {
    buttonBg = 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700'
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-700/50 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="relative">
            <EquipmentImage equipment={equipment} size="xl" />
            {currentLevel > 0 && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {currentLevel}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{displayName}</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-yellow-400">★ {currentLevel}</span>
              <span className="text-gray-500">→</span>
              <span className="text-yellow-400">★ {currentLevel + 1}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-400 italic">"{comment}"</p>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-4">
        {/* Combat Power Change */}
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-400 mb-1">전투력 변화</div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg text-white">{currentCombatPower.toLocaleString()}</span>
            <span className="text-gray-500">→</span>
            <span className="text-lg text-yellow-400 font-bold">
              {nextCombatPower.toLocaleString()}
            </span>
            <span className="text-green-400 text-sm">(+{combatPowerGain.toLocaleString()})</span>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">강화 확률</span>
            {chanceTimeActive && (
              <span className="text-yellow-400 font-bold animate-pulse">찬스타임!</span>
            )}
          </div>

          {/* Unified probability bar */}
          <div className="h-8 rounded-lg overflow-hidden flex">
            {/* Success */}
            <div
              className="bg-green-500 flex items-center justify-center text-xs text-white font-bold transition-all"
              style={{ width: `${successRate}%` }}
            >
              {successRate > 15 && `${successRate}%`}
            </div>
            {/* Maintain */}
            <div
              className="bg-yellow-500 flex items-center justify-center text-xs text-black font-bold transition-all"
              style={{ width: `${maintainRate}%` }}
            >
              {maintainRate > 15 && `${maintainRate}%`}
            </div>
            {/* Destroy */}
            {destroyRate > 0 && (
              <div
                className="bg-red-500 flex items-center justify-center text-xs text-white font-bold transition-all"
                style={{ width: `${destroyRate}%` }}
              >
                {destroyRate > 10 && `${destroyRate}%`}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 text-xs">
            <span className="text-green-400">● 성공 {successRate}%</span>
            <span className="text-yellow-400">● 유지 {maintainRate}%</span>
            {destroyRate > 0 && (
              <span className="text-red-400">● 파괴 {destroyRate}%</span>
            )}
          </div>
        </div>

        {/* Warnings */}
        {isNextSpecialLevel && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 text-center">
            <span className="text-green-400 text-sm">🌟 다음 레벨은 100% 성공!</span>
          </div>
        )}

        {consecutiveFails > 0 && !chanceTimeActive && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-yellow-400">연속 실패</span>
              <span className="text-yellow-400 font-bold">{consecutiveFails}/2</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              2회 연속 실패 시 찬스타임 발동!
            </div>
          </div>
        )}

        {canDestroy && !chanceTimeActive && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-center">
            <span className="text-red-400 text-sm">⚠️ 실패 시 장비가 파괴될 수 있습니다!</span>
          </div>
        )}

        {/* Last Result */}
        {lastResult && !isEnhancing && (
          <div className={`
            rounded-lg p-3 text-center
            ${lastResult === 'success' ? 'bg-green-900/30 border border-green-500' : ''}
            ${lastResult === 'maintain' ? 'bg-yellow-900/30 border border-yellow-500' : ''}
            ${lastResult === 'destroy' ? 'bg-red-900/30 border border-red-500' : ''}
          `}>
            {lastResult === 'success' && (
              <div className="text-green-400">
                <span className="text-2xl">✨</span>
                <span className="ml-2 font-bold">강화 성공!</span>
              </div>
            )}
            {lastResult === 'maintain' && (
              <div className="text-yellow-400">
                <span className="text-2xl">😅</span>
                <span className="ml-2 font-bold">강화 실패... 레벨 유지</span>
              </div>
            )}
          </div>
        )}

        {/* Cost & Enhance Button */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">강화 비용</span>
            <span className={canAfford ? 'text-yellow-400' : 'text-red-400'}>
              {enhanceCost.toLocaleString()} G
            </span>
          </div>

          <button
            onClick={onEnhance}
            disabled={!canAfford || isEnhancing}
            className={`
              w-full py-4 rounded-lg font-bold text-lg transition-all
              ${canAfford && !isEnhancing
                ? `${buttonBg} text-white`
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isEnhancing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                강화 중...
              </span>
            ) : (
              <>
                {chanceTimeActive ? '🔥 찬스타임 강화!' : '⬆️ 강화하기'}
              </>
            )}
          </button>

          {!canAfford && (
            <div className="text-center text-sm text-red-400">
              골드가 부족합니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
