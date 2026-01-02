// 6대 스탯 인터페이스
export interface CharacterStats {
  attack: number        // 공격력
  defense: number       // 방어력
  hp: number            // HP
  critRate: number      // 치명타 확률 (%)
  critDamage: number    // 치명타 데미지 (%)
  penetration: number   // 관통력 (%)
}

export const STAT_NAMES: Record<keyof CharacterStats, string> = {
  attack: '공격력',
  defense: '방어력',
  hp: 'HP',
  critRate: '치명타 확률',
  critDamage: '치명타 데미지',
  penetration: '관통력',
}

export const STAT_ICONS: Record<keyof CharacterStats, string> = {
  attack: '⚔️',
  defense: '🛡️',
  hp: '❤️',
  critRate: '🎯',
  critDamage: '💥',
  penetration: '🔪',
}

export const STAT_COLORS: Record<keyof CharacterStats, string> = {
  attack: 'text-red-400',
  defense: 'text-blue-400',
  hp: 'text-green-400',
  critRate: 'text-yellow-400',
  critDamage: 'text-orange-400',
  penetration: 'text-purple-400',
}

// 기본 캐릭터 스탯 (장비 미착용 시)
export const DEFAULT_CHARACTER_STATS: CharacterStats = {
  attack: 10,
  defense: 5,
  hp: 100,
  critRate: 5,       // 5%
  critDamage: 150,   // 150% (1.5배)
  penetration: 0,    // 0%
}

// 빈 스탯 (합산용)
export const EMPTY_STATS: CharacterStats = {
  attack: 0,
  defense: 0,
  hp: 0,
  critRate: 0,
  critDamage: 0,
  penetration: 0,
}

// 스탯 합산 헬퍼
export function mergeStats(...statsList: Partial<CharacterStats>[]): CharacterStats {
  const initial: CharacterStats = { ...EMPTY_STATS }
  return statsList.reduce<CharacterStats>(
    (acc, stats) => ({
      attack: acc.attack + (stats.attack || 0),
      defense: acc.defense + (stats.defense || 0),
      hp: acc.hp + (stats.hp || 0),
      critRate: acc.critRate + (stats.critRate || 0),
      critDamage: acc.critDamage + (stats.critDamage || 0),
      penetration: acc.penetration + (stats.penetration || 0),
    }),
    initial
  )
}

// 전투력 계산
export function calculateCombatPower(stats: CharacterStats): number {
  const weights = {
    attack: 1.0,
    defense: 0.8,
    hp: 0.1,
    critRate: 5.0,
    critDamage: 0.5,
    penetration: 3.0,
  }

  return Math.floor(
    stats.attack * weights.attack +
    stats.defense * weights.defense +
    stats.hp * weights.hp +
    stats.critRate * weights.critRate +
    stats.critDamage * weights.critDamage +
    stats.penetration * weights.penetration
  )
}

// 스탯 포맷팅 (표시용)
export function formatStat(stat: keyof CharacterStats, value: number): string {
  const isPercentage = ['critRate', 'critDamage', 'penetration'].includes(stat)
  return isPercentage ? `${value}%` : value.toLocaleString()
}

// 스탯 비교 (증감 표시용)
export function compareStats(
  before: CharacterStats,
  after: CharacterStats
): Record<keyof CharacterStats, number> {
  return {
    attack: after.attack - before.attack,
    defense: after.defense - before.defense,
    hp: after.hp - before.hp,
    critRate: after.critRate - before.critRate,
    critDamage: after.critDamage - before.critDamage,
    penetration: after.penetration - before.penetration,
  }
}
