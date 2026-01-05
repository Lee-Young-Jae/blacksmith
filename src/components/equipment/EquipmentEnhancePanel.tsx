import { useState } from 'react'
import type { UserEquipment } from '../../types/equipment'
import { getEquipmentDisplayName, getEquipmentComment } from '../../types/equipment'
import type { EnhanceResult } from '../../types/starforce'
import type { CharacterStats } from '../../types/stats'
import { GiAnvilImpact } from 'react-icons/gi'

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
}: EquipmentEnhancePanelProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!equipment) {
    return (
      <div className="card">
        <div className="card-body text-center py-8 sm:py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-bg-elevated-2)] flex items-center justify-center">
            <GiAnvilImpact className="text-3xl text-[var(--color-text-muted)]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] mb-2">장비 강화</h2>
          <p className="text-[var(--color-text-secondary)] text-sm">위에서 강화할 장비를 선택하세요</p>
        </div>
      </div>
    )
  }

  if (isDestroyed) {
    return (
      <div className="card">
        <div className="card-body text-center py-6 sm:py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--color-danger)]/20 flex items-center justify-center animate-pulse">
            <span className="text-3xl font-bold text-[var(--color-danger)]">X</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--color-danger)] mb-2">장비 파괴!</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-4 sm:mb-6">
            {getEquipmentDisplayName(equipment)}이(가) 파괴되었습니다...
          </p>
          <button
            onClick={onResetAfterDestroy}
            className="btn btn-ghost min-h-[48px]"
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
      <div className="card">
        <div className="card-body text-center py-6 sm:py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-white">★25</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--color-accent)] mb-2">최대 강화 달성!</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-2">
            {getEquipmentDisplayName(equipment)}
          </p>
          <p className="text-[var(--color-text-muted)] text-xs">
            더 이상 강화할 수 없습니다
          </p>
          <div className="mt-4 p-3 rounded-lg bg-[var(--color-bg-elevated-2)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">전투력</div>
            <div className="text-xl font-bold text-[var(--color-accent)]">{currentCombatPower.toLocaleString()}</div>
          </div>
        </div>
      </div>
    )
  }

  const canAfford = gold >= enhanceCost
  const comment = getEquipmentComment(equipment.equipmentBase, currentLevel)

  // Button style based on state
  let buttonClass = 'btn btn-primary'
  let buttonGlow = ''
  if (chanceTimeActive) {
    buttonClass = 'btn btn-accent'
    buttonGlow = 'shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse'
  } else if (canDestroy) {
    buttonClass = 'btn btn-danger'
    buttonGlow = 'shadow-[0_0_15px_rgba(239,68,68,0.3)]'
  }

  return (
    <div className="card overflow-hidden">
      {/* Header - 간소화된 레벨 변화 표시 */}
      <div className={`card-header ${chanceTimeActive ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30' : ''}`}>
        <div className="flex flex-col items-center gap-3">
          {/* 레벨 변화 표시 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--color-bg-elevated-2)]">
              <span className="text-[var(--color-accent)] text-lg">★</span>
              <span className="text-[var(--color-text-primary)] font-bold text-xl">{currentLevel}</span>
            </div>
            <span className="text-[var(--color-text-muted)] text-2xl">→</span>
            <div className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30">
              <span className="text-[var(--color-accent)] text-lg">★</span>
              <span className="text-[var(--color-accent)] font-bold text-xl">{currentLevel + 1}</span>
            </div>
          </div>

          {/* 대장장이 코멘트 */}
          <p className="text-sm text-[var(--color-text-secondary)] italic text-center">"{comment}"</p>
        </div>
      </div>

      {/* Stats */}
      <div className="card-body space-y-3 sm:space-y-4">
        {/* 전투력 변화 */}
        <div className="p-3 rounded-lg bg-[var(--color-bg-elevated-2)]">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[var(--color-text-secondary)]">전투력</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-primary)]">{currentCombatPower.toLocaleString()}</span>
              <span className="text-[var(--color-text-muted)]">→</span>
              <span className="text-sm text-[var(--color-accent)] font-bold">
                {nextCombatPower.toLocaleString()}
              </span>
              <span className="text-[var(--color-success)] text-xs font-medium bg-[var(--color-success)]/10 px-1.5 py-0.5 rounded">
                +{combatPowerGain.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 장비 스탯 전체 */}
        {currentStats && statChanges && (
          <div className="p-3 rounded-lg bg-[var(--color-bg-elevated-2)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">장비 스탯</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {/* 공격력 - 스타포스 증가 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">공격력</span>
                <div className="text-xs">
                  <span className="text-[var(--color-text-primary)]">{currentStats.attack}</span>
                  {statChanges.attack > 0 && (
                    <span className="text-[var(--color-success)] ml-1">+{statChanges.attack}</span>
                  )}
                </div>
              </div>
              {/* 방어력 - 스타포스 증가 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">방어력</span>
                <div className="text-xs">
                  <span className="text-[var(--color-text-primary)]">{currentStats.defense}</span>
                  {statChanges.defense > 0 && (
                    <span className="text-[var(--color-success)] ml-1">+{statChanges.defense}</span>
                  )}
                </div>
              </div>
              {/* HP - 스타포스 증가 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">HP</span>
                <div className="text-xs">
                  <span className="text-[var(--color-text-primary)]">{currentStats.hp}</span>
                  {statChanges.hp > 0 && (
                    <span className="text-[var(--color-success)] ml-1">+{statChanges.hp}</span>
                  )}
                </div>
              </div>
              {/* 치명타 확률 - 잠재옵션만 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">치명타</span>
                <span className="text-xs text-[var(--color-text-primary)]">{currentStats.critRate}%</span>
              </div>
              {/* 치명타 데미지 - 잠재옵션만 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">치명타 피해</span>
                <span className="text-xs text-[var(--color-text-primary)]">{currentStats.critDamage}%</span>
              </div>
              {/* 관통력 - 잠재옵션만 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">관통력</span>
                <span className="text-xs text-[var(--color-text-primary)]">{currentStats.penetration}%</span>
              </div>
              {/* 공격속도 - 잠재옵션만 */}
              <div className="flex items-center justify-between col-span-2">
                <span className="text-xs text-[var(--color-text-secondary)]">공격속도</span>
                <span className="text-xs text-[var(--color-text-primary)]">{currentStats.attackSpeed}%</span>
              </div>
            </div>
            {/* 스타포스 안내 */}
            {statChanges.attack === 0 && statChanges.defense === 0 && statChanges.hp === 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)] text-center">
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  이 장비는 스타포스로 스탯이 증가하지 않습니다
                </span>
              </div>
            )}
          </div>
        )}

        {/* 확률 섹션 - 간소화 */}
        <div className="space-y-2">
          {/* 메인 확률 표시 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-elevated-2)]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)]">성공 확률</span>
              {chanceTimeActive && (
                <span className="text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/20 px-1.5 py-0.5 rounded animate-pulse">
                  찬스타임!
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${
                successRate >= 100 ? 'text-[var(--color-success)]' :
                successRate >= 50 ? 'text-[var(--color-accent)]' :
                'text-[var(--color-danger)]'
              }`}>
                {successRate}%
              </span>
              {destroyRate > 0 && (
                <span className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-2 py-1 rounded">
                  파괴 {destroyRate}%
                </span>
              )}
            </div>
          </div>

          {/* 상세 확률 토글 */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] py-1 flex items-center justify-center gap-1 transition-colors"
          >
            <span>{showDetails ? '상세 숨기기' : '상세 보기'}</span>
            <span className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* 상세 확률 바 (토글) */}
          {showDetails && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div className="h-6 rounded-lg overflow-hidden flex bg-[var(--color-bg-elevated-1)] border border-[var(--color-border)]">
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
                  <span className="w-2 h-2 rounded-full bg-[var(--color-success)]"></span>
                  <span className="text-[var(--color-text-muted)]">성공</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]"></span>
                  <span className="text-[var(--color-text-muted)]">유지 {maintainRate}%</span>
                </div>
                {destroyRate > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]"></span>
                    <span className="text-[var(--color-text-muted)]">파괴</span>
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
            <div className="flex items-center justify-center py-2 px-3 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
              <span className="text-[var(--color-success)] text-sm font-medium">다음 레벨 100% 성공!</span>
            </div>
          )}

          {/* 연속 실패 카운터 */}
          {consecutiveFails > 0 && !chanceTimeActive && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
              <span className="text-[var(--color-accent)] text-sm">연속 실패</span>
              <div className="flex items-center gap-1">
                {[1, 2].map(i => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i <= consecutiveFails ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-bg-elevated-2)]'}`}
                  />
                ))}
                <span className="text-[var(--color-accent)] text-sm font-bold ml-1">{consecutiveFails}/2</span>
              </div>
            </div>
          )}

        </div>

        {/* 마지막 결과 */}
        {lastResult && !isEnhancing && (
          <div className={`flex items-center justify-center py-3 rounded-lg ${
            lastResult === 'success'
              ? 'bg-[var(--color-success)]/20 border border-[var(--color-success)]/50'
              : lastResult === 'maintain'
              ? 'bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50'
              : 'bg-[var(--color-danger)]/20 border border-[var(--color-danger)]/50'
          }`}>
            {lastResult === 'success' && (
              <span className="text-[var(--color-success)] font-bold">강화 성공!</span>
            )}
            {lastResult === 'maintain' && (
              <span className="text-[var(--color-accent)] font-bold">실패... 레벨 유지</span>
            )}
          </div>
        )}

        {/* 강화 버튼 영역 */}
        <div className="pt-2 space-y-2">
          {/* 비용 표시 */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[var(--color-text-muted)]">강화 비용</span>
            <span className={`font-bold ${canAfford ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
              {enhanceCost.toLocaleString()} G
            </span>
          </div>

          {/* 강화 버튼 - 더 크고 터치 친화적 */}
          <button
            onClick={onEnhance}
            disabled={!canAfford || isEnhancing}
            className={`${buttonClass} ${buttonGlow} w-full min-h-[56px] sm:min-h-[52px] text-base font-bold rounded-xl transition-all`}
          >
            {isEnhancing ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>강화 중...</span>
              </span>
            ) : (
              <span>
                {chanceTimeActive ? '찬스타임 강화!' : canDestroy ? '위험! 강화하기' : '강화하기'}
              </span>
            )}
          </button>

          {/* 골드 부족 경고 */}
          {!canAfford && (
            <div className="text-center text-xs text-[var(--color-danger)] py-1">
              골드가 부족합니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
