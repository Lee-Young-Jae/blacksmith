/**
 * PvP Battle Logic Utilities
 *
 * 다회전 턴제 PvP 배틀의 코어 로직을 담당합니다.
 * - 선공 결정 (attackSpeed 기반)
 * - 데미지 계산 (모든 7대 스탯 활용)
 * - 카드 효과 적용
 * - 전체 배틀 시뮬레이션
 */

import type { CharacterStats } from '../types/stats'
import type {
  BattleRound,
  RoundEvent,
  PvPBattle,
  PvPBattleResult,
  DamageResult,
  TurnOrderResult,
} from '../types/pvpBattle'
import type { BattleCard } from '../types/battleCard'

// =============================================
// 배틀 설정 상수
// =============================================

const BATTLE_CONFIG = {
  MAX_ROUNDS: 20,
  CARD_CYCLE_ROUNDS: 2,
  SPEED_VARIANCE: 0.05,
  DAMAGE_VARIANCE: 0.15,
} as const

// =============================================
// 선공 결정
// =============================================

/**
 * 공격속도 기반으로 선공자를 결정합니다.
 * 공격속도가 높을수록 선공 확률이 높습니다.
 * ±5% 랜덤 요소를 추가하여 극단적인 결과를 방지합니다.
 */
export function determineTurnOrder(
  attackerSpeed: number,
  defenderSpeed: number
): TurnOrderResult {
  // 랜덤 롤 (±5% 변동)
  const attackerRoll = attackerSpeed * (1 + (Math.random() - 0.5) * BATTLE_CONFIG.SPEED_VARIANCE * 2)
  const defenderRoll = defenderSpeed * (1 + (Math.random() - 0.5) * BATTLE_CONFIG.SPEED_VARIANCE * 2)

  return {
    firstAttacker: attackerRoll >= defenderRoll ? 'attacker' : 'defender',
    attackerSpeed,
    defenderSpeed,
    attackerRoll: Math.round(attackerRoll * 100) / 100,
    defenderRoll: Math.round(defenderRoll * 100) / 100,
  }
}

// =============================================
// 데미지 계산
// =============================================

/**
 * 공격자의 스탯과 방어자의 스탯을 기반으로 데미지를 계산합니다.
 *
 * 데미지 공식:
 * 1. 기본 데미지 = 공격력
 * 2. 관통력 적용 = 기본 데미지 * (1 + 관통력/100) - 방어력 * (1 - 관통력/100)
 * 3. 치명타 판정 = critRate% 확률로 critDamage% 배율
 * 4. 랜덤 변동 = ±15%
 */
export function calculateDamage(
  attacker: CharacterStats,
  defender: CharacterStats,
  cardBonuses: {
    attackBoost?: number      // 공격력 증가 %
    defenseBoost?: number     // 방어력 증가 %
    critRateBoost?: number    // 치명타 확률 증가 %
    critDamageBoost?: number  // 치명타 데미지 증가 %
    penetrationBoost?: number // 관통력 증가 %
    guaranteedCrit?: boolean  // 확정 치명타
    firstStrikeDamage?: number // 선제 공격 고정 데미지
  } = {}
): DamageResult {
  // 스탯에 카드 보너스 적용
  const effectiveAttack = attacker.attack * (1 + (cardBonuses.attackBoost || 0) / 100)
  const effectiveDefense = defender.defense * (1 + (cardBonuses.defenseBoost || 0) / 100)
  const effectiveCritRate = Math.min(100, attacker.critRate + (cardBonuses.critRateBoost || 0))
  const effectiveCritDamage = attacker.critDamage + (cardBonuses.critDamageBoost || 0)
  const effectivePenetration = Math.min(100, attacker.penetration + (cardBonuses.penetrationBoost || 0))

  // 기본 데미지 계산
  const baseDamage = effectiveAttack

  // 방어력 감소 계산 (관통력이 방어력을 무시하는 비율)
  // 관통력 100%면 방어력 완전 무시, 0%면 방어력 전부 적용
  const penetrationMultiplier = effectivePenetration / 100
  const effectiveDefenseValue = effectiveDefense * (1 - penetrationMultiplier)

  // 방어력으로 인한 데미지 감소 (최소 10%는 들어감)
  const defenseReduction = Math.min(effectiveDefenseValue, baseDamage * 0.9)

  // 관통력 보너스 (방어력이 높을수록 관통력이 더 효과적)
  const penetrationBonus = effectiveDefense * penetrationMultiplier * 0.3

  // 중간 데미지
  let damage = Math.max(1, baseDamage - defenseReduction + penetrationBonus)

  // 치명타 판정
  const isCrit = cardBonuses.guaranteedCrit || Math.random() * 100 < effectiveCritRate
  const critMultiplier = isCrit ? effectiveCritDamage / 100 : 1

  if (isCrit) {
    damage *= critMultiplier
  }

  // 랜덤 변동 (±15%)
  const variance = 1 + (Math.random() - 0.5) * BATTLE_CONFIG.DAMAGE_VARIANCE * 2
  damage *= variance

  // 선제 공격 보너스
  if (cardBonuses.firstStrikeDamage) {
    damage += cardBonuses.firstStrikeDamage
  }

  // 최종 데미지 (정수로 반올림)
  const finalDamage = Math.round(Math.max(1, damage))

  return {
    baseDamage: Math.round(baseDamage),
    finalDamage,
    isCrit,
    critMultiplier,
    defenseReduction: Math.round(defenseReduction),
    penetrationBonus: Math.round(penetrationBonus),
    cardBonus: (cardBonuses.attackBoost || 0) + (cardBonuses.firstStrikeDamage || 0),
    reflectedDamage: 0, // 반사 데미지는 별도 처리
  }
}

// =============================================
// 카드 효과 적용
// =============================================

export interface RoundCardEffects {
  attackBoost: number
  defenseBoost: number
  critRateBoost: number
  critDamageBoost: number
  penetrationBoost: number
  speedBoost: number
  guaranteedCrit: boolean
  damageReflect: number
  firstStrikeDamage: number
  hpRecovery: number
  immunity: boolean
  lifesteal: number
  doubleAttack: boolean
  stun: boolean
}

/**
 * 현재 라운드에서 활성화된 카드의 효과를 계산합니다.
 * 카드는 2라운드마다 순차적으로 발동됩니다.
 */
export function getActiveCardForRound(
  cards: BattleCard[],
  round: number
): BattleCard | null {
  if (cards.length === 0) return null

  // 2라운드마다 다음 카드 (0-1: 1번, 2-3: 2번, 4-5: 3번, 6-7: 1번 반복...)
  const cardIndex = Math.floor((round - 1) / BATTLE_CONFIG.CARD_CYCLE_ROUNDS) % cards.length
  return cards[cardIndex] || null
}

/**
 * 카드 효과를 파싱하여 스탯 보너스 객체로 변환합니다.
 */
export function parseCardEffects(card: BattleCard | null): RoundCardEffects {
  const effects: RoundCardEffects = {
    attackBoost: 0,
    defenseBoost: 0,
    critRateBoost: 0,
    critDamageBoost: 0,
    penetrationBoost: 0,
    speedBoost: 0,
    guaranteedCrit: false,
    damageReflect: 0,
    firstStrikeDamage: 0,
    hpRecovery: 0,
    immunity: false,
    lifesteal: 0,
    doubleAttack: false,
    stun: false,
  }

  if (!card) return effects

  const { type, value } = card.effect

  switch (type) {
    case 'attack_boost':
      effects.attackBoost = value
      break
    case 'defense_boost':
      effects.defenseBoost = value
      break
    case 'crit_rate_boost':
      effects.critRateBoost = value
      break
    case 'crit_damage_boost':
      effects.critDamageBoost = value
      break
    case 'penetration_boost':
      effects.penetrationBoost = value
      break
    case 'speed_boost':
      effects.speedBoost = value
      break
    case 'guaranteed_crit':
      effects.guaranteedCrit = true
      break
    case 'damage_reflect':
      effects.damageReflect = value
      break
    case 'first_strike':
      effects.firstStrikeDamage = value
      break
    case 'hp_recovery':
      effects.hpRecovery = value
      break
    case 'immunity':
      effects.immunity = true
      break
    case 'lifesteal':
      effects.lifesteal = value
      break
    case 'double_attack':
      effects.doubleAttack = true
      break
    case 'stun':
      effects.stun = true
      break
  }

  return effects
}

// =============================================
// 라운드 계산
// =============================================

export interface RoundContext {
  round: number
  attackerStats: CharacterStats
  defenderStats: CharacterStats
  attackerHp: number
  defenderHp: number
  attackerMaxHp: number
  defenderMaxHp: number
  attackerCards: BattleCard[]
  defenderCards: BattleCard[]
  attackerStunned: boolean
  defenderStunned: boolean
}

export interface RoundResult {
  round: BattleRound
  attackerHpAfter: number
  defenderHpAfter: number
  attackerStunnedNext: boolean
  defenderStunnedNext: boolean
}

/**
 * 한 라운드를 계산합니다.
 */
export function calculateRound(context: RoundContext): RoundResult {
  const {
    round,
    attackerStats,
    defenderStats,
    attackerHp,
    defenderHp,
    attackerMaxHp,
    defenderMaxHp,
    attackerCards,
    defenderCards,
    attackerStunned,
    defenderStunned,
  } = context

  const events: RoundEvent[] = []

  // 현재 라운드 활성 카드
  const attackerCard = getActiveCardForRound(attackerCards, round)
  const defenderCard = getActiveCardForRound(defenderCards, round)

  const attackerEffects = parseCardEffects(attackerCard)
  const defenderEffects = parseCardEffects(defenderCard)

  // 스피드 보너스 적용하여 선공 결정
  const attackerEffectiveSpeed = attackerStats.attackSpeed * (1 + attackerEffects.speedBoost / 100)
  const defenderEffectiveSpeed = defenderStats.attackSpeed * (1 + defenderEffects.speedBoost / 100)

  const turnOrder = determineTurnOrder(attackerEffectiveSpeed, defenderEffectiveSpeed)

  let currentAttackerHp = attackerHp
  let currentDefenderHp = defenderHp
  let attackerStunnedNext = false
  let defenderStunnedNext = false

  // HP 회복 처리 (턴 시작 시)
  if (attackerEffects.hpRecovery > 0 && !attackerStunned) {
    const healAmount = Math.floor(attackerMaxHp * attackerEffects.hpRecovery / 100)
    currentAttackerHp = Math.min(attackerMaxHp, currentAttackerHp + healAmount)
    events.push({
      type: 'heal',
      source: 'attacker',
      value: healAmount,
      description: `HP ${healAmount} 회복`,
    })
  }
  if (defenderEffects.hpRecovery > 0 && !defenderStunned) {
    const healAmount = Math.floor(defenderMaxHp * defenderEffects.hpRecovery / 100)
    currentDefenderHp = Math.min(defenderMaxHp, currentDefenderHp + healAmount)
    events.push({
      type: 'heal',
      source: 'defender',
      value: healAmount,
      description: `HP ${healAmount} 회복`,
    })
  }

  // 공격자 행동
  let attackerDamage = 0
  let attackerIsCrit = false
  let attackerCardEffect: string | null = null

  if (!attackerStunned) {
    const damageResult = calculateDamage(attackerStats, defenderStats, {
      attackBoost: attackerEffects.attackBoost,
      critRateBoost: attackerEffects.critRateBoost,
      critDamageBoost: attackerEffects.critDamageBoost,
      penetrationBoost: attackerEffects.penetrationBoost,
      guaranteedCrit: attackerEffects.guaranteedCrit,
      firstStrikeDamage: attackerEffects.firstStrikeDamage,
    })

    attackerDamage = damageResult.finalDamage
    attackerIsCrit = damageResult.isCrit

    if (attackerCard) {
      attackerCardEffect = attackerCard.description
    }

    // 면역 체크
    if (defenderEffects.immunity) {
      attackerDamage = 0
      events.push({
        type: 'immunity',
        source: 'defender',
        value: damageResult.finalDamage,
        description: '피해 면역',
      })
    } else {
      // 데미지 적용
      currentDefenderHp = Math.max(0, currentDefenderHp - attackerDamage)

      // 반사 데미지
      if (defenderEffects.damageReflect > 0) {
        const reflectDamage = Math.floor(attackerDamage * defenderEffects.damageReflect / 100)
        currentAttackerHp = Math.max(0, currentAttackerHp - reflectDamage)
        events.push({
          type: 'damage_reflect',
          source: 'defender',
          value: reflectDamage,
          description: `${reflectDamage} 반사 데미지`,
        })
      }

      // 흡혈
      if (attackerEffects.lifesteal > 0) {
        const lifestealAmount = Math.floor(attackerDamage * attackerEffects.lifesteal / 100)
        currentAttackerHp = Math.min(attackerMaxHp, currentAttackerHp + lifestealAmount)
        events.push({
          type: 'heal',
          source: 'attacker',
          value: lifestealAmount,
          description: `흡혈 ${lifestealAmount} HP 회복`,
        })
      }

      // 스턴
      if (attackerEffects.stun) {
        defenderStunnedNext = true
        events.push({
          type: 'stun',
          source: 'attacker',
          value: 1,
          description: '스턴! 다음 턴 스킵',
        })
      }

      // 치명타 이벤트
      if (attackerIsCrit) {
        events.push({
          type: 'critical_hit',
          source: 'attacker',
          value: attackerDamage,
          description: '치명타!',
        })
      }
    }

    // 연속 공격
    if (attackerEffects.doubleAttack && currentDefenderHp > 0) {
      const secondDamage = calculateDamage(attackerStats, defenderStats, {
        attackBoost: attackerEffects.attackBoost,
        critRateBoost: attackerEffects.critRateBoost,
        critDamageBoost: attackerEffects.critDamageBoost,
        penetrationBoost: attackerEffects.penetrationBoost,
      })

      if (!defenderEffects.immunity) {
        currentDefenderHp = Math.max(0, currentDefenderHp - secondDamage.finalDamage)
        events.push({
          type: 'double_attack',
          source: 'attacker',
          value: secondDamage.finalDamage,
          description: `연속 공격! ${secondDamage.finalDamage} 추가 데미지`,
        })
      }
    }
  }

  // 방어자 행동 (죽지 않았고 스턴되지 않은 경우)
  let defenderDamage = 0
  let defenderIsCrit = false
  let defenderCardEffect: string | null = null

  if (!defenderStunned && currentDefenderHp > 0) {
    const damageResult = calculateDamage(defenderStats, attackerStats, {
      attackBoost: defenderEffects.attackBoost,
      defenseBoost: defenderEffects.defenseBoost,
      critRateBoost: defenderEffects.critRateBoost,
      critDamageBoost: defenderEffects.critDamageBoost,
      penetrationBoost: defenderEffects.penetrationBoost,
      guaranteedCrit: defenderEffects.guaranteedCrit,
      firstStrikeDamage: defenderEffects.firstStrikeDamage,
    })

    defenderDamage = damageResult.finalDamage
    defenderIsCrit = damageResult.isCrit

    if (defenderCard) {
      defenderCardEffect = defenderCard.description
    }

    // 면역 체크
    if (attackerEffects.immunity) {
      defenderDamage = 0
      events.push({
        type: 'immunity',
        source: 'attacker',
        value: damageResult.finalDamage,
        description: '피해 면역',
      })
    } else {
      // 데미지 적용
      currentAttackerHp = Math.max(0, currentAttackerHp - defenderDamage)

      // 반사 데미지
      if (attackerEffects.damageReflect > 0) {
        const reflectDamage = Math.floor(defenderDamage * attackerEffects.damageReflect / 100)
        currentDefenderHp = Math.max(0, currentDefenderHp - reflectDamage)
        events.push({
          type: 'damage_reflect',
          source: 'attacker',
          value: reflectDamage,
          description: `${reflectDamage} 반사 데미지`,
        })
      }

      // 흡혈
      if (defenderEffects.lifesteal > 0) {
        const lifestealAmount = Math.floor(defenderDamage * defenderEffects.lifesteal / 100)
        currentDefenderHp = Math.min(defenderMaxHp, currentDefenderHp + lifestealAmount)
        events.push({
          type: 'heal',
          source: 'defender',
          value: lifestealAmount,
          description: `흡혈 ${lifestealAmount} HP 회복`,
        })
      }

      // 스턴
      if (defenderEffects.stun) {
        attackerStunnedNext = true
        events.push({
          type: 'stun',
          source: 'defender',
          value: 1,
          description: '스턴! 다음 턴 스킵',
        })
      }

      // 치명타 이벤트
      if (defenderIsCrit) {
        events.push({
          type: 'critical_hit',
          source: 'defender',
          value: defenderDamage,
          description: '치명타!',
        })
      }
    }

    // 연속 공격
    if (defenderEffects.doubleAttack && currentAttackerHp > 0) {
      const secondDamage = calculateDamage(defenderStats, attackerStats, {
        attackBoost: defenderEffects.attackBoost,
        critRateBoost: defenderEffects.critRateBoost,
        critDamageBoost: defenderEffects.critDamageBoost,
        penetrationBoost: defenderEffects.penetrationBoost,
      })

      if (!attackerEffects.immunity) {
        currentAttackerHp = Math.max(0, currentAttackerHp - secondDamage.finalDamage)
        events.push({
          type: 'double_attack',
          source: 'defender',
          value: secondDamage.finalDamage,
          description: `연속 공격! ${secondDamage.finalDamage} 추가 데미지`,
        })
      }
    }
  }

  const battleRound: BattleRound = {
    round,
    firstAttacker: turnOrder.firstAttacker,
    attackerAction: {
      damage: attackerDamage,
      isCrit: attackerIsCrit,
      cardUsed: attackerCard,
      cardEffect: attackerCardEffect,
    },
    defenderAction: {
      damage: defenderDamage,
      isCrit: defenderIsCrit,
      cardUsed: defenderCard,
      cardEffect: defenderCardEffect,
    },
    attackerHpBefore: attackerHp,
    attackerHpAfter: currentAttackerHp,
    defenderHpBefore: defenderHp,
    defenderHpAfter: currentDefenderHp,
    events,
  }

  return {
    round: battleRound,
    attackerHpAfter: currentAttackerHp,
    defenderHpAfter: currentDefenderHp,
    attackerStunnedNext,
    defenderStunnedNext,
  }
}

// =============================================
// 전체 배틀 시뮬레이션
// =============================================

export interface BattleSimulationInput {
  attackerId: string
  defenderId: string
  attackerName: string
  defenderName: string
  attackerStats: CharacterStats
  defenderStats: CharacterStats
  attackerCards: BattleCard[]
  defenderCards: BattleCard[]
  isRevenge?: boolean
}

/**
 * 전체 PvP 배틀을 시뮬레이션합니다.
 */
export function calculatePvPBattle(input: BattleSimulationInput): PvPBattle {
  const {
    attackerId,
    defenderId,
    attackerName,
    defenderName,
    attackerStats,
    defenderStats,
    attackerCards,
    defenderCards,
    isRevenge = false,
  } = input

  const rounds: BattleRound[] = []

  // 초기 HP
  let attackerHp = attackerStats.hp
  let defenderHp = defenderStats.hp
  const attackerMaxHp = attackerStats.hp
  const defenderMaxHp = defenderStats.hp

  // 스턴 상태
  let attackerStunned = false
  let defenderStunned = false

  // 초기 선공 결정 (전체 배틀)
  const initialTurnOrder = determineTurnOrder(attackerStats.attackSpeed, defenderStats.attackSpeed)

  // 라운드 진행
  for (let round = 1; round <= BATTLE_CONFIG.MAX_ROUNDS; round++) {
    const roundResult = calculateRound({
      round,
      attackerStats,
      defenderStats,
      attackerHp,
      defenderHp,
      attackerMaxHp,
      defenderMaxHp,
      attackerCards,
      defenderCards,
      attackerStunned,
      defenderStunned,
    })

    rounds.push(roundResult.round)
    attackerHp = roundResult.attackerHpAfter
    defenderHp = roundResult.defenderHpAfter
    attackerStunned = roundResult.attackerStunnedNext
    defenderStunned = roundResult.defenderStunnedNext

    // 승패 결정
    if (attackerHp <= 0 || defenderHp <= 0) {
      break
    }
  }

  // 결과 판정
  let result: PvPBattleResult
  let winnerId: string | null = null

  if (attackerHp <= 0 && defenderHp <= 0) {
    result = 'draw'
  } else if (defenderHp <= 0) {
    result = 'attacker_win'
    winnerId = attackerId
  } else if (attackerHp <= 0) {
    result = 'defender_win'
    winnerId = defenderId
  } else {
    // 최대 라운드 도달 - HP 비율로 판정
    const attackerHpRatio = attackerHp / attackerMaxHp
    const defenderHpRatio = defenderHp / defenderMaxHp

    if (attackerHpRatio > defenderHpRatio) {
      result = 'attacker_win'
      winnerId = attackerId
    } else if (defenderHpRatio > attackerHpRatio) {
      result = 'defender_win'
      winnerId = defenderId
    } else {
      result = 'draw'
    }
  }

  // 레이팅 변경 계산은 호출자가 별도로 처리

  return {
    id: `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    attackerId,
    defenderId,
    attackerName,
    defenderName,
    attackerStats,
    defenderStats,
    attackerCards,
    defenderCards,
    rounds,
    totalRounds: rounds.length,
    firstAttacker: initialTurnOrder.firstAttacker,
    attackerSpeed: initialTurnOrder.attackerSpeed,
    defenderSpeed: initialTurnOrder.defenderSpeed,
    result,
    winnerId,
    attackerFinalHp: Math.max(0, attackerHp),
    defenderFinalHp: Math.max(0, defenderHp),
    attackerReward: 0,  // 호출자가 설정
    defenderReward: 0,  // 호출자가 설정
    attackerRatingChange: 0,  // 호출자가 설정
    defenderRatingChange: 0,  // 호출자가 설정
    isRevenge,
    createdAt: new Date(),
  }
}

// =============================================
// 유틸리티 함수
// =============================================

/**
 * 배틀 결과 요약 생성
 */
export function generateBattleSummary(battle: PvPBattle): string {
  const { attackerName, defenderName, result, totalRounds, attackerFinalHp, defenderFinalHp } = battle

  let resultText: string
  switch (result) {
    case 'attacker_win':
      resultText = `${attackerName} 승리!`
      break
    case 'defender_win':
      resultText = `${defenderName} 승리!`
      break
    case 'draw':
      resultText = '무승부!'
      break
  }

  return `${resultText} (${totalRounds}라운드, HP: ${attackerFinalHp} vs ${defenderFinalHp})`
}

/**
 * 배틀 통계 계산
 */
export function calculateBattleStats(battle: PvPBattle): {
  totalDamageDealt: { attacker: number; defender: number }
  totalCrits: { attacker: number; defender: number }
  cardsUsed: { attacker: number; defender: number }
  avgDamagePerRound: { attacker: number; defender: number }
} {
  let attackerDamage = 0
  let defenderDamage = 0
  let attackerCrits = 0
  let defenderCrits = 0
  const attackerCardsUsed = new Set<string>()
  const defenderCardsUsed = new Set<string>()

  for (const round of battle.rounds) {
    attackerDamage += round.attackerAction.damage
    defenderDamage += round.defenderAction.damage

    if (round.attackerAction.isCrit) attackerCrits++
    if (round.defenderAction.isCrit) defenderCrits++

    if (round.attackerAction.cardUsed) {
      attackerCardsUsed.add(round.attackerAction.cardUsed.id)
    }
    if (round.defenderAction.cardUsed) {
      defenderCardsUsed.add(round.defenderAction.cardUsed.id)
    }
  }

  const totalRounds = battle.rounds.length

  return {
    totalDamageDealt: { attacker: attackerDamage, defender: defenderDamage },
    totalCrits: { attacker: attackerCrits, defender: defenderCrits },
    cardsUsed: { attacker: attackerCardsUsed.size, defender: defenderCardsUsed.size },
    avgDamagePerRound: {
      attacker: Math.round(attackerDamage / totalRounds),
      defender: Math.round(defenderDamage / totalRounds),
    },
  }
}
