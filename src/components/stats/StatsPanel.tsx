import type { CharacterStats } from '../../types/stats'
import {
  STAT_NAMES,
  STAT_ICONS,
  STAT_COLORS,
  DEFAULT_CHARACTER_STATS,
  formatStat,
  formatNumberString,
  calculateCombatPower,
  PERCENTAGE_STATS,
} from '../../types/stats'

interface StatsPanelProps {
  equipmentStats: CharacterStats
  showBreakdown?: boolean
  compact?: boolean
}

export default function StatsPanel({
  equipmentStats,
  showBreakdown = true,
  compact = false,
}: StatsPanelProps) {
  // 총 스탯 계산 (기본 + 장비)
  const totalStats: CharacterStats = {
    attack: DEFAULT_CHARACTER_STATS.attack + equipmentStats.attack,
    defense: DEFAULT_CHARACTER_STATS.defense + equipmentStats.defense,
    hp: DEFAULT_CHARACTER_STATS.hp + equipmentStats.hp,
    critRate: DEFAULT_CHARACTER_STATS.critRate + equipmentStats.critRate,
    critDamage: DEFAULT_CHARACTER_STATS.critDamage + equipmentStats.critDamage,
    penetration: DEFAULT_CHARACTER_STATS.penetration + equipmentStats.penetration,
    attackSpeed: DEFAULT_CHARACTER_STATS.attackSpeed + equipmentStats.attackSpeed,
    evasion: DEFAULT_CHARACTER_STATS.evasion + equipmentStats.evasion,
  }

  const totalCombatPower = calculateCombatPower(totalStats)
  const equipmentCombatPower = calculateCombatPower(equipmentStats)

  if (compact) {
    return (
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--color-text-secondary)]">전투력</span>
          <span className="text-lg font-bold text-[var(--color-accent)]">
            {totalCombatPower.toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          {(Object.keys(totalStats) as (keyof CharacterStats)[]).map(stat => (
            <div key={stat} className="flex items-center gap-1">
              <span>{STAT_ICONS[stat]}</span>
              <span className={STAT_COLORS[stat]}>{formatStat(stat, totalStats[stat])}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <span className="text-xl">📊</span>
          캐릭터 스탯
        </h2>
      </div>

      <div className="card-body space-y-4">
        {/* Combat Power */}
        <div className="combat-power">
          <span className="combat-power-label">총 전투력</span>
          <span className="combat-power-value">{totalCombatPower.toLocaleString()}</span>
          {equipmentCombatPower > 0 && (
            <span className="combat-power-bonus">장비 +{equipmentCombatPower.toLocaleString()}</span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="space-y-2">
          {(Object.keys(totalStats) as (keyof CharacterStats)[]).map(stat => {
            const total = totalStats[stat]
            const base = DEFAULT_CHARACTER_STATS[stat]
            const bonus = equipmentStats[stat]
            const isPercentage = PERCENTAGE_STATS.includes(stat)

            return (
              <div key={stat} className="info-box p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{STAT_ICONS[stat]}</span>
                    <span className="text-[var(--color-text-secondary)] text-sm">{STAT_NAMES[stat]}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-bold ${STAT_COLORS[stat]}`}>
                      {formatStat(stat, total)}
                    </span>
                  </div>
                </div>

                {/* Breakdown */}
                {showBreakdown && bonus !== 0 && (
                  <div className="flex items-center justify-end gap-2 mt-1 text-xs text-[var(--color-text-muted)]">
                    <span>기본 {formatStat(stat, base)}</span>
                    <span>+</span>
                    <span className="text-[var(--color-success)]">
                      장비 +{isPercentage ? formatNumberString(bonus) : Math.round(bonus)}{isPercentage ? '%' : ''}
                    </span>
                  </div>
                )}

                {/* Progress bar for percentage stats */}
                {isPercentage && stat !== 'critDamage' && stat !== 'attackSpeed' && stat !== 'evasion' && (
                  <div className="mt-2 h-1.5 bg-[var(--color-bg-elevated-2)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stat === 'critRate' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-magic)]'
                      }`}
                      style={{ width: `${Math.min(total, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Stats Explanation */}
        <div className="pt-3 border-t border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-muted)] space-y-1">
            <div>• 치명타 확률: 적에게 치명타를 입힐 확률</div>
            <div>• 치명타 데미지: 치명타 발생 시 추가 데미지 (%)</div>
            <div>• 관통력: 적 방어력 무시 비율 (%)</div>
            <div>• 공격속도: 공격 간격 감소 (%)</div>
            <div>• 회피율: 적 공격을 회피할 확률 (최대 40%)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
