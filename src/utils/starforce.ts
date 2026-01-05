import type { EnhanceResult } from '../types/starforce'

// 최대 스타포스 레벨
export const MAX_STAR_LEVEL = 25

/**
 * 특별 레벨 체크 (5, 10, 15, 20... → 100% 성공)
 */
export function isSpecialLevel(level: number): boolean {
  return level > 0 && level % 5 === 0
}

/**
 * 레벨별 성공 확률 계산
 * - 기본: 95%에서 시작, 레벨당 5% 감소
 * - 15성 이상: 추가 2% 감소
 * - 25성 이상: 추가 3% 감소
 * - 특별 레벨: 100%
 */
export function getSuccessRate(level: number): number {
  if (level < 0) return 0
  if (isSpecialLevel(level + 1)) return 100

  let rate = 95 - (level * 5)

  if (level >= 15) {
    rate -= (level - 15) * 2
  }

  if (level >= 25) {
    rate -= (level - 25) * 3
  }

  return Math.max(5, Math.min(100, rate))
}

/**
 * 레벨별 파괴 확률 계산
 * - 12성 미만: 0%
 * - 12성부터: (레벨 - 11) * 3 + 1
 * - 20성 이상: 추가 2% 증가
 * - 최대 50%
 */
export function getDestroyRate(level: number): number {
  if (level < 12) return 0

  let rate = (level - 11) * 3 + 1

  if (level >= 20) {
    rate += (level - 20) * 2
  }

  return Math.min(50, rate)
}

/**
 * 유지 확률 계산 (100 - 성공 - 파괴)
 */
export function getMaintainRate(level: number): number {
  const success = getSuccessRate(level)
  const destroy = getDestroyRate(level)
  return Math.max(0, 100 - success - destroy)
}

/**
 * 강화 비용 계산
 * - 초반(0-10): 완만한 증가로 진입 장벽 낮춤
 * - 중반(11-15): 적당한 증가
 * - 후반(16+): 가파른 증가로 도전감 제공
 *
 * 공식: baseCost * (1 + level * 0.15 + level² * 0.012)
 * v2: 스타포스 보너스 상향에 따른 비용 50% 증가
 */
export function getEnhanceCost(level: number): number {
  const baseCost = 150  // 100 → 150 (50% 증가)
  const levelFactor = 1 + level * 0.15 + Math.pow(level, 2) * 0.012
  return Math.floor(baseCost * levelFactor)
}

/**
 * 판매 가격 계산 - "무한 동력" 컨셉
 * - 판매 시 같은 레벨 또는 더 높은 레벨까지 재도전 가능
 * - 파괴 위험 vs 판매 후 재도전 전략적 선택 제공
 *
 * 공식: basePrice * (1 + level * 5 + level²)
 *
 * 예시:
 * - 12성 판매 → 약 10,250G → 15성까지 재도전 가능
 * - 15성 판매 → 약 15,050G → 16성까지 재도전 + 6회 추가
 * - 20성 판매 → 약 25,050G → 17성까지 재도전 + 12회 추가
 */
export function getSellPrice(level: number, basePrice: number): number {
  const levelBonus = 1 + level * 5 + Math.pow(level, 2) * 1.0
  return Math.floor(basePrice * levelBonus)
}

/**
 * 공격력 보너스 계산
 * 보너스 = 기본공격력 * (레벨 * 0.05 + 레벨^2 * 0.002)
 */
export function getAttackBonus(level: number, baseAttack: number): number {
  if (level <= 0) return 0
  const bonus = baseAttack * (level * 0.05 + Math.pow(level, 2) * 0.002)
  return Math.floor(bonus)
}

/**
 * 총 공격력 계산
 */
export function getTotalAttack(baseAttack: number, level: number): number {
  return baseAttack + getAttackBonus(level, baseAttack)
}

/**
 * 찬스타임 활성화 체크 (2연속 실패)
 */
export function isChanceTime(consecutiveFails: number): boolean {
  return consecutiveFails >= 2
}

/**
 * 강화 실행 (결과 계산)
 */
export function executeEnhance(
  level: number,
  chanceTimeActive: boolean
): EnhanceResult {
  // 찬스타임이면 100% 성공
  if (chanceTimeActive) {
    return 'success'
  }

  // 특별 레벨이면 100% 성공
  if (isSpecialLevel(level + 1)) {
    return 'success'
  }

  const roll = Math.random() * 100
  const successRate = getSuccessRate(level)
  const destroyRate = getDestroyRate(level)

  if (roll < successRate) {
    return 'success'
  } else if (roll < successRate + destroyRate) {
    return 'destroy'
  } else {
    return 'maintain'
  }
}

/**
 * 레벨별 별 색상 (표시용)
 */
export function getStarColor(level: number): string {
  if (level >= 25) return 'text-red-400'
  if (level >= 20) return 'text-purple-400'
  if (level >= 15) return 'text-blue-400'
  if (level >= 10) return 'text-green-400'
  if (level >= 5) return 'text-yellow-400'
  return 'text-gray-400'
}

/**
 * 레벨에 따른 위험 등급
 */
export function getDangerLevel(level: number): 'safe' | 'caution' | 'danger' | 'extreme' {
  if (level < 12) return 'safe'
  if (level < 17) return 'caution'
  if (level < 22) return 'danger'
  return 'extreme'
}
