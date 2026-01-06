/**
 * 수련의 숲 배틀 유틸리티
 *
 * 층별 적 스탯 계산, 보상 계산, 적 생성 등
 */

import type { CharacterStats } from '../types/stats'
import {
  TOWER_CONFIG,
  ENEMY_VARIANTS,
  type TowerEnemy,
  type TowerReward,
  type EnemyVariant,
} from '../types/tower'

// =============================================
// 층별 적 스탯 계산
// =============================================

/**
 * 층에 따른 적 스탯을 계산합니다.
 *
 * HP 공식: BASE_HP * (HP_SCALING ^ (floor - 1)) * HP_MULTIPLIER
 * - 1층: 500 * 3 = 1,500 HP
 * - 10층: 500 * 1.15^9 * 3 ≈ 5,170 HP
 * - 50층: 500 * 1.15^49 * 3 ≈ 430,000 HP
 * - 100층: 500 * 1.15^99 * 3 ≈ 37,000,000 HP
 */
export function calculateEnemyStats(floor: number): CharacterStats {
  const {
    BASE_HP,
    BASE_DEFENSE,
    BASE_ATTACK,
    BASE_CRIT_RATE,
    BASE_CRIT_DAMAGE,
    BASE_ATTACK_SPEED,
    HP_SCALING,
    DEFENSE_SCALING,
    ATTACK_SCALING,
    CRIT_SCALING,
    SPEED_SCALING,
    HP_MULTIPLIER,
  } = TOWER_CONFIG

  const floorFactor = floor - 1

  // HP: 기하급수적 증가
  const hp = Math.floor(BASE_HP * Math.pow(HP_SCALING, floorFactor) * HP_MULTIPLIER)

  // 방어력: 완만한 기하급수적 증가
  const defense = Math.floor(BASE_DEFENSE * Math.pow(DEFENSE_SCALING, floorFactor))

  // 공격력: 완만한 기하급수적 증가
  const attack = Math.floor(BASE_ATTACK * Math.pow(ATTACK_SCALING, floorFactor))

  // 치명타 확률: 층당 조금씩 증가 (최대 30%), 소수점 1자리 반올림
  const critRate = Math.min(30, Math.round(BASE_CRIT_RATE * Math.pow(CRIT_SCALING, floorFactor) * 10) / 10)

  // 치명타 데미지: 고정
  const critDamage = BASE_CRIT_DAMAGE

  // 공격 속도: 층당 조금씩 증가 (최대 150)
  const attackSpeed = Math.min(150, Math.floor(BASE_ATTACK_SPEED * Math.pow(SPEED_SCALING, floorFactor)))

  return {
    attack,
    defense,
    hp,
    critRate,
    critDamage,
    penetration: 0,       // 적은 관통력 없음
    attackSpeed,
    evasion: 0,           // 적은 회피 없음
  }
}

// =============================================
// 층별 보상 계산
// =============================================

/**
 * 층 클리어 보상을 계산합니다.
 */
export function calculateFloorReward(
  floor: number,
  isFirstMilestone: boolean,
  isNewRecord: boolean
): TowerReward {
  const { BASE_GOLD_REWARD, GOLD_SCALING, MILESTONE_BONUS, RECORD_BONUS_MULTIPLIER } = TOWER_CONFIG

  // 기본 골드: BASE_GOLD_REWARD * (GOLD_SCALING ^ (floor - 1))
  const baseGold = Math.floor(BASE_GOLD_REWARD * Math.pow(GOLD_SCALING, floor - 1))

  // 10층 단위 최초 클리어 보너스
  const milestoneBonus = isFirstMilestone ? MILESTONE_BONUS * Math.floor(floor / 10) : 0

  // 기록 갱신 보너스
  const recordBonus = isNewRecord ? Math.floor(baseGold * RECORD_BONUS_MULTIPLIER) : 0

  return {
    baseGold,
    milestoneBonus,
    recordBonus,
    totalGold: baseGold + milestoneBonus + recordBonus,
  }
}

// =============================================
// 적 외형 결정
// =============================================

/**
 * 층에 따른 적 외형을 결정합니다.
 */
export function getEnemyVariant(floor: number): EnemyVariant {
  // 역순으로 검색하여 해당 층에 맞는 가장 높은 등급 찾기
  for (let i = ENEMY_VARIANTS.length - 1; i >= 0; i--) {
    if (floor >= ENEMY_VARIANTS[i].minFloor) {
      return ENEMY_VARIANTS[i]
    }
  }
  return ENEMY_VARIANTS[0]
}

// =============================================
// 층별 적 생성
// =============================================

/**
 * 특정 층의 적을 생성합니다.
 */
export function createFloorEnemy(floor: number): TowerEnemy {
  const stats = calculateEnemyStats(floor)
  const variant = getEnemyVariant(floor)

  // 이미지 폴더 결정 (현재는 scarecrow만 있음, 추후 monster 추가 가능)
  const imageFolder = variant.type === 'scarecrow' ? 'scarecrow' : 'scarecrow'

  return {
    id: `tower-enemy-${floor}`,
    name: `${floor}층 ${variant.name}`,
    type: variant.type,
    floor,
    stats,
    images: {
      idle: `/images/tower/${imageFolder}/0.png`,
      hit: `/images/tower/${imageFolder}/1.png`,
      attack: `/images/tower/${imageFolder}/2.png`,
      death: `/images/tower/${imageFolder}/3.png`,
    },
    emoji: variant.emoji,
  }
}

// =============================================
// 공격 간격 계산
// =============================================

/**
 * 공격속도를 공격 간격(ms)으로 변환합니다.
 * 공속 100 = 2000ms, 공속 200 = 1000ms, 공속 400 = 500ms
 */
export function calculateAttackInterval(attackSpeed: number): number {
  const safeSpeed = Math.max(1, attackSpeed || 100)
  const interval = TOWER_CONFIG.BASE_ATTACK_INTERVAL / (safeSpeed / 100)
  return Math.max(TOWER_CONFIG.MIN_ATTACK_INTERVAL, Math.floor(interval))
}

// =============================================
// 숫자 포맷팅
// =============================================

/**
 * 큰 숫자를 읽기 쉽게 포맷팅합니다.
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

// =============================================
// 층별 스탯 미리보기 (테이블용)
// =============================================

/**
 * 여러 층의 스탯을 미리보기용으로 계산합니다.
 */
export function getFloorStatsPreview(floors: number[]): Array<{
  floor: number
  hp: string
  defense: number
  attack: number
  expectedGold: number
}> {
  return floors.map(floor => {
    const stats = calculateEnemyStats(floor)
    const reward = calculateFloorReward(floor, floor % 10 === 0, false)

    return {
      floor,
      hp: formatLargeNumber(stats.hp),
      defense: stats.defense,
      attack: stats.attack,
      expectedGold: reward.totalGold,
    }
  })
}

// =============================================
// 마일스톤 체크
// =============================================

/**
 * 해당 층이 마일스톤(10층 단위)인지 확인합니다.
 */
export function isMilestoneFloor(floor: number): boolean {
  return floor > 0 && floor % 10 === 0
}

/**
 * 해당 층이 최초 클리어 마일스톤인지 확인합니다.
 */
export function isFirstMilestone(floor: number, clearedMilestones: number[]): boolean {
  return isMilestoneFloor(floor) && !clearedMilestones.includes(floor)
}
