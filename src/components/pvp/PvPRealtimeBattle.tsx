/**
 * PvP Realtime Battle
 *
 * 실시간 배틀 - 플레이어가 액티브 스킬을 직접 사용
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CharacterStats } from '../../types/stats'
import type { BattleCard } from '../../types/battleCard'
import { PVP_BATTLE_CONFIG } from '../../types/pvpBattle'
import { GiCrossedSwords, GiTwoCoins, GiTrophy, GiCardRandom, GiStopwatch } from 'react-icons/gi'
import { FaUser, FaSkull, FaHandshake } from 'react-icons/fa'

// =============================================
// 타입 정의
// =============================================

interface PvPRealtimeBattleProps {
  // 플레이어 정보
  playerName: string
  playerAvatarUrl?: string  // 플레이어 프로필 이미지
  playerStats: CharacterStats
  playerCards: BattleCard[]

  // 상대 정보
  opponentName: string
  opponentAvatarUrl?: string  // 상대 프로필 이미지
  opponentStats: CharacterStats
  opponentCards: BattleCard[]
  opponentIsAI?: boolean

  // 보상 정보
  winReward?: number      // 승리 시 보상
  loseReward?: number     // 패배 시 보상
  drawReward?: number     // 무승부 시 보상

  // 콜백
  onBattleEnd: (result: BattleResult) => void
  onCancel?: () => void
}

interface BattleResult {
  winner: 'player' | 'opponent' | 'draw'
  playerFinalHp: number
  opponentFinalHp: number
  battleDuration: number
}

interface SkillState {
  card: BattleCard
  cooldownRemaining: number  // 남은 쿨다운 (초)
  durationRemaining: number  // 남은 지속시간 (초)
  isActive: boolean          // 효과가 활성화되어 있는지
}

interface FloatingDamage {
  id: number
  damage: number
  isCrit: boolean
  isHeal: boolean
  isMiss: boolean  // 회피 시 MISS 표시
  target: 'player' | 'opponent'
}

// =============================================
// 컴포넌트
// =============================================

export function PvPRealtimeBattle({
  playerName,
  playerAvatarUrl,
  playerStats,
  playerCards,
  opponentName,
  opponentAvatarUrl,
  opponentStats,
  opponentCards,
  opponentIsAI = true,
  winReward = 500,
  loseReward = 100,
  drawReward = 250,
  onBattleEnd,
}: PvPRealtimeBattleProps) {
  // HP 배율 적용
  const hpMultiplier = PVP_BATTLE_CONFIG.HP_MULTIPLIER
  const damageReduction = PVP_BATTLE_CONFIG.DAMAGE_REDUCTION

  // 기본 스탯 (장비 미착용 시 사용)
  const DEFAULT_STATS: CharacterStats = {
    hp: 100,
    attack: 10,
    defense: 5,
    critRate: 5,
    critDamage: 150,
    attackSpeed: 100,
    penetration: 0,
    evasion: 0,
  }

  // 안전한 스탯 (undefined/0 방지)
  const safePlayerStats: CharacterStats = {
    hp: playerStats.hp || DEFAULT_STATS.hp,
    attack: playerStats.attack || DEFAULT_STATS.attack,
    defense: playerStats.defense || DEFAULT_STATS.defense,
    critRate: playerStats.critRate ?? DEFAULT_STATS.critRate,
    critDamage: playerStats.critDamage || DEFAULT_STATS.critDamage,
    attackSpeed: playerStats.attackSpeed || DEFAULT_STATS.attackSpeed,
    penetration: playerStats.penetration ?? DEFAULT_STATS.penetration,
    evasion: playerStats.evasion ?? DEFAULT_STATS.evasion,
  }

  const safeOpponentStats: CharacterStats = {
    hp: opponentStats.hp || DEFAULT_STATS.hp,
    attack: opponentStats.attack || DEFAULT_STATS.attack,
    defense: opponentStats.defense || DEFAULT_STATS.defense,
    critRate: opponentStats.critRate ?? DEFAULT_STATS.critRate,
    critDamage: opponentStats.critDamage || DEFAULT_STATS.critDamage,
    attackSpeed: opponentStats.attackSpeed || DEFAULT_STATS.attackSpeed,
    penetration: opponentStats.penetration ?? DEFAULT_STATS.penetration,
    evasion: opponentStats.evasion ?? DEFAULT_STATS.evasion,
  }

  // 상태
  const [playerHp, setPlayerHp] = useState(safePlayerStats.hp * hpMultiplier)
  const [opponentHp, setOpponentHp] = useState(safeOpponentStats.hp * hpMultiplier)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [battleEnded, setBattleEnded] = useState(false)
  const [resultConfirmed, setResultConfirmed] = useState(false)  // 결과 확인 중복 방지

  // 스킬 상태
  const [playerSkills, setPlayerSkills] = useState<SkillState[]>(() =>
    playerCards.map(card => ({
      card,
      cooldownRemaining: 0,
      durationRemaining: 0,
      isActive: false,
    }))
  )

  const [opponentSkills, setOpponentSkills] = useState<SkillState[]>(() =>
    opponentCards.map(card => ({
      card,
      cooldownRemaining: 0,
      durationRemaining: 0,
      isActive: false,
    }))
  )

  // 카드가 늦게 로드되는 경우 스킬 상태 업데이트
  useEffect(() => {
    if (opponentCards.length > 0 && opponentSkills.length === 0) {
      setOpponentSkills(opponentCards.map(card => ({
        card,
        cooldownRemaining: 0,
        durationRemaining: 0,
        isActive: false,
      })))
    }
  }, [opponentCards, opponentSkills.length])

  // 스턴 상태 (스킬 사용 불가 + 공격 불가)
  const [playerStunDuration, setPlayerStunDuration] = useState(0)
  const [opponentStunDuration, setOpponentStunDuration] = useState(0)
  const playerStunRef = useRef(0)
  const opponentStunRef = useRef(0)

  // 침묵 상태 (스킬 사용 불가, 공격은 가능)
  const [playerSilenceDuration, setPlayerSilenceDuration] = useState(0)
  const [opponentSilenceDuration, setOpponentSilenceDuration] = useState(0)
  const playerSilenceRef = useRef(0)
  const opponentSilenceRef = useRef(0)

  // 회복 피로 상태 (연속 회복 방지, 10초간 회복 불가)
  const [playerHealFatigue, setPlayerHealFatigue] = useState(0)
  const [opponentHealFatigue, setOpponentHealFatigue] = useState(0)
  const playerHealFatigueRef = useRef(0)
  const opponentHealFatigueRef = useRef(0)

  // 스킬 상태 ref (게임 루프에서 사용)
  const playerSkillsRef = useRef(playerSkills)
  const opponentSkillsRef = useRef(opponentSkills)

  // 스킬 상태 변경 시 ref도 업데이트
  useEffect(() => {
    playerSkillsRef.current = playerSkills
  }, [playerSkills])

  useEffect(() => {
    opponentSkillsRef.current = opponentSkills
  }, [opponentSkills])

  // 스턴 상태 ref 동기화
  useEffect(() => {
    playerStunRef.current = playerStunDuration
  }, [playerStunDuration])

  useEffect(() => {
    opponentStunRef.current = opponentStunDuration
  }, [opponentStunDuration])

  // 침묵 상태 ref 동기화
  useEffect(() => {
    playerSilenceRef.current = playerSilenceDuration
  }, [playerSilenceDuration])

  useEffect(() => {
    opponentSilenceRef.current = opponentSilenceDuration
  }, [opponentSilenceDuration])

  // 회복 피로 ref 동기화
  useEffect(() => {
    playerHealFatigueRef.current = playerHealFatigue
  }, [playerHealFatigue])

  useEffect(() => {
    opponentHealFatigueRef.current = opponentHealFatigue
  }, [opponentHealFatigue])

  // 플로팅 데미지
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([])
  const damageIdRef = useRef(0)

  // 공격 애니메이션 상태
  const [attackAnimation, setAttackAnimation] = useState<{
    attacker: 'player' | 'opponent' | null
    isCrit: boolean
  }>({ attacker: null, isCrit: false })

  // 화면 흔들림 상태
  const [screenShake, setScreenShake] = useState(false)

  // 스킬 사용 알림
  const [skillNotification, setSkillNotification] = useState<{
    user: 'player' | 'opponent'
    skillName: string
    emoji: string
  } | null>(null)

  // 공격 타이머
  const playerNextAttackRef = useRef(1000)
  const opponentNextAttackRef = useRef(1200)
  const lastUpdateRef = useRef(Date.now())

  // AI 스킬 체크 타이머 (1초마다)
  const aiSkillCheckRef = useRef(2000)

  // 경과 시간 ref (AI 스킬용)
  const elapsedTimeRef = useRef(0)

  // 스킬 중복 실행 방지 ref
  const skillLastUsedRef = useRef<Record<number, number>>({})
  const SKILL_DEBOUNCE_MS = 100

  // HP ref (게임 루프에서 읽기용)
  const playerHpRef = useRef(playerHp)
  const opponentHpRef = useRef(opponentHp)

  useEffect(() => {
    playerHpRef.current = playerHp
  }, [playerHp])

  useEffect(() => {
    opponentHpRef.current = opponentHp
  }, [opponentHp])

  // Max HP
  const playerMaxHp = safePlayerStats.hp * hpMultiplier
  const opponentMaxHp = safeOpponentStats.hp * hpMultiplier

  // 낮은 HP 경고
  const isLowHp = playerHp / playerMaxHp < 0.3

  // 플로팅 데미지 추가 + 공격 애니메이션
  const addFloatingDamage = useCallback((
    target: 'player' | 'opponent',
    damage: number,
    isCrit: boolean,
    isHeal: boolean = false,
    isMiss: boolean = false
  ) => {
    const id = damageIdRef.current++
    setFloatingDamages(prev => [...prev, { id, damage, isCrit, isHeal, isMiss, target }])
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== id))
    }, 800)

    // 공격 애니메이션 (힐이 아닐 때만)
    if (!isHeal && damage > 0) {
      const attacker = target === 'player' ? 'opponent' : 'player'
      setAttackAnimation({ attacker, isCrit })
      setTimeout(() => setAttackAnimation({ attacker: null, isCrit: false }), 300)

      // 화면 흔들림 (치명타이거나 피격 시)
      if (isCrit || target === 'player') {
        setScreenShake(true)
        setTimeout(() => setScreenShake(false), 150)
      }
    }
  }, [])

  // 스킬 사용 알림 표시
  const showSkillNotification = useCallback((
    user: 'player' | 'opponent',
    skillName: string,
    emoji: string
  ) => {
    setSkillNotification({ user, skillName, emoji })
    setTimeout(() => setSkillNotification(null), 1500)
  }, [])

  // 패시브 효과 계산
  const getPassiveBonus = useCallback((skills: SkillState[], effectType: string): number => {
    return skills
      .filter(s => s.card.activationType === 'passive' && s.card.effect.type === effectType)
      .reduce((sum, s) => sum + s.card.effect.value, 0)
  }, [])

  // 활성화된 액티브 효과 확인
  const hasActiveEffect = useCallback((skills: SkillState[], effectType: string): boolean => {
    return skills.some(s => s.isActive && s.card.effect.type === effectType)
  }, [])

  // 활성화된 액티브 효과의 값 가져오기 (동일 효과 합산)
  const getActiveEffectValue = useCallback((skills: SkillState[], effectType: string): number => {
    return skills
      .filter(s => s.isActive && s.card.effect.type === effectType)
      .reduce((sum, s) => sum + s.card.effect.value, 0)
  }, [])

  // 데미지 계산
  const calculateDamage = useCallback((
    attackerStats: CharacterStats,
    defenderStats: CharacterStats,
    attackerSkills: SkillState[],
    defenderSkills: SkillState[],
    defenderHpRatio: number = 1  // 상대 HP 비율 (처형 효과용)
  ): { damage: number; isCrit: boolean } => {
    // 패시브 보너스
    const attackBonus = getPassiveBonus(attackerSkills, 'attack_boost')
    const defenseBonus = getPassiveBonus(defenderSkills, 'defense_boost')
    const critRateBonus = getPassiveBonus(attackerSkills, 'crit_rate_boost')
    const critDamageBonus = getPassiveBonus(attackerSkills, 'crit_damage_boost')
    const penetrationBonus = getPassiveBonus(attackerSkills, 'penetration_boost')

    // 기본 데미지 (공격력 기반, 방어력은 감소율로 적용)
    const attack = Math.max(1, attackerStats.attack || 10) * (1 + attackBonus / 100)
    const defense = Math.max(0, defenderStats.defense || 5) * (1 + defenseBonus / 100)
    const penetration = Math.min(100, (attackerStats.penetration || 0) + penetrationBonus)

    // 방어력 감소율: defense / (defense + 100) → 방어력 100이면 50% 감소
    // 계수 0.7 적용 → 방어력 100 시 실제 35% 데미지 감소 (버프됨)
    const defenseReductionRate = defense / (defense + 100) * (1 - penetration / 100)
    let baseDamage = Math.max(1, attack * (1 - defenseReductionRate * 0.7))

    // 데미지 랜덤 범위
    const variance = PVP_BATTLE_CONFIG.DAMAGE_VARIANCE
    baseDamage *= (1 - variance + Math.random() * variance * 2)

    // 치명타 체크
    const critRate = Math.min(100, attackerStats.critRate + critRateBonus)
    const guaranteedCrit = hasActiveEffect(attackerSkills, 'guaranteed_crit')
    const isCrit = guaranteedCrit || Math.random() * 100 < critRate

    if (isCrit) {
      const critDamage = attackerStats.critDamage + critDamageBonus
      baseDamage *= (critDamage / 100)
    }

    // 폭풍 연타: 공격속도 대폭 증가 대신 공격력 감소
    // value는 공격속도 증가량, 공격력 감소는 value/5로 계산
    const stormStrikeValue = getActiveEffectValue(attackerSkills, 'double_attack')
    if (stormStrikeValue > 0) {
      const atkPenalty = stormStrikeValue / 5  // 150% → -30%, 200% → -40%
      baseDamage *= (1 - atkPenalty / 100)
    }

    // 면역 체크
    if (hasActiveEffect(defenderSkills, 'immunity')) {
      return { damage: 0, isCrit: false }
    }

    // 데미지 감소 적용 (최소 1 데미지 보장)
    let finalDamage = Math.max(1, Math.floor(baseDamage * damageReduction))

    // 처형 효과: 상대 HP 50% 이하 시 추가 데미지 (버프됨)
    const executeBonus = getPassiveBonus(attackerSkills, 'execute')
    if (executeBonus > 0 && defenderHpRatio <= 0.5) {
      finalDamage = Math.floor(finalDamage * (1 + executeBonus / 100))
    }

    return { damage: finalDamage, isCrit }
  }, [getPassiveBonus, hasActiveEffect, damageReduction])

  // 스킬 사용
  const useSkill = useCallback((skillIndex: number) => {
    // 스턴 또는 침묵 상태에서는 스킬 사용 불가
    if (playerStunRef.current > 0) return
    if (playerSilenceRef.current > 0) return

    // 중복 실행 방지 (100ms 이내 재실행 차단)
    const now = Date.now()
    const lastUsed = skillLastUsedRef.current[skillIndex] || 0
    if (now - lastUsed < SKILL_DEBOUNCE_MS) return
    skillLastUsedRef.current[skillIndex] = now

    // 먼저 스킬 정보 확인
    const skillToUse = playerSkillsRef.current[skillIndex]
    if (!skillToUse) return
    if (skillToUse.cooldownRemaining > 0) return
    if (skillToUse.card.activationType === 'passive') return

    // 회복 피로 상태에서는 회복 스킬 사용 불가
    if (skillToUse.card.effect.type === 'hp_recovery' && playerHealFatigueRef.current > 0) return

    const card = skillToUse.card
    const effect = card.effect

    // 스킬 사용 알림 표시
    showSkillNotification('player', card.name, card.emoji)

    // 즉시 효과 처리 (setState 콜백 바깥에서 실행)
    if (effect.type === 'hp_recovery') {
      const antiHealReduction = getPassiveBonus(opponentSkillsRef.current, 'anti_heal')
      const healMultiplier = Math.max(0, 1 - antiHealReduction / 100)
      const baseHealAmount = Math.floor(playerHpRef.current * effect.value / 100)
      const healAmount = Math.floor(baseHealAmount * healMultiplier)
      const newPlayerHp = Math.min(playerMaxHp, playerHpRef.current + healAmount)
      playerHpRef.current = newPlayerHp
      setPlayerHp(newPlayerHp)
      addFloatingDamage('player', healAmount, false, true)
      setPlayerHealFatigue(10)
    } else if (effect.type === 'first_strike') {
      const bonusDamage = Math.floor(opponentMaxHp * effect.value / 100)
      const newOpponentHp = Math.max(0, opponentHpRef.current - bonusDamage)
      opponentHpRef.current = newOpponentHp
      setOpponentHp(newOpponentHp)
      addFloatingDamage('opponent', bonusDamage, false, false)
    } else if (effect.type === 'shield_bash') {
      const defense = safePlayerStats.defense * (1 + getPassiveBonus(playerSkillsRef.current, 'defense_boost') / 100)
      const bonusDamage = Math.floor(defense * effect.value / 100)
      const newOpponentHp = Math.max(0, opponentHpRef.current - bonusDamage)
      opponentHpRef.current = newOpponentHp
      setOpponentHp(newOpponentHp)
      addFloatingDamage('opponent', bonusDamage, false, false)
    } else if (effect.type === 'stun') {
      const stunDuration = card.duration > 0 ? card.duration : 2
      opponentNextAttackRef.current += stunDuration * 1000
      setOpponentStunDuration(stunDuration)
    } else if (effect.type === 'silence') {
      const silenceDuration = effect.value > 0 ? effect.value : 2.5
      setOpponentSilenceDuration(silenceDuration)
    }

    // 지속 효과 활성화
    const durationBasedEffects = ['guaranteed_crit', 'immunity', 'silence']
    const effectDuration = durationBasedEffects.includes(effect.type)
      ? effect.value
      : card.duration

    // 쿨타임 초기화 패시브 체크
    const cooldownResetChance = getPassiveBonus(playerSkillsRef.current, 'cooldown_reset')
    const isCooldownReset = cooldownResetChance > 0 && Math.random() * 100 < cooldownResetChance
    const finalCooldown = isCooldownReset ? 0 : card.cooldown

    if (isCooldownReset) {
      showSkillNotification('player', '⏰ 쿨타임 초기화!', '⏰')
    }

    // 스킬 상태 업데이트 (순수 함수)
    setPlayerSkills(prev => {
      const newSkills = [...prev]
      newSkills[skillIndex] = {
        ...prev[skillIndex],
        isActive: effectDuration > 0,
        durationRemaining: effectDuration,
        cooldownRemaining: finalCooldown,
      }
      return newSkills
    })
  }, [playerMaxHp, opponentMaxHp, safePlayerStats.defense, addFloatingDamage, showSkillNotification, getPassiveBonus])

  // AI 스킬 사용 로직 (지능적)
  const aiUseSkill = useCallback((currentElapsedTime: number) => {
    // 스턴 또는 침묵 상태에서는 스킬 사용 불가
    if (opponentStunRef.current > 0) return
    if (opponentSilenceRef.current > 0) return

    const opponentHpRatio = opponentHpRef.current / opponentMaxHp
    const playerHpRatio = playerHpRef.current / playerMaxHp
    const battleProgress = currentElapsedTime / PVP_BATTLE_CONFIG.BATTLE_DURATION // 0~1

    // 현재 스킬 상태에서 사용 가능한 스킬 찾기 (ref 사용)
    const currentSkills = opponentSkillsRef.current
    const availableSkills = currentSkills
      .map((s, i) => ({ skill: s, index: i }))
      .filter(({ skill }) =>
        skill.card.activationType === 'active' &&
        skill.cooldownRemaining <= 0 &&
        !skill.isActive
      )

    if (availableSkills.length === 0) return

    // 스킬 우선순위 결정 (상황에 따라)
    let selectedSkill: { skill: SkillState; index: number } | null = null

    for (const { skill, index } of availableSkills) {
      const effectType = skill.card.effect.type

      // HP 회복: 체력이 낮을 때 긴급 사용 (15-35% 범위), 회복 피로 시 사용 불가
      if (effectType === 'hp_recovery') {
        if (opponentHpRatio < 0.35 && opponentHpRatio > 0.15 && opponentHealFatigueRef.current <= 0) {
          selectedSkill = { skill, index }
          break
        }
      }
      // 무적: 체력 40% 이하일 때 긴급 사용
      else if (effectType === 'immunity') {
        if (opponentHpRatio < 0.4) {
          selectedSkill = { skill, index }
          break
        }
      }
      // 스턴: 상대 체력이 높을 때 또는 초반에 사용
      else if (effectType === 'stun') {
        if (playerHpRatio > 0.5 || battleProgress < 0.4) {
          selectedSkill = { skill, index }
          break
        }
      }
      // 침묵: 중반~후반에 상대 스킬 차단용으로 사용
      else if (effectType === 'silence') {
        if (battleProgress > 0.3 && battleProgress < 0.8) {
          selectedSkill = { skill, index }
          break
        }
      }
      // 확정 치명타: 상대 체력이 낮을 때 마무리용
      else if (effectType === 'guaranteed_crit') {
        if (playerHpRatio < 0.5) {
          selectedSkill = { skill, index }
          break
        }
      }
      // 광폭화/폭풍 연타: 공격속도 증가, 공격적으로 사용
      else if (effectType === 'speed_boost' || effectType === 'double_attack') {
        // 상대 HP가 낮거나 중반 이전에 사용
        if (playerHpRatio < 0.6 || battleProgress < 0.5) {
          selectedSkill = { skill, index }
          break
        }
      }
      // 번개 일섬: HP 비례 데미지, 항상 유용
      else if (effectType === 'first_strike') {
        selectedSkill = { skill, index }
      }
      // 방패 강타: 방어력이 높을 때 더 효과적, 항상 사용 가능
      else if (effectType === 'shield_bash') {
        selectedSkill = { skill, index }
      }
    }

    // 선택된 스킬이 없으면 아무 스킬이나 사용 (50% 확률)
    if (!selectedSkill && Math.random() < 0.5) {
      selectedSkill = availableSkills[0]
    }

    if (!selectedSkill) return

    const { skill, index } = selectedSkill
    const card = skill.card
    const effect = card.effect

    // 스킬 사용 알림 표시
    showSkillNotification('opponent', card.name, card.emoji)

    // 즉시 효과 처리 (setState 콜백 바깥에서 실행)
    if (effect.type === 'hp_recovery') {
      const antiHealReduction = getPassiveBonus(playerSkillsRef.current, 'anti_heal')
      const healMultiplier = Math.max(0, 1 - antiHealReduction / 100)
      const baseHealAmount = Math.floor(opponentHpRef.current * effect.value / 100)
      const healAmount = Math.floor(baseHealAmount * healMultiplier)
      const newOpponentHp = Math.min(opponentMaxHp, opponentHpRef.current + healAmount)
      opponentHpRef.current = newOpponentHp
      setOpponentHp(newOpponentHp)
      addFloatingDamage('opponent', healAmount, false, true)
      setOpponentHealFatigue(10)
    } else if (effect.type === 'first_strike') {
      const bonusDamage = Math.floor(playerMaxHp * effect.value / 100)
      const newPlayerHp = Math.max(0, playerHpRef.current - bonusDamage)
      playerHpRef.current = newPlayerHp
      setPlayerHp(newPlayerHp)
      addFloatingDamage('player', bonusDamage, false, false)
    } else if (effect.type === 'shield_bash') {
      const defense = safeOpponentStats.defense * (1 + getPassiveBonus(opponentSkillsRef.current, 'defense_boost') / 100)
      const bonusDamage = Math.floor(defense * effect.value / 100)
      const newPlayerHp = Math.max(0, playerHpRef.current - bonusDamage)
      playerHpRef.current = newPlayerHp
      setPlayerHp(newPlayerHp)
      addFloatingDamage('player', bonusDamage, false, false)
    } else if (effect.type === 'stun') {
      const stunDuration = card.duration > 0 ? card.duration : 2
      playerNextAttackRef.current += stunDuration * 1000
      setPlayerStunDuration(stunDuration)
    } else if (effect.type === 'silence') {
      const silenceDuration = effect.value > 0 ? effect.value : 2.5
      setPlayerSilenceDuration(silenceDuration)
    }

    // 지속 효과 활성화
    const durationBasedEffects = ['guaranteed_crit', 'immunity', 'silence']
    const effectDuration = durationBasedEffects.includes(effect.type)
      ? effect.value
      : card.duration

    // 쿨타임 초기화 패시브 체크
    const cooldownResetChance = getPassiveBonus(opponentSkillsRef.current, 'cooldown_reset')
    const isCooldownReset = cooldownResetChance > 0 && Math.random() * 100 < cooldownResetChance
    const finalCooldown = isCooldownReset ? 0 : card.cooldown

    if (isCooldownReset) {
      showSkillNotification('opponent', '⏰ 쿨타임 초기화!', '⏰')
    }

    // 스킬 상태 업데이트 (순수 함수)
    setOpponentSkills(prev => {
      const newSkills = [...prev]
      newSkills[index] = {
        ...prev[index],
        isActive: effectDuration > 0,
        durationRemaining: effectDuration,
        cooldownRemaining: finalCooldown,
      }
      return newSkills
    })
  }, [opponentMaxHp, playerMaxHp, safeOpponentStats.defense, addFloatingDamage, showSkillNotification, getPassiveBonus])

  // 스탯 ref (effect 재시작 방지용) - 안전한 스탯 사용
  const playerStatsRef = useRef(safePlayerStats)
  const opponentStatsRef = useRef(safeOpponentStats)

  useEffect(() => {
    playerStatsRef.current = safePlayerStats
  }, [safePlayerStats])

  useEffect(() => {
    opponentStatsRef.current = safeOpponentStats
  }, [safeOpponentStats])

  // 메인 게임 루프
  useEffect(() => {
    if (!isRunning || battleEnded) return

    // effect 시작 시 시간 리셋
    lastUpdateRef.current = Date.now()

    const gameLoop = setInterval(() => {
      const now = Date.now()
      const deltaMs = Math.min(100, now - lastUpdateRef.current) // 최대 100ms로 제한
      const deltaSec = deltaMs / 1000
      lastUpdateRef.current = now

      // 경과 시간 업데이트
      elapsedTimeRef.current += deltaMs
      setElapsedTime(prev => {
        const newTime = prev + deltaMs
        if (newTime >= PVP_BATTLE_CONFIG.BATTLE_DURATION) {
          setIsRunning(false)
        }
        return newTime
      })

      // 스킬 쿨다운/지속시간 업데이트
      setPlayerSkills(prev => prev.map(skill => ({
        ...skill,
        cooldownRemaining: Math.max(0, skill.cooldownRemaining - deltaSec),
        durationRemaining: Math.max(0, skill.durationRemaining - deltaSec),
        isActive: skill.durationRemaining - deltaSec > 0 ? skill.isActive : false,
      })))

      setOpponentSkills(prev => prev.map(skill => ({
        ...skill,
        cooldownRemaining: Math.max(0, skill.cooldownRemaining - deltaSec),
        durationRemaining: Math.max(0, skill.durationRemaining - deltaSec),
        isActive: skill.durationRemaining - deltaSec > 0 ? skill.isActive : false,
      })))

      // 스턴 지속시간 감소
      setPlayerStunDuration(prev => Math.max(0, prev - deltaSec))
      setOpponentStunDuration(prev => Math.max(0, prev - deltaSec))

      // 침묵 지속시간 감소
      setPlayerSilenceDuration(prev => Math.max(0, prev - deltaSec))
      setOpponentSilenceDuration(prev => Math.max(0, prev - deltaSec))

      // 회복 피로 지속시간 감소
      setPlayerHealFatigue(prev => Math.max(0, prev - deltaSec))
      setOpponentHealFatigue(prev => Math.max(0, prev - deltaSec))

      // ref에서 현재 상태 가져오기
      const currentPlayerSkills = playerSkillsRef.current
      const currentOpponentSkills = opponentSkillsRef.current
      const currentPlayerStats = playerStatsRef.current
      const currentOpponentStats = opponentStatsRef.current

      // 플레이어 공격
      playerNextAttackRef.current -= deltaMs
      if (playerNextAttackRef.current <= 0) {
        const safeAttackSpeed = Math.max(1, currentPlayerStats.attackSpeed || 100)
        const interval = 2000 / (safeAttackSpeed / 100)
        const speedBoost = getPassiveBonus(currentPlayerSkills, 'speed_boost')
        const activeSpeedBoost = getActiveEffectValue(currentPlayerSkills, 'speed_boost')
        // 폭풍 연타: 공격속도 대폭 증가 (value는 공격속도 증가량)
        const stormStrikeSpeedBoost = getActiveEffectValue(currentPlayerSkills, 'double_attack')
        // 광전사: HP 50% 이하일 때 체력에 비례해서 공격속도 증가
        // 50% HP = 0% 보너스, 0% HP = effect.value% 보너스 (선형 스케일링)
        const playerHpRatio = playerHpRef.current / playerMaxHp
        const berserkerBaseValue = getPassiveBonus(currentPlayerSkills, 'berserker')
        let berserkerBonus = 0
        if (playerHpRatio <= 0.5 && berserkerBaseValue > 0) {
          berserkerBonus = Math.floor((0.5 - playerHpRatio) / 0.5 * berserkerBaseValue)
        }
        const adjustedInterval = interval / (1 + (speedBoost + activeSpeedBoost + stormStrikeSpeedBoost + berserkerBonus) / 100)
        playerNextAttackRef.current = Math.max(300, adjustedInterval)  // 폭풍 연타를 위해 최소 간격 500ms → 300ms로 축소

        // 데미지 계산 (처형 효과를 위해 상대 HP 비율 전달)
        const opponentHpRatio = opponentHpRef.current / opponentMaxHp
        const { damage, isCrit } = calculateDamage(currentPlayerStats, currentOpponentStats, currentPlayerSkills, currentOpponentSkills, opponentHpRatio)

        // 회피 체크 (상대의 evasion 스탯 기준, 최대 40%)
        const opponentEvasion = Math.min(40, currentOpponentStats.evasion || 0)
        const isEvaded = Math.random() * 100 < opponentEvasion

        if (isEvaded) {
          // 회피 성공 - MISS 표시
          addFloatingDamage('opponent', 0, false, false, true)
        } else {
          // 회피 실패 - 데미지 적용
          if (damage > 0) addFloatingDamage('opponent', damage, isCrit)

          setOpponentHp(prev => {
            const newHp = Math.max(0, prev - damage)

            // 영혼 흡수: 치명타 시에만 발동
            const lifesteal = getPassiveBonus(currentPlayerSkills, 'lifesteal')
            if (lifesteal > 0 && damage > 0 && isCrit) {
              const healAmount = Math.floor(damage * lifesteal / 100)
              setPlayerHp(hp => Math.min(playerMaxHp, hp + healAmount))
              addFloatingDamage('player', healAmount, false, true)  // 흡혈 회복 표시
            }

            // 반사 (고정 데미지)
            const reflect = getPassiveBonus(currentOpponentSkills, 'damage_reflect')
            if (reflect > 0 && damage > 0) {
              setPlayerHp(hp => Math.max(0, hp - reflect))
              addFloatingDamage('player', reflect, false, false)  // 반사 피해 표시
            }

            return newHp
          })
        }
      }

      // 상대 공격
      opponentNextAttackRef.current -= deltaMs
      if (opponentNextAttackRef.current <= 0) {
        const safeAttackSpeed = Math.max(1, currentOpponentStats.attackSpeed || 100)
        const interval = 2000 / (safeAttackSpeed / 100)
        const speedBoost = getPassiveBonus(currentOpponentSkills, 'speed_boost')
        const activeSpeedBoost = getActiveEffectValue(currentOpponentSkills, 'speed_boost')
        // 폭풍 연타: 공격속도 대폭 증가 (value는 공격속도 증가량)
        const stormStrikeSpeedBoost = getActiveEffectValue(currentOpponentSkills, 'double_attack')
        // 광전사: HP 50% 이하일 때 체력에 비례해서 공격속도 증가
        // 50% HP = 0% 보너스, 0% HP = effect.value% 보너스 (선형 스케일링)
        const opponentHpRatio = opponentHpRef.current / opponentMaxHp
        const berserkerBaseValue = getPassiveBonus(currentOpponentSkills, 'berserker')
        let berserkerBonus = 0
        if (opponentHpRatio <= 0.5 && berserkerBaseValue > 0) {
          berserkerBonus = Math.floor((0.5 - opponentHpRatio) / 0.5 * berserkerBaseValue)
        }
        const adjustedInterval = interval / (1 + (speedBoost + activeSpeedBoost + stormStrikeSpeedBoost + berserkerBonus) / 100)
        opponentNextAttackRef.current = Math.max(300, adjustedInterval)  // 폭풍 연타를 위해 최소 간격 500ms → 300ms로 축소

        // 데미지 계산 (처형 효과를 위해 플레이어 HP 비율 전달)
        const playerHpRatio = playerHpRef.current / playerMaxHp
        const { damage, isCrit } = calculateDamage(currentOpponentStats, currentPlayerStats, currentOpponentSkills, currentPlayerSkills, playerHpRatio)

        // 회피 체크 (플레이어의 evasion 스탯 기준, 최대 40%)
        const playerEvasion = Math.min(40, currentPlayerStats.evasion || 0)
        const isEvaded = Math.random() * 100 < playerEvasion

        if (isEvaded) {
          // 회피 성공 - MISS 표시
          addFloatingDamage('player', 0, false, false, true)
        } else {
          // 회피 실패 - 데미지 적용
          if (damage > 0) addFloatingDamage('player', damage, isCrit)

          setPlayerHp(prev => {
            const newHp = Math.max(0, prev - damage)

            // 영혼 흡수: 치명타 시에만 발동
            const lifesteal = getPassiveBonus(currentOpponentSkills, 'lifesteal')
            if (lifesteal > 0 && damage > 0 && isCrit) {
              const healAmount = Math.floor(damage * lifesteal / 100)
              setOpponentHp(hp => Math.min(opponentMaxHp, hp + healAmount))
              addFloatingDamage('opponent', healAmount, false, true)  // 흡혈 회복 표시
            }

            // 반사 (고정 데미지)
            const reflect = getPassiveBonus(currentPlayerSkills, 'damage_reflect')
            if (reflect > 0 && damage > 0) {
              setOpponentHp(hp => Math.max(0, hp - reflect))
              addFloatingDamage('opponent', reflect, false, false)  // 반사 피해 표시
            }

            return newHp
          })
        }

        // AI 스킬 사용 (공격 시 70% 확률)
        if (opponentIsAI && Math.random() < 0.7) {
          aiUseSkill(elapsedTimeRef.current)
        }
      }

      // AI 주기적 스킬 체크 (2초마다)
      if (opponentIsAI) {
        aiSkillCheckRef.current -= deltaMs
        if (aiSkillCheckRef.current <= 0) {
          aiSkillCheckRef.current = 2000 // 2초 간격
          aiUseSkill(elapsedTimeRef.current)
        }
      }
    }, 50) // 20fps

    return () => clearInterval(gameLoop)
  }, [isRunning, battleEnded, getPassiveBonus, hasActiveEffect, getActiveEffectValue,
      addFloatingDamage, calculateDamage, aiUseSkill, playerMaxHp, opponentMaxHp, opponentIsAI])

  // 배틀 종료 체크
  useEffect(() => {
    if (battleEnded) return

    const playerDead = playerHp <= 0
    const opponentDead = opponentHp <= 0
    const timeUp = elapsedTime >= PVP_BATTLE_CONFIG.BATTLE_DURATION

    if (playerDead || opponentDead || timeUp) {
      setBattleEnded(true)
      setIsRunning(false)
      // 결과 화면에서 버튼 클릭으로 넘어가도록 변경
      // onBattleEnd는 결과 화면의 버튼에서 호출됨
    }
  }, [playerHp, opponentHp, elapsedTime, battleEnded, playerMaxHp, opponentMaxHp, onBattleEnd])

  // 시간 표시
  const timeRemaining = Math.max(0, (PVP_BATTLE_CONFIG.BATTLE_DURATION - elapsedTime) / 1000)

  // HP 비율 계산
  const playerHpRatio = playerHp / playerMaxHp
  const opponentHpRatio = opponentHp / opponentMaxHp
  const timeProgress = elapsedTime / PVP_BATTLE_CONFIG.BATTLE_DURATION

  return (
    <>
      {/* 고정 오버레이들 - transform 컨테이너 밖에 배치 */}
      {/* 낮은 HP 경고 오버레이 */}
      {isLowHp && (
        <div className="fixed inset-0 pointer-events-none z-40 animate-pulse"
          style={{
            background: 'radial-gradient(circle, transparent 40%, rgba(220, 38, 38, 0.3) 100%)'
          }}
        />
      )}

      {/* 스킬 사용 알림 (고정 오버레이) */}
      {skillNotification && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div
            className={`py-2 px-6 rounded-full shadow-lg ${
              skillNotification.user === 'opponent'
                ? 'bg-red-600 border-2 border-red-400'
                : 'bg-blue-600 border-2 border-blue-400'
            }`}
            style={{
              animation: 'skillPopup 1.5s ease-out forwards',
            }}
          >
            <span className="text-xl mr-2">{skillNotification.emoji}</span>
            <span className="text-white font-bold">{skillNotification.skillName}</span>
            <span className="text-white/80 text-sm ml-2">
              ({skillNotification.user === 'opponent' ? opponentName : '나'})
            </span>
          </div>
        </div>
      )}

      {/* 메인 배틀 컨테이너 - 흔들림 효과 적용 */}
      <div className={`space-y-3 transition-transform duration-75 ${
        screenShake ? 'translate-x-1' : ''
      }`}>

      {/* 타이머 + 진행 바 */}
      <div className={`rounded-lg p-2 border transition-colors ${
        timeRemaining < 5
          ? 'bg-red-900/50 border-red-500'
          : 'bg-gray-800/80 border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium flex items-center gap-1 ${
            timeRemaining < 5 ? 'text-red-300' : 'text-gray-400'
          }`}>
            <GiStopwatch /> 남은 시간
          </span>
          <span className={`text-xl font-bold ${
            timeRemaining < 5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'
          }`}>
            {timeRemaining.toFixed(1)}s
          </span>
        </div>
        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              timeRemaining < 5
                ? 'bg-gradient-to-r from-red-600 to-red-400'
                : 'bg-gradient-to-r from-yellow-500 to-amber-400'
            }`}
            style={{ width: `${(1 - timeProgress) * 100}%` }}
          />
        </div>
      </div>

      {/* 배틀 영역 */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-4 space-y-4 border border-gray-700 shadow-lg">

        {/* 상대 정보 */}
        <div className="space-y-1 bg-red-950/30 rounded-lg p-2 border border-red-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {opponentAvatarUrl ? (
                <img src={opponentAvatarUrl} alt={opponentName} className="w-6 h-6 rounded-full object-cover border border-red-400" />
              ) : (
                <FaUser className="text-red-400" />
              )}
              <span className="text-red-400 font-bold text-lg">{opponentName}</span>
              {opponentStunDuration > 0 && (
                <span className="text-sm bg-purple-600 px-2 py-0.5 rounded-full animate-pulse">
                  💫 {opponentStunDuration.toFixed(1)}s
                </span>
              )}
              {opponentSilenceDuration > 0 && (
                <span className="text-sm bg-yellow-600 px-2 py-0.5 rounded-full animate-pulse">
                  🤐 {opponentSilenceDuration.toFixed(1)}s
                </span>
              )}
            </div>
            {/* 상대 버프/디버프 아이콘 */}
            <div className="flex items-center gap-1">
              {opponentSkills.filter(s => s.card.activationType === 'passive').map(s => (
                <div key={s.card.id} className="relative group">
                  <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded cursor-help">
                    {s.card.emoji}
                  </span>
                  {/* 툴팁 */}
                  <div className="absolute bottom-full right-0 mb-1 w-36 p-1.5 bg-gray-900 border border-gray-600 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <p className="text-[10px] font-bold text-white">{s.card.name}</p>
                    <p className="text-[10px] text-gray-400">{s.card.description}</p>
                  </div>
                </div>
              ))}
              {opponentSkills.filter(s => s.isActive).map(s => (
                <div key={s.card.id} className="relative group">
                  <span className="text-xs bg-yellow-600 px-1.5 py-0.5 rounded animate-pulse cursor-help">
                    {s.card.emoji}
                  </span>
                  {/* 툴팁 */}
                  <div className="absolute bottom-full right-0 mb-1 w-36 p-1.5 bg-gray-900 border border-yellow-500 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <p className="text-[10px] font-bold text-yellow-400">{s.card.name}</p>
                    <p className="text-[10px] text-gray-300">{s.card.description}</p>
                    <p className="text-[10px] text-yellow-500 mt-0.5">남은: {s.durationRemaining.toFixed(1)}초</p>
                  </div>
                </div>
              ))}
              <span className={`text-sm font-medium ${opponentHpRatio < 0.3 ? 'text-red-400' : 'text-gray-300'}`}>
                {Math.floor(opponentHpRatio * 100)}%
              </span>
            </div>
          </div>
          {/* 상대 HP 바 (전체 너비) */}
          <div className="relative h-5 bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                opponentHpRatio < 0.3
                  ? 'bg-gradient-to-r from-red-600 to-red-500'
                  : 'bg-gradient-to-r from-red-500 to-red-400'
              }`}
              style={{ width: `${Math.max(0, opponentHpRatio * 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow-lg">
                {Math.floor(opponentHp)} / {opponentMaxHp}
              </span>
            </div>
          </div>
          {/* 상대 플로팅 데미지 */}
          <div className="relative h-6">
            {floatingDamages.filter(d => d.target === 'opponent').map(d => (
              <div
                key={d.id}
                className={`absolute left-1/2 -translate-x-1/2 animate-float-up font-bold text-lg ${
                  d.isMiss ? 'text-cyan-400 italic' :
                  d.isHeal ? 'text-green-400' : d.isCrit ? 'text-orange-400 text-xl' : 'text-white'
                }`}
              >
                {d.isMiss ? '💨 MISS' : d.isHeal ? `+${d.damage}` : `-${d.damage}`}{d.isCrit && !d.isMiss && ' 💥'}
              </div>
            ))}
          </div>
        </div>

        {/* 공격 애니메이션 영역 */}
        <div className="relative h-12 flex items-center justify-center">
          {/* 구분선 */}
          <div className="absolute inset-x-0 top-1/2 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-600" />
            <GiCrossedSwords className="text-2xl text-gray-500" />
            <div className="flex-1 h-px bg-gray-600" />
          </div>

          {/* 플레이어 공격 이펙트 */}
          {attackAnimation.attacker === 'player' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`transform -translate-y-2 ${
                attackAnimation.isCrit ? 'scale-150' : 'scale-100'
              }`}>
                <span className={`text-4xl animate-ping ${
                  attackAnimation.isCrit ? 'text-orange-400' : 'text-cyan-400'
                }`}>
                  {attackAnimation.isCrit ? '💥' : '⚔️'}
                </span>
              </div>
              {/* 공격 방향 화살표 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 text-cyan-400 animate-bounce">
                ▲
              </div>
            </div>
          )}

          {/* 상대 공격 이펙트 */}
          {attackAnimation.attacker === 'opponent' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`transform translate-y-2 ${
                attackAnimation.isCrit ? 'scale-150' : 'scale-100'
              }`}>
                <span className={`text-4xl animate-ping ${
                  attackAnimation.isCrit ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {attackAnimation.isCrit ? '💥' : '🗡️'}
                </span>
              </div>
              {/* 공격 방향 화살표 */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-red-400 animate-bounce">
                ▼
              </div>
            </div>
          )}
        </div>

        {/* 플레이어 정보 */}
        <div className="space-y-1 bg-cyan-950/30 rounded-lg p-2 border border-cyan-900/50">
          {/* 플레이어 플로팅 데미지 */}
          <div className="relative h-6">
            {floatingDamages.filter(d => d.target === 'player').map(d => (
              <div
                key={d.id}
                className={`absolute left-1/2 -translate-x-1/2 animate-float-up font-bold text-lg ${
                  d.isMiss ? 'text-cyan-400 italic' :
                  d.isHeal ? 'text-green-400' : d.isCrit ? 'text-orange-400 text-xl' : 'text-white'
                }`}
              >
                {d.isMiss ? '💨 MISS' : d.isHeal ? `+${d.damage}` : `-${d.damage}`}{d.isCrit && !d.isMiss && ' 💥'}
              </div>
            ))}
          </div>
          {/* 플레이어 HP 바 (전체 너비) */}
          <div className="relative h-5 bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                playerHpRatio < 0.3
                  ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 to-green-400'
              }`}
              style={{ width: `${Math.max(0, playerHpRatio * 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow-lg">
                {Math.floor(playerHp)} / {playerMaxHp}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {playerAvatarUrl ? (
                <img src={playerAvatarUrl} alt={playerName} className="w-6 h-6 rounded-full object-cover border border-cyan-400" />
              ) : (
                <FaUser className="text-cyan-400" />
              )}
              <span className="text-cyan-400 font-bold text-lg">{playerName}</span>
              {playerStunDuration > 0 && (
                <span className="text-sm bg-purple-600 px-2 py-0.5 rounded-full animate-pulse">
                  💫 {playerStunDuration.toFixed(1)}s
                </span>
              )}
              {playerSilenceDuration > 0 && (
                <span className="text-sm bg-yellow-600 px-2 py-0.5 rounded-full animate-pulse">
                  🤐 {playerSilenceDuration.toFixed(1)}s
                </span>
              )}
            </div>
            {/* 플레이어 버프/디버프 아이콘 */}
            <div className="flex items-center gap-1">
              {playerSkills.filter(s => s.card.activationType === 'passive').map(s => (
                <div key={s.card.id} className="relative group">
                  <span className="text-xs bg-blue-700 px-1.5 py-0.5 rounded cursor-help">
                    {s.card.emoji}
                  </span>
                  {/* 툴팁 */}
                  <div className="absolute top-full right-0 mt-1 w-36 p-1.5 bg-gray-900 border border-blue-500 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <p className="text-[10px] font-bold text-blue-400">{s.card.name}</p>
                    <p className="text-[10px] text-gray-400">{s.card.description}</p>
                  </div>
                </div>
              ))}
              {playerSkills.filter(s => s.isActive).map(s => (
                <div key={s.card.id} className="relative group">
                  <span className="text-xs bg-yellow-600 px-1.5 py-0.5 rounded animate-pulse cursor-help">
                    {s.card.emoji}
                  </span>
                  {/* 툴팁 */}
                  <div className="absolute top-full right-0 mt-1 w-36 p-1.5 bg-gray-900 border border-yellow-500 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <p className="text-[10px] font-bold text-yellow-400">{s.card.name}</p>
                    <p className="text-[10px] text-gray-300">{s.card.description}</p>
                    <p className="text-[10px] text-yellow-500 mt-0.5">남은: {s.durationRemaining.toFixed(1)}초</p>
                  </div>
                </div>
              ))}
              <span className={`text-sm font-medium ${playerHpRatio < 0.3 ? 'text-red-400' : 'text-gray-300'}`}>
                {Math.floor(playerHpRatio * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 스턴 상태 표시 */}
      {playerStunDuration > 0 && (
        <div className="bg-purple-900/80 border-2 border-purple-500 rounded-lg p-2 text-center animate-pulse">
          <span className="text-2xl">💫</span>
          <span className="text-purple-300 font-bold ml-2">
            기절! ({playerStunDuration.toFixed(1)}s)
          </span>
        </div>
      )}

      {/* 침묵 상태 표시 */}
      {playerSilenceDuration > 0 && playerStunDuration <= 0 && (
        <div className="bg-yellow-900/80 border-2 border-yellow-500 rounded-lg p-2 text-center animate-pulse">
          <span className="text-2xl">🤐</span>
          <span className="text-yellow-300 font-bold ml-2">
            침묵! 스킬 사용 불가 ({playerSilenceDuration.toFixed(1)}s)
          </span>
        </div>
      )}

      {/* 스킬 버튼들 */}
      <div className="grid grid-cols-3 gap-2">
        {playerSkills.map((skill, index) => {
          const isActive = skill.card.activationType === 'active'
          const onCooldown = skill.cooldownRemaining > 0
          const isBuffActive = skill.isActive
          const isStunned = playerStunDuration > 0
          const isSilenced = playerSilenceDuration > 0
          const isHealFatigued = skill.card.effect.type === 'hp_recovery' && playerHealFatigue > 0
          const cooldownProgress = onCooldown
            ? (skill.card.cooldown - skill.cooldownRemaining) / skill.card.cooldown
            : 1
          const isReady = isActive && !onCooldown && !isStunned && !isSilenced && !isHealFatigued && !battleEnded

          return (
            <button
              key={skill.card.id}
              onClick={() => isReady && useSkill(index)}
              disabled={!isReady}
              className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                isStunned
                  ? 'bg-purple-900/50 border-purple-600 cursor-not-allowed'
                  : isSilenced && isActive
                    ? 'bg-yellow-900/50 border-yellow-600 cursor-not-allowed'
                    : !isActive
                      ? 'bg-gray-700/50 border-gray-600 cursor-default'
                      : onCooldown
                        ? 'bg-gray-800 border-gray-600 cursor-not-allowed'
                        : isBuffActive
                          ? 'bg-yellow-900/50 border-yellow-400 animate-pulse'
                          : 'bg-gradient-to-b from-gray-700 to-gray-800 border-yellow-500 hover:border-yellow-400 hover:scale-105 cursor-pointer shadow-lg shadow-yellow-500/20'
              }`}
            >
              {/* 쿨다운 프로그레스 바 (하단) */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700">
                  <div
                    className={`h-full transition-all duration-200 ${
                      onCooldown ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${cooldownProgress * 100}%` }}
                  />
                </div>
              )}

              {/* 스턴 오버레이 */}
              {isStunned && isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-purple-900/80 z-10">
                  <span className="text-3xl">💫</span>
                </div>
              )}

              {/* 침묵 오버레이 */}
              {!isStunned && isSilenced && isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-yellow-900/80 z-10">
                  <div className="text-center">
                    <span className="text-2xl">🤐</span>
                    <p className="text-[10px] text-yellow-300">{playerSilenceDuration.toFixed(1)}s</p>
                  </div>
                </div>
              )}

              {/* 회복 피로 오버레이 */}
              {!isStunned && !isSilenced && isHealFatigued && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-900/80 z-10">
                  <div className="text-center">
                    <span className="text-2xl">💚</span>
                    <p className="text-[10px] text-green-300">{playerHealFatigue.toFixed(1)}s</p>
                  </div>
                </div>
              )}

              {/* 쿨다운 오버레이 */}
              {!isStunned && !isSilenced && !isHealFatigued && onCooldown && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">
                      {Math.ceil(skill.cooldownRemaining)}
                    </span>
                    <p className="text-[10px] text-gray-300">초</p>
                  </div>
                </div>
              )}

              {/* 스킬 정보 */}
              <div className="text-center p-2 pb-3">
                <span className="text-3xl drop-shadow-lg">{skill.card.emoji}</span>
                <p className="text-xs font-bold mt-1 truncate text-white">{skill.card.name}</p>
                <p className={`text-[10px] mt-0.5 ${
                  isReady ? 'text-yellow-400 font-bold' : 'text-gray-400'
                }`}>
                  {!isActive ? '패시브' : isReady ? 'READY!' : `CD ${skill.card.cooldown}s`}
                </p>
              </div>

              {/* 활성화 표시 (버프 지속 중) */}
              {isBuffActive && (
                <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {skill.durationRemaining.toFixed(1)}s
                </div>
              )}

              {/* 사용 가능 표시 */}
              {isReady && (
                <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
              )}
            </button>
          )
        })}

        {/* 빈 슬롯 */}
        {[...Array(Math.max(0, 3 - playerSkills.length))].map((_, i) => (
          <div
            key={`empty-${i}`}
            className="p-2 pb-3 rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/30"
          >
            <div className="text-center text-gray-500">
              <GiCardRandom className="text-3xl opacity-30 mx-auto" />
              <p className="text-xs mt-1">빈 슬롯</p>
            </div>
          </div>
        ))}
      </div>

      {/* 스킬 설명 */}
      <div className="text-center text-gray-500 text-xs">
        액티브 스킬을 클릭하여 사용하세요!
      </div>

      {/* 배틀 종료 표시 */}
      {battleEnded && (() => {
        // HP 비율로 승패 판정 (실제 로직과 동일)
        const finalPlayerRatio = playerHp / playerMaxHp
        const finalOpponentRatio = opponentHp / opponentMaxHp
        const playerDead = playerHp <= 0
        const opponentDead = opponentHp <= 0

        // 승패 판정
        const isWin = opponentDead || (!playerDead && finalPlayerRatio > finalOpponentRatio)
        const isLose = playerDead || (!opponentDead && finalOpponentRatio > finalPlayerRatio)

        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            {/* 배경 효과 */}
            <div className={`absolute inset-0 ${
              isWin ? 'bg-gradient-to-b from-yellow-900/30 via-transparent to-transparent' :
              isLose ? 'bg-gradient-to-b from-red-900/30 via-transparent to-transparent' :
              'bg-gradient-to-b from-gray-700/30 via-transparent to-transparent'
            }`} />

            {/* 빛나는 원형 효과 (승리 시) */}
            {isWin && (
              <>
                <div className="absolute w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute w-48 h-48 bg-orange-400/20 rounded-full blur-2xl animate-ping" style={{ animationDuration: '2s' }} />
              </>
            )}

            {/* 결과 카드 */}
            <div className={`relative w-80 mx-4 rounded-2xl overflow-hidden shadow-2xl animate-bounce-in ${
              isWin ? 'border-2 border-yellow-500' :
              isLose ? 'border-2 border-red-500' :
              'border-2 border-gray-500'
            }`}>
              {/* 헤더 - 결과 타이틀 */}
              <div className={`py-6 text-center ${
                isWin ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600' :
                isLose ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700' :
                'bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600'
              }`}>
                {/* 결과 이모지 */}
                <div className="text-5xl mb-2 flex justify-center">
                  {isWin ? <GiTrophy className="text-yellow-300" /> : isLose ? <FaSkull className="text-red-300" /> : <FaHandshake className="text-gray-300" />}
                </div>
                {/* 결과 텍스트 */}
                <h2 className={`text-3xl font-black tracking-wider ${
                  isWin ? 'text-yellow-100 drop-shadow-lg' :
                  isLose ? 'text-red-100 drop-shadow-lg' :
                  'text-gray-100 drop-shadow-lg'
                }`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  {isWin ? 'VICTORY!' : isLose ? 'DEFEAT' : 'DRAW'}
                </h2>
              </div>

              {/* 바디 - 결과 상세 */}
              <div className="bg-gray-900 p-4 space-y-4">
                {/* VS 비교 */}
                <div className="flex items-center justify-between gap-2">
                  {/* 플레이어 */}
                  <div className="flex-1 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center overflow-hidden ${
                      isWin ? 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-300' :
                      isLose ? 'bg-gradient-to-br from-gray-500 to-gray-600' :
                      'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                      {playerAvatarUrl ? (
                        <img src={playerAvatarUrl} alt={playerName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{isWin ? '😎' : isLose ? '😢' : '😐'}</span>
                      )}
                    </div>
                    <p className="text-xs text-cyan-400 font-medium mt-1 truncate">{playerName}</p>
                  </div>

                  {/* HP 비교 */}
                  <div className="flex-1">
                    <div className="text-center mb-2">
                      <span className={`text-2xl font-black ${
                        finalPlayerRatio > finalOpponentRatio ? 'text-green-400' :
                        finalPlayerRatio < finalOpponentRatio ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {Math.floor(finalPlayerRatio * 100)}%
                      </span>
                      <span className="text-gray-500 mx-2">vs</span>
                      <span className={`text-2xl font-black ${
                        finalOpponentRatio > finalPlayerRatio ? 'text-green-400' :
                        finalOpponentRatio < finalPlayerRatio ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {Math.floor(finalOpponentRatio * 100)}%
                      </span>
                    </div>
                    {/* HP 바 비교 */}
                    <div className="flex gap-1 items-center">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                          style={{ width: `${finalPlayerRatio * 100}%` }}
                        />
                      </div>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                          style={{ width: `${finalOpponentRatio * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 상대 */}
                  <div className="flex-1 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center overflow-hidden ${
                      isLose ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                      isWin ? 'bg-gradient-to-br from-gray-500 to-gray-600' :
                      'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                      {opponentAvatarUrl ? (
                        <img src={opponentAvatarUrl} alt={opponentName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{isLose ? '😎' : isWin ? '😢' : '😐'}</span>
                      )}
                    </div>
                    <p className="text-xs text-red-400 font-medium mt-1 truncate">{opponentName}</p>
                  </div>
                </div>

                {/* 구분선 */}
                <div className="border-t border-gray-700" />

                {/* 배틀 통계 */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-xs">배틀 시간</p>
                    <p className="text-white font-bold">
                      {(elapsedTime / 1000).toFixed(1)}초
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-xs">남은 HP</p>
                    <p className={`font-bold ${
                      isWin ? 'text-green-400' : isLose ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {Math.floor(playerHp)} / {playerMaxHp}
                    </p>
                  </div>
                </div>

                {/* 보상 표시 */}
                <div className={`rounded-lg p-3 text-center ${
                  isWin ? 'bg-yellow-900/30 border border-yellow-500/50' :
                  isLose ? 'bg-gray-800/50 border border-gray-600/50' :
                  'bg-gray-800/50 border border-gray-500/50'
                }`}>
                  <p className="text-xs text-gray-400 mb-1">획득 보상</p>
                  <div className="flex items-center justify-center gap-2">
                    <GiTwoCoins className="text-2xl text-yellow-400" />
                    <span className={`text-2xl font-black ${
                      isWin ? 'text-yellow-400' : isLose ? 'text-gray-400' : 'text-gray-300'
                    }`}>
                      +{isWin ? winReward : isLose ? loseReward : drawReward}
                    </span>
                    <span className="text-yellow-400 text-sm">Gold</span>
                  </div>
                  {opponentIsAI && (
                    <p className="text-xs text-yellow-500/70 mt-1">AI 대전 (보상 50%)</p>
                  )}
                </div>

                {/* 승패 결정 방식 */}
                <div className="text-center">
                  <span className="text-xs text-gray-500">
                    {playerDead || opponentDead ? (
                      playerDead && opponentDead ? '동시 처치' :
                      opponentDead ? '상대 처치 승리' : '처치 당함'
                    ) : (
                      '시간 종료 - HP 판정'
                    )}
                  </span>
                </div>

                {/* 확인 버튼 */}
                <button
                  onClick={() => {
                    if (resultConfirmed) return  // 중복 클릭 방지
                    setResultConfirmed(true)

                    const winner = isWin ? 'player' : isLose ? 'opponent' : 'draw'
                    onBattleEnd({
                      winner,
                      playerFinalHp: playerHp,
                      opponentFinalHp: opponentHp,
                      battleDuration: elapsedTime,
                    })
                  }}
                  disabled={resultConfirmed}
                  className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                    resultConfirmed
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : isWin
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black'
                        : isLose
                          ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white'
                          : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white'
                  }`}
                >
                  {resultConfirmed ? '처리 중...' : '확인'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      </div>
    </>
  )
}
