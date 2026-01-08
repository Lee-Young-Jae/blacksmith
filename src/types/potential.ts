import type { CharacterStats } from './stats'

// 잠재옵션 등급
export type PotentialTier = 'common' | 'rare' | 'epic' | 'unique' | 'legendary'

export const POTENTIAL_TIERS: PotentialTier[] = [
  'common', 'rare', 'epic', 'unique', 'legendary'
]

export const POTENTIAL_TIER_NAMES: Record<PotentialTier, string> = {
  common: '커먼',
  rare: '레어',
  epic: '에픽',
  unique: '유니크',
  legendary: '레전드리',
}

export const POTENTIAL_TIER_COLORS: Record<PotentialTier, string> = {
  common: 'text-gray-400 border-gray-500',
  rare: 'text-blue-400 border-blue-500',
  epic: 'text-purple-400 border-purple-500',
  unique: 'text-yellow-400 border-yellow-500',
  legendary: 'text-orange-400 border-orange-500',
}

export const POTENTIAL_TIER_BG: Record<PotentialTier, string> = {
  common: 'bg-gray-800',
  rare: 'bg-blue-900/30',
  epic: 'bg-purple-900/30',
  unique: 'bg-yellow-900/30',
  legendary: 'bg-orange-900/30',
}

// 단일 잠재옵션 라인
export interface PotentialLine {
  stat: keyof CharacterStats     // 어떤 스탯에 영향
  value: number                  // 수치
  isPercentage: boolean          // true = %, false = 고정
  tier: PotentialTier            // 이 라인의 등급 (라인별 개별 등급)
  isLocked: boolean              // 고정 여부 (리롤 시 유지)
  isUnlocked: boolean            // 슬롯 해제 여부 (false면 비활성)
}

// 잠재옵션 롤링 풀 정의
export interface PotentialOption {
  stat: keyof CharacterStats
  minValue: number
  maxValue: number
  isPercentage: boolean
  weight: number    // 확률 가중치 (높을수록 자주 등장)
}

// 등급별 잠재옵션 풀
export const POTENTIAL_POOLS: Record<PotentialTier, PotentialOption[]> = {
  common: [
    { stat: 'attack', minValue: 1, maxValue: 5, isPercentage: false, weight: 30 },
    { stat: 'defense', minValue: 1, maxValue: 5, isPercentage: false, weight: 30 },
    { stat: 'hp', minValue: 3, maxValue: 10, isPercentage: false, weight: 30 },
    { stat: 'critRate', minValue: 1, maxValue: 2, isPercentage: true, weight: 5 },
    { stat: 'critDamage', minValue: 1, maxValue: 3, isPercentage: true, weight: 3 },
    { stat: 'penetration', minValue: 1, maxValue: 2, isPercentage: true, weight: 2 },
    { stat: 'attackSpeed', minValue: 1, maxValue: 2, isPercentage: true, weight: 5 },
  ],
  rare: [
    { stat: 'attack', minValue: 3, maxValue: 10, isPercentage: false, weight: 25 },
    { stat: 'attack', minValue: 1, maxValue: 3, isPercentage: true, weight: 10 },
    { stat: 'defense', minValue: 3, maxValue: 10, isPercentage: false, weight: 25 },
    { stat: 'hp', minValue: 8, maxValue: 25, isPercentage: false, weight: 20 },
    { stat: 'critRate', minValue: 2, maxValue: 4, isPercentage: true, weight: 8 },
    { stat: 'critDamage', minValue: 3, maxValue: 6, isPercentage: true, weight: 7 },
    { stat: 'penetration', minValue: 2, maxValue: 4, isPercentage: true, weight: 5 },
    { stat: 'attackSpeed', minValue: 2, maxValue: 4, isPercentage: true, weight: 6 },
  ],
  epic: [
    { stat: 'attack', minValue: 5, maxValue: 15, isPercentage: false, weight: 20 },
    { stat: 'attack', minValue: 3, maxValue: 6, isPercentage: true, weight: 15 },
    { stat: 'defense', minValue: 5, maxValue: 15, isPercentage: false, weight: 15 },
    { stat: 'defense', minValue: 2, maxValue: 5, isPercentage: true, weight: 10 },
    { stat: 'hp', minValue: 15, maxValue: 50, isPercentage: false, weight: 12 },
    { stat: 'hp', minValue: 5, maxValue: 10, isPercentage: true, weight: 8 },  // HP% 추가
    { stat: 'critRate', minValue: 4, maxValue: 7, isPercentage: true, weight: 10 },
    { stat: 'critDamage', minValue: 5, maxValue: 10, isPercentage: true, weight: 8 },
    { stat: 'penetration', minValue: 4, maxValue: 7, isPercentage: true, weight: 7 },
    { stat: 'attackSpeed', minValue: 4, maxValue: 7, isPercentage: true, weight: 8 },
  ],
  unique: [
    { stat: 'attack', minValue: 6, maxValue: 9, isPercentage: true, weight: 18 },
    { stat: 'attack', minValue: 10, maxValue: 25, isPercentage: false, weight: 12 },
    { stat: 'defense', minValue: 5, maxValue: 8, isPercentage: true, weight: 15 },
    { stat: 'hp', minValue: 10, maxValue: 18, isPercentage: true, weight: 15 },  // HP% 대폭 상향
    { stat: 'critRate', minValue: 6, maxValue: 10, isPercentage: true, weight: 15 },
    { stat: 'critDamage', minValue: 8, maxValue: 15, isPercentage: true, weight: 13 },
    { stat: 'penetration', minValue: 6, maxValue: 10, isPercentage: true, weight: 12 },
    { stat: 'attackSpeed', minValue: 6, maxValue: 10, isPercentage: true, weight: 10 },
  ],
  legendary: [
    { stat: 'attack', minValue: 9, maxValue: 12, isPercentage: true, weight: 20 },
    { stat: 'attack', minValue: 20, maxValue: 40, isPercentage: false, weight: 10 },
    { stat: 'defense', minValue: 8, maxValue: 12, isPercentage: true, weight: 15 },
    { stat: 'hp', minValue: 15, maxValue: 25, isPercentage: true, weight: 15 },  // HP% 대폭 상향
    { stat: 'critRate', minValue: 9, maxValue: 15, isPercentage: true, weight: 15 },
    { stat: 'critDamage', minValue: 12, maxValue: 20, isPercentage: true, weight: 13 },
    { stat: 'penetration', minValue: 9, maxValue: 15, isPercentage: true, weight: 12 },
    { stat: 'attackSpeed', minValue: 8, maxValue: 15, isPercentage: true, weight: 10 },
  ],
}

// 슬롯 해제 비용 (각 슬롯별)
export const SLOT_UNLOCK_COSTS: [number, number, number] = [500, 2000, 10000]

// 리롤 기본 비용 및 고정 라인당 추가 비용
export const REROLL_BASE_COST = 200
export const REROLL_LOCKED_LINE_MULTIPLIER = 3.5  // 고정된 라인당 비용 배율

// 리롤 시 등급 확률 (랜덤 등급 부여)
export const TIER_ROLL_RATES: Record<PotentialTier, number> = {
  common: 0.50,     // 50%
  rare: 0.30,       // 30%
  epic: 0.14,       // 14%
  unique: 0.05,     // 5%
  legendary: 0.01,  // 1%
}

// 리롤 비용 계산
export function calculateRerollCost(lockedLineCount: number): number {
  const multiplier = Math.pow(REROLL_LOCKED_LINE_MULTIPLIER, lockedLineCount)
  return Math.floor(REROLL_BASE_COST * multiplier)
}

// 슬롯 해제 비용 계산
export function getSlotUnlockCost(slotIndex: number): number {
  if (slotIndex < 0 || slotIndex >= 3) return 0
  return SLOT_UNLOCK_COSTS[slotIndex]
}

// 다음 등급 가져오기
export function getNextTier(tier: PotentialTier): PotentialTier | null {
  const index = POTENTIAL_TIERS.indexOf(tier)
  if (index >= POTENTIAL_TIERS.length - 1) return null
  return POTENTIAL_TIERS[index + 1]
}

// 스탯 이름 (공통 사용)
export const STAT_NAMES: Record<keyof CharacterStats, string> = {
  attack: '공격력',
  defense: '방어력',
  hp: 'HP',
  critRate: '치명타 확률',
  critDamage: '치명타 데미지',
  penetration: '관통력',
  attackSpeed: '공격속도',
  evasion: '회피율',
}

// 잠재옵션 포맷팅 (표시용)
export function formatPotentialLine(line: PotentialLine): string {
  const statName = STAT_NAMES[line.stat]
  const valueStr = line.isPercentage ? `+${line.value}%` : `+${line.value}`
  return `${statName} ${valueStr}`
}

// 랜덤 등급 롤
export function rollRandomTier(): PotentialTier {
  const roll = Math.random()
  let cumulative = 0

  for (const tier of POTENTIAL_TIERS) {
    cumulative += TIER_ROLL_RATES[tier]
    if (roll < cumulative) return tier
  }

  return 'common'
}

// 가중치 기반 랜덤 선택
function weightedRandom<T extends { weight: number }>(options: T[]): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0)
  let random = Math.random() * totalWeight

  for (const option of options) {
    random -= option.weight
    if (random <= 0) {
      return option
    }
  }

  return options[options.length - 1]
}

// 단일 잠재옵션 라인 생성 (특정 등급으로)
export function generatePotentialLine(tier: PotentialTier): Omit<PotentialLine, 'isLocked' | 'isUnlocked'> {
  const pool = POTENTIAL_POOLS[tier]
  const option = weightedRandom(pool)
  const value = Math.floor(
    Math.random() * (option.maxValue - option.minValue + 1) + option.minValue
  )

  return {
    stat: option.stat,
    value,
    isPercentage: option.isPercentage,
    tier,
  }
}

// 초기 잠재옵션 생성 (모든 슬롯 잠김 상태)
export function generateInitialPotentials(lineCount: number = 3): PotentialLine[] {
  const lines: PotentialLine[] = []

  for (let i = 0; i < lineCount; i++) {
    const tier = rollRandomTier()
    const lineData = generatePotentialLine(tier)

    lines.push({
      ...lineData,
      isLocked: false,
      isUnlocked: false,  // 슬롯 잠김 (해제 필요)
    })
  }

  return lines
}

// 잠재옵션 리롤 (해제된 슬롯 중 고정되지 않은 것만)
export function rerollPotentials(currentLines: PotentialLine[]): PotentialLine[] {
  return currentLines.map(line => {
    // 슬롯이 해제되지 않았거나 고정된 라인은 유지
    if (!line.isUnlocked || line.isLocked) return line

    // 새 등급 롤 + 새 스탯 롤
    const newTier = rollRandomTier()
    const lineData = generatePotentialLine(newTier)

    return {
      ...lineData,
      isLocked: false,
      isUnlocked: true,
    }
  })
}

// 슬롯 해제
export function unlockPotentialSlot(
  currentLines: PotentialLine[],
  slotIndex: number
): PotentialLine[] {
  return currentLines.map((line, index) => {
    if (index === slotIndex) {
      return { ...line, isUnlocked: true }
    }
    return line
  })
}

// 라인 고정/해제 토글
export function togglePotentialLock(
  currentLines: PotentialLine[],
  slotIndex: number
): PotentialLine[] {
  return currentLines.map((line, index) => {
    if (index === slotIndex && line.isUnlocked) {
      return { ...line, isLocked: !line.isLocked }
    }
    return line
  })
}

// 해제된 슬롯 개수
export function getUnlockedSlotCount(lines: PotentialLine[]): number {
  return lines.filter(l => l.isUnlocked).length
}

// 고정된 라인 개수
export function getLockedLineCount(lines: PotentialLine[]): number {
  return lines.filter(l => l.isUnlocked && l.isLocked).length
}

// 리롤 가능한 라인이 있는지 (해제됨 && 고정 안됨)
export function hasRerollableLines(lines: PotentialLine[]): boolean {
  return lines.some(l => l.isUnlocked && !l.isLocked)
}
