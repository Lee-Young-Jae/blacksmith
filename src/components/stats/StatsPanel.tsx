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
import { GiScrollUnfurled } from 'react-icons/gi'

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
      <div className="rounded-xl border border-amber-700/30 bg-gradient-to-b from-stone-900 to-stone-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-amber-200/60">전투력</span>
          <span className="text-lg font-bold text-amber-400">
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
    <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
      <div className="p-4 border-b border-amber-700/30 bg-gradient-to-r from-amber-900/20 to-transparent">
        <h2 className="text-base font-bold text-amber-100 flex items-center gap-2">
          <GiScrollUnfurled className="text-xl text-amber-400" />
          캐릭터 스탯
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Combat Power - 대장간 테마 */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-600/30 text-center">
          <span className="text-sm text-amber-200/60 block mb-1">총 전투력</span>
          <span className="text-3xl font-bold text-amber-400">{totalCombatPower.toLocaleString()}</span>
          {equipmentCombatPower > 0 && (
            <span className="text-sm text-green-400 block mt-1">장비 +{equipmentCombatPower.toLocaleString()}</span>
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
              <div key={stat} className="p-3 rounded-lg bg-stone-800/50 border border-stone-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{STAT_ICONS[stat]}</span>
                    <span className="text-stone-400 text-sm">{STAT_NAMES[stat]}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-bold ${STAT_COLORS[stat]}`}>
                      {formatStat(stat, total)}
                    </span>
                  </div>
                </div>

                {/* Breakdown */}
                {showBreakdown && bonus !== 0 && (
                  <div className="flex items-center justify-end gap-2 mt-1 text-xs text-stone-500">
                    <span>기본 {formatStat(stat, base)}</span>
                    <span>+</span>
                    <span className="text-green-400">
                      장비 +{isPercentage ? formatNumberString(bonus) : Math.round(bonus)}{isPercentage ? '%' : ''}
                    </span>
                  </div>
                )}

                {/* Progress bar for percentage stats */}
                {isPercentage && stat !== 'critDamage' && stat !== 'attackSpeed' && stat !== 'evasion' && (
                  <div className="mt-2 h-1.5 bg-stone-900 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-gradient-to-r from-amber-500 to-orange-500"
                      style={{ width: `${Math.min(total, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Stats Explanation */}
        <div className="pt-3 border-t border-stone-700/50">
          <div className="text-xs text-stone-500 space-y-1">
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
