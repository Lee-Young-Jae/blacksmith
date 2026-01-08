import { useState } from 'react'
import type { UserEquipment } from '../../types/equipment'
import {
  getEquipmentDisplayName,
  getEquipmentComment,
  getMilestoneBonus,
  getNextMilestone,
  isMilestoneLevel,
  STARFORCE_MILESTONES,
} from '../../types/equipment'
import type { EnhanceResult } from '../../types/starforce'
import type { CharacterStats } from '../../types/stats'
import { formatNumberString } from '../../types/stats'
import type { EnhancementTicket } from '../../hooks/useEnhancementTickets'
import { GiAnvilImpact, GiUpgrade, GiTicket } from 'react-icons/gi'

interface StatChanges {
  attack: number
  defense: number
  hp: number
}

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
  currentStats: CharacterStats | null
  statChanges: StatChanges | null

  // Chance time
  consecutiveFails: number
  chanceTimeActive: boolean
  isMaxLevel: boolean
  isNextSpecialLevel: boolean
  canDestroy: boolean

  // Actions
  onEnhance: () => Promise<EnhanceResult | null>
  onResetAfterDestroy: () => void

  // Enhancement tickets (optional)
  availableTickets?: EnhancementTicket[]
  allTickets?: EnhancementTicket[]  // 모든 보유 강화권 (요약 표시용)
  onUseTicket?: (ticketLevel: number) => Promise<void>
  isUsingTicket?: boolean
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
  currentStats,
  statChanges,
  consecutiveFails,
  chanceTimeActive,
  isMaxLevel,
  isNextSpecialLevel,
  canDestroy,
  onEnhance,
  onResetAfterDestroy,
  availableTickets = [],
  allTickets = [],
  onUseTicket,
  isUsingTicket = false,
}: EquipmentEnhancePanelProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!equipment) {
    return (
      <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-600/30 flex items-center justify-center">
            <GiAnvilImpact className="text-3xl text-amber-500" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-amber-100 mb-2">장비 강화</h2>
          <p className="text-stone-400 text-sm mb-4">위에서 강화할 장비를 선택하세요</p>

          {/* 비활성화된 강화 버튼 (튜토리얼용 ID 포함) */}
          <button
            id="enhance-button"
            disabled
            className="w-full max-w-xs mx-auto min-h-[56px] sm:min-h-[52px] text-base font-bold rounded-xl bg-stone-700 text-stone-400 opacity-50 cursor-not-allowed"
          >
            강화하기
          </button>

          {/* 보유 강화권 표시 */}
          {allTickets.length > 0 && (
            <div className="mt-6 p-3 rounded-lg bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 text-left">
              <div className="flex items-center gap-2 mb-2">
                <GiTicket className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">보유 강화권</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {allTickets.map((ticket) => (
                  <div
                    key={ticket.ticketLevel}
                    className="flex items-center gap-1.5 px-2 py-1 bg-stone-800/50 rounded-lg border border-stone-700/50"
                  >
                    <img
                      src={`/images/tickets/${ticket.ticketLevel}.png`}
                      alt={`${ticket.ticketLevel}성 강화권`}
                      className="w-5 h-5 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <span className="text-amber-300 text-sm font-medium">{ticket.ticketLevel}성</span>
                    <span className="text-stone-400 text-xs">x{ticket.quantity}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-stone-500 mt-2 text-center">
                장비를 선택하면 강화권을 사용할 수 있습니다
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isDestroyed) {
    return (
      <div className="rounded-2xl border border-red-700/30 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-900/30 border border-red-600/50 flex items-center justify-center animate-pulse">
            <span className="text-3xl font-bold text-red-500">X</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-red-400 mb-2">장비 파괴!</h2>
          <p className="text-stone-400 text-sm mb-4 sm:mb-6">
            {getEquipmentDisplayName(equipment)}이(가) 파괴되었습니다...
          </p>
          <button
            onClick={onResetAfterDestroy}
            className="px-6 py-3 rounded-xl border border-stone-600 text-stone-300 hover:bg-stone-800 hover:border-amber-700/50 transition-all"
          >
            다른 장비 선택
          </button>
        </div>
      </div>
    )
  }

  // 최대 레벨 도달
  if (isMaxLevel) {
    return (
      <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(251,191,36,0.5)]">
            <span className="text-2xl font-bold text-white">★25</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-amber-400 mb-2">최대 강화 달성!</h2>
          <p className="text-stone-300 text-sm mb-2">
            {getEquipmentDisplayName(equipment)}
          </p>
          <p className="text-stone-500 text-xs">
            더 이상 강화할 수 없습니다
          </p>
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-600/30">
            <div className="text-xs text-amber-200/60 mb-1">전투력</div>
            <div className="text-xl font-bold text-amber-400">{currentCombatPower.toLocaleString()}</div>
          </div>
        </div>
      </div>
    )
  }

  const canAfford = gold >= enhanceCost
  const comment = getEquipmentComment(equipment.equipmentBase, currentLevel)

  return (
    <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
      {/* Header - 간소화된 레벨 변화 표시 */}
      <div className={`p-4 border-b border-amber-700/30 ${chanceTimeActive ? 'bg-gradient-to-r from-amber-900/40 to-orange-900/30' : 'bg-gradient-to-r from-amber-900/20 to-transparent'}`}>
        <div className="flex flex-col items-center gap-3">
          {/* 레벨 변화 표시 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-4 py-2 rounded-lg bg-stone-800/80 border border-stone-700/50">
              <span className="text-amber-400 text-lg">★</span>
              <span className="text-amber-100 font-bold text-xl">{currentLevel}</span>
            </div>
            <span className="text-stone-500 text-2xl">→</span>
            <div className="flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-600/50">
              <span className="text-amber-400 text-lg">★</span>
              <span className="text-amber-400 font-bold text-xl">{currentLevel + 1}</span>
            </div>
          </div>

          {/* 대장장이 코멘트 */}
          <p className="text-sm text-stone-400 italic text-center">"{comment}"</p>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3 sm:space-y-4">
        {/* 전투력 변화 */}
        <div className="p-3 rounded-lg bg-stone-800/50 border border-stone-700/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-400">전투력</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-100">{currentCombatPower.toLocaleString()}</span>
              <span className="text-stone-500">→</span>
              <span className="text-sm text-amber-400 font-bold">
                {nextCombatPower.toLocaleString()}
              </span>
              <span className="text-green-400 text-xs font-medium bg-green-900/30 px-1.5 py-0.5 rounded border border-green-700/30">
                +{combatPowerGain.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 장비 스탯 전체 */}
        {currentStats && statChanges && (
          <div className="p-3 rounded-lg bg-stone-800/50 border border-stone-700/50">
            <div className="text-xs text-stone-500 mb-2">장비 스탯</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {/* 공격력 - 스타포스 증가 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">공격력</span>
                <div className="text-xs">
                  <span className="text-amber-100">{currentStats.attack}</span>
                  {statChanges.attack > 0 && (
                    <span className="text-green-400 ml-1">+{statChanges.attack}</span>
                  )}
                </div>
              </div>
              {/* 방어력 - 스타포스 증가 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">방어력</span>
                <div className="text-xs">
                  <span className="text-amber-100">{currentStats.defense}</span>
                  {statChanges.defense > 0 && (
                    <span className="text-green-400 ml-1">+{statChanges.defense}</span>
                  )}
                </div>
              </div>
              {/* HP - 스타포스 증가 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">HP</span>
                <div className="text-xs">
                  <span className="text-amber-100">{currentStats.hp}</span>
                  {statChanges.hp > 0 && (
                    <span className="text-green-400 ml-1">+{statChanges.hp}</span>
                  )}
                </div>
              </div>
              {/* 치명타 확률 - 잠재옵션만 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">치명타</span>
                <span className="text-xs text-amber-100">{formatNumberString(currentStats.critRate)}%</span>
              </div>
              {/* 치명타 데미지 - 잠재옵션만 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">치명타 피해</span>
                <span className="text-xs text-amber-100">{formatNumberString(currentStats.critDamage)}%</span>
              </div>
              {/* 관통력 - 잠재옵션만 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">관통력</span>
                <span className="text-xs text-amber-100">{formatNumberString(currentStats.penetration)}%</span>
              </div>
              {/* 공격속도 - 잠재옵션만 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">공격속도</span>
                <span className="text-xs text-amber-100">{formatNumberString(currentStats.attackSpeed)}%</span>
              </div>
              {/* 회피율 - 잠재옵션만 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">회피율</span>
                <span className="text-xs text-amber-100">{formatNumberString(currentStats.evasion)}%</span>
              </div>
            </div>
            {/* 스타포스 안내 */}
            {statChanges.attack === 0 && statChanges.defense === 0 && statChanges.hp === 0 && (
              <div className="mt-2 pt-2 border-t border-stone-700/50 text-center">
                <span className="text-[10px] text-stone-500">
                  이 장비는 스타포스로 스탯이 증가하지 않습니다
                </span>
              </div>
            )}
          </div>
        )}

        {/* 마일스톤 보너스 표시 */}
        {equipment && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <GiUpgrade className="text-purple-400" />
              <span className="text-xs font-bold text-purple-300">마일스톤 보너스</span>
            </div>

            {/* 현재 적용 중인 보너스 */}
            {getMilestoneBonus(currentLevel) > 0 && (
              <div className="text-xs text-purple-200 mb-2">
                현재: <span className="font-bold text-purple-400">+{getMilestoneBonus(currentLevel)}% 올스탯</span>
              </div>
            )}

            {/* 다음 마일스톤 안내 */}
            {getNextMilestone(currentLevel) && (
              <div className="text-xs text-gray-400">
                다음 ({getNextMilestone(currentLevel)!.level}성):
                <span className="text-purple-300 ml-1">+{getNextMilestone(currentLevel)!.bonus}% 올스탯</span>
              </div>
            )}

            {/* 다음 강화가 마일스톤인 경우 강조 */}
            {isMilestoneLevel(currentLevel + 1) && (
              <div className="mt-2 py-1.5 px-2 bg-purple-600/30 rounded text-center animate-pulse">
                <span className="text-xs font-bold text-purple-200">
                  🎉 다음 강화 시 +{STARFORCE_MILESTONES[currentLevel + 1]}% 올스탯 획득!
                </span>
              </div>
            )}

            {/* 마일스톤 진행도 표시 */}
            <div className="flex gap-1 mt-2">
              {Object.keys(STARFORCE_MILESTONES).map((level) => {
                const lvl = parseInt(level);
                const isAchieved = currentLevel >= lvl;
                return (
                  <div
                    key={level}
                    className={`flex-1 text-center py-1 rounded text-[10px] ${
                      isAchieved
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-gray-700 text-gray-500'
                    }`}
                  >
                    {level}★
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 확률 섹션 - 간소화 */}
        <div className="space-y-2">
          {/* 메인 확률 표시 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-800/50 border border-stone-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">성공 확률</span>
              {chanceTimeActive && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-900/40 px-1.5 py-0.5 rounded animate-pulse border border-amber-600/50">
                  찬스타임!
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${
                successRate >= 100 ? 'text-green-400' :
                successRate >= 50 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {successRate}%
              </span>
              {destroyRate > 0 && (
                <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded border border-red-700/30">
                  파괴 {destroyRate}%
                </span>
              )}
            </div>
          </div>

          {/* 상세 확률 토글 */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-xs text-stone-500 hover:text-stone-400 py-1 flex items-center justify-center gap-1 transition-colors"
          >
            <span>{showDetails ? '상세 숨기기' : '상세 보기'}</span>
            <span className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* 상세 확률 바 (토글) */}
          {showDetails && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div className="h-6 rounded-lg overflow-hidden flex bg-stone-900 border border-stone-700/50">
                {/* 성공 */}
                <div
                  className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
                  style={{
                    width: `${successRate}%`,
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)'
                  }}
                >
                  {successRate > 15 && <span>{successRate}%</span>}
                </div>
                {/* 유지 */}
                <div
                  className="flex items-center justify-center text-[10px] font-bold text-black transition-all"
                  style={{
                    width: `${maintainRate}%`,
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                  }}
                >
                  {maintainRate > 15 && <span>{maintainRate}%</span>}
                </div>
                {/* 파괴 */}
                {destroyRate > 0 && (
                  <div
                    className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
                    style={{
                      width: `${destroyRate}%`,
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)'
                    }}
                  >
                    {destroyRate > 10 && <span>{destroyRate}%</span>}
                  </div>
                )}
              </div>

              {/* 범례 */}
              <div className="flex justify-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-stone-500">성공</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-stone-500">유지 {maintainRate}%</span>
                </div>
                {destroyRate > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-stone-500">파괴</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 알림 영역 - 더 컴팩트하게 */}
        <div className="space-y-2">
          {/* 다음 레벨 100% 성공 */}
          {isNextSpecialLevel && (
            <div className="flex items-center justify-center py-2 px-3 rounded-lg bg-green-900/30 border border-green-600/30">
              <span className="text-green-400 text-sm font-medium">다음 레벨 100% 성공!</span>
            </div>
          )}

          {/* 연속 실패 카운터 */}
          {consecutiveFails > 0 && !chanceTimeActive && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-900/30 border border-amber-600/30">
              <span className="text-amber-400 text-sm">연속 실패</span>
              <div className="flex items-center gap-1">
                {[1, 2].map(i => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i <= consecutiveFails ? 'bg-amber-500' : 'bg-stone-700'}`}
                  />
                ))}
                <span className="text-amber-400 text-sm font-bold ml-1">{consecutiveFails}/2</span>
              </div>
            </div>
          )}

        </div>

        {/* 마지막 결과 */}
        {lastResult && !isEnhancing && (
          <div className={`flex items-center justify-center py-3 rounded-lg ${
            lastResult === 'success'
              ? 'bg-green-900/30 border border-green-600/50'
              : lastResult === 'maintain'
              ? 'bg-amber-900/30 border border-amber-600/50'
              : 'bg-red-900/30 border border-red-600/50'
          }`}>
            {lastResult === 'success' && (
              <span className="text-green-400 font-bold">강화 성공!</span>
            )}
            {lastResult === 'maintain' && (
              <span className="text-amber-400 font-bold">실패... 레벨 유지</span>
            )}
          </div>
        )}

        {/* 보유 강화권 요약 */}
        {allTickets.length > 0 && (
          <div className="p-3 rounded-lg bg-stone-800/50 border border-stone-700/50">
            <div className="flex items-center gap-2 mb-2">
              <GiTicket className="text-stone-400" />
              <span className="text-xs font-bold text-stone-300">보유 강화권</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTickets.map((ticket) => (
                <div
                  key={ticket.ticketLevel}
                  className="flex items-center gap-1.5 px-2 py-1 bg-stone-700/50 rounded-lg border border-stone-600/30"
                >
                  <img
                    src={`/images/tickets/${ticket.ticketLevel}.png`}
                    alt={`${ticket.ticketLevel}성 강화권`}
                    className="w-5 h-5 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="text-amber-300 text-sm font-medium">{ticket.ticketLevel}성</span>
                  <span className="text-stone-400 text-xs">x{ticket.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 강화권 사용 섹션 */}
        {availableTickets.length > 0 && onUseTicket && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-2">
              <GiTicket className="text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300">강화권 사용</span>
            </div>
            <p className="text-[10px] text-stone-400 mb-2">
              강화권을 사용하면 해당 성급으로 즉시 강화됩니다 (파괴 없음)
            </p>
            <div className="flex flex-wrap gap-2">
              {availableTickets.map((ticket) => (
                <button
                  key={ticket.ticketLevel}
                  onClick={() => {
                    const equipName = equipment ? getEquipmentDisplayName(equipment) : '장비'
                    const confirmed = window.confirm(
                      `${equipName}에 ${ticket.ticketLevel}성 강화권을 사용하시겠습니까?\n\n` +
                      `현재: ${currentLevel}성 → ${ticket.ticketLevel}성\n` +
                      `(파괴 없이 즉시 강화됩니다)`
                    )
                    if (confirmed) {
                      onUseTicket(ticket.ticketLevel)
                    }
                  }}
                  disabled={isEnhancing || isUsingTicket}
                  className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-stone-600 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                >
                  {isUsingTicket ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <img
                        src={`/images/tickets/${ticket.ticketLevel}.png`}
                        alt={`${ticket.ticketLevel}성 강화권`}
                        className="w-5 h-5 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="text-amber-300">{ticket.ticketLevel}성</span>
                      <span>강화권</span>
                      <span className="text-cyan-200 text-xs">x{ticket.quantity}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 강화 버튼 영역 */}
        <div className="pt-2 space-y-2">
          {/* 비용 표시 */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-stone-500">강화 비용</span>
            <span className={`font-bold ${canAfford ? 'text-amber-400' : 'text-red-400'}`}>
              {enhanceCost.toLocaleString()} G
            </span>
          </div>

          {/* 강화 버튼 - 대장간 테마 */}
          <button
            id="enhance-button"
            onClick={onEnhance}
            disabled={!canAfford || isEnhancing || isUsingTicket}
            className={`w-full min-h-[56px] sm:min-h-[52px] text-base font-bold rounded-xl transition-all ${
              chanceTimeActive
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse hover:from-amber-400 hover:to-orange-400'
                : canDestroy
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:from-red-500 hover:to-red-600'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 shadow-[0_0_10px_rgba(217,119,6,0.3)]'
            } disabled:from-stone-600 disabled:to-stone-700 disabled:shadow-none disabled:cursor-not-allowed`}
          >
            {isEnhancing ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>강화 중...</span>
              </span>
            ) : isUsingTicket ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>강화권 적용 중...</span>
              </span>
            ) : (
              <span>
                {chanceTimeActive ? '찬스타임 강화!' : canDestroy ? '위험! 강화하기' : '강화하기'}
              </span>
            )}
          </button>

          {/* 골드 부족 경고 */}
          {!canAfford && (
            <div className="text-center text-xs text-red-400 py-1">
              골드가 부족합니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
