import type { CharacterStats } from '../../types/stats'
import {
  STAT_NAMES,
  STAT_ICONS,
  STAT_COLORS,
  DEFAULT_CHARACTER_STATS,
  formatStat,
  calculateCombatPower,
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
  }

  const totalCombatPower = calculateCombatPower(totalStats)
  const equipmentCombatPower = calculateCombatPower(equipmentStats)

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">전투력</span>
          <span className="text-lg font-bold text-yellow-400">
            {totalCombatPower.toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
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
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        캐릭터 스탯
      </h2>

      {/* Combat Power */}
      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
        <div className="text-center">
          <div className="text-sm text-yellow-400/80 mb-1">총 전투력</div>
          <div className="text-3xl font-bold text-yellow-400">
            {totalCombatPower.toLocaleString()}
          </div>
          {equipmentCombatPower > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              장비 보너스: +{equipmentCombatPower.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3">
        {(Object.keys(totalStats) as (keyof CharacterStats)[]).map(stat => {
          const total = totalStats[stat]
          const base = DEFAULT_CHARACTER_STATS[stat]
          const bonus = equipmentStats[stat]
          const isPercentage = ['critRate', 'critDamage', 'penetration'].includes(stat)

          return (
            <div key={stat} className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{STAT_ICONS[stat]}</span>
                  <span className="text-gray-300">{STAT_NAMES[stat]}</span>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${STAT_COLORS[stat]}`}>
                    {formatStat(stat, total)}
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              {showBreakdown && bonus !== 0 && (
                <div className="flex items-center justify-end gap-2 mt-1 text-xs text-gray-500">
                  <span>기본 {formatStat(stat, base)}</span>
                  <span>+</span>
                  <span className="text-green-400">
                    장비 +{bonus}{isPercentage ? '%' : ''}
                  </span>
                </div>
              )}

              {/* Progress bar for percentage stats */}
              {isPercentage && stat !== 'critDamage' && (
                <div className="mt-2 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stat === 'critRate' ? 'bg-yellow-500' : 'bg-purple-500'
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
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 space-y-1">
          <div>• 치명타 확률: 적에게 치명타를 입힐 확률</div>
          <div>• 치명타 데미지: 치명타 발생 시 추가 데미지 (%)</div>
          <div>• 관통력: 적 방어력 무시 비율 (%)</div>
        </div>
      </div>
    </div>
  )
}
