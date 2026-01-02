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
      <div className="card">
        <div className="card-body text-center py-8 sm:py-12">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 opacity-50">⬆️</div>
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
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 animate-pulse">💥</div>
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

  const canAfford = gold >= enhanceCost
  const displayName = getEquipmentDisplayName(equipment)
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
      {/* Header - 모바일 최적화 */}
      <div className={`card-header ${chanceTimeActive ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30' : ''}`}>
        <div className="flex items-center gap-3">
          {/* 장비 이미지 + 스타 레벨 */}
          <div className="relative flex-shrink-0">
            <div className={`${chanceTimeActive ? 'animate-pulse' : ''}`}>
              <EquipmentImage equipment={equipment} size="xl" />
            </div>
            {currentLevel > 0 && (
              <div className="star-badge">
                {currentLevel}
              </div>
            )}
          </div>

          {/* 장비 정보 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)] truncate">{displayName}</h2>

            {/* 레벨 변화 표시 - 더 시각적으로 */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-bg-elevated-2)]">
                <span className="text-[var(--color-accent)] text-sm">★</span>
                <span className="text-[var(--color-text-primary)] text-sm font-bold">{currentLevel}</span>
              </div>
              <span className="text-[var(--color-text-muted)] text-lg">→</span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30">
                <span className="text-[var(--color-accent)] text-sm">★</span>
                <span className="text-[var(--color-accent)] text-sm font-bold">{currentLevel + 1}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 대장장이 코멘트 - 모바일에서 숨김 가능 */}
        <p className="hidden sm:block mt-3 text-xs text-[var(--color-text-secondary)] italic">"{comment}"</p>
      </div>

      {/* Stats */}
      <div className="card-body space-y-3 sm:space-y-4">
        {/* 전투력 변화 - 더 컴팩트하게 */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-elevated-2)]">
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

        {/* 확률 섹션 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--color-text-secondary)]">강화 확률</span>
            {chanceTimeActive && (
              <span className="text-xs font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/20 px-2 py-1 rounded animate-pulse">
                🔥 찬스타임!
              </span>
            )}
          </div>

          {/* 확률 바 - 모바일 최적화 */}
          <div className="h-8 sm:h-9 rounded-xl overflow-hidden flex bg-[var(--color-bg-elevated-1)] border border-[var(--color-border)]">
            {/* 성공 */}
            <div
              className="flex items-center justify-center text-xs font-bold text-white transition-all"
              style={{
                width: `${successRate}%`,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)'
              }}
            >
              {successRate > 12 && <span>{successRate}%</span>}
            </div>
            {/* 유지 */}
            <div
              className="flex items-center justify-center text-xs font-bold text-black transition-all"
              style={{
                width: `${maintainRate}%`,
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)'
              }}
            >
              {maintainRate > 12 && <span>{maintainRate}%</span>}
            </div>
            {/* 파괴 */}
            {destroyRate > 0 && (
              <div
                className="flex items-center justify-center text-xs font-bold text-white transition-all"
                style={{
                  width: `${destroyRate}%`,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)'
                }}
              >
                {destroyRate > 8 && <span>{destroyRate}%</span>}
              </div>
            )}
          </div>

          {/* 범례 - 모바일 최적화 */}
          <div className="flex justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)]"></span>
              <span className="text-[var(--color-text-secondary)]">성공 <span className="font-bold text-[var(--color-success)]">{successRate}%</span></span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]"></span>
              <span className="text-[var(--color-text-secondary)]">유지 <span className="font-bold text-[var(--color-accent)]">{maintainRate}%</span></span>
            </div>
            {destroyRate > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]"></span>
                <span className="text-[var(--color-text-secondary)]">파괴 <span className="font-bold text-[var(--color-danger)]">{destroyRate}%</span></span>
              </div>
            )}
          </div>
        </div>

        {/* 알림 영역 - 더 컴팩트하게 */}
        <div className="space-y-2">
          {/* 다음 레벨 100% 성공 */}
          {isNextSpecialLevel && (
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
              <span className="text-lg">🌟</span>
              <span className="text-[var(--color-success)] text-sm font-medium">다음 레벨 100% 성공!</span>
            </div>
          )}

          {/* 연속 실패 카운터 */}
          {consecutiveFails > 0 && !chanceTimeActive && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span className="text-[var(--color-accent)] text-sm">연속 실패</span>
              </div>
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

          {/* 파괴 경고 */}
          {canDestroy && !chanceTimeActive && (
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30">
              <span className="text-base">⚠️</span>
              <span className="text-[var(--color-danger)] text-sm font-medium">파괴 위험!</span>
            </div>
          )}
        </div>

        {/* 마지막 결과 */}
        {lastResult && !isEnhancing && (
          <div className={`flex items-center justify-center gap-2 py-3 rounded-lg ${
            lastResult === 'success'
              ? 'bg-[var(--color-success)]/20 border border-[var(--color-success)]/50'
              : lastResult === 'maintain'
              ? 'bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50'
              : 'bg-[var(--color-danger)]/20 border border-[var(--color-danger)]/50'
          }`}>
            {lastResult === 'success' && (
              <>
                <span className="text-2xl">✨</span>
                <span className="text-[var(--color-success)] font-bold">강화 성공!</span>
              </>
            )}
            {lastResult === 'maintain' && (
              <>
                <span className="text-2xl">😅</span>
                <span className="text-[var(--color-accent)] font-bold">실패... 레벨 유지</span>
              </>
            )}
          </div>
        )}

        {/* 강화 버튼 영역 */}
        <div className="pt-2 space-y-2">
          {/* 비용 표시 */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[var(--color-text-muted)]">강화 비용</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🪙</span>
              <span className={`font-bold ${canAfford ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                {enhanceCost.toLocaleString()}
              </span>
            </div>
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
              <span className="flex items-center justify-center gap-2">
                {chanceTimeActive ? (
                  <>
                    <span className="text-xl">🔥</span>
                    <span>찬스타임 강화!</span>
                  </>
                ) : canDestroy ? (
                  <>
                    <span className="text-xl">⚠️</span>
                    <span>위험! 강화하기</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">⬆️</span>
                    <span>강화하기</span>
                  </>
                )}
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
