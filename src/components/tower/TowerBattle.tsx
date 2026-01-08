/**
 * 수련의 숲 실시간 배틀 컴포넌트
 *
 * PvP 스킬 시스템을 사용하며, 승리 시 자연스럽게 다음 층으로 전환됩니다.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { CharacterStats } from '../../types/stats'
import { getEffectiveCritDamage, getDamageMultiplier } from '../../types/stats'
import type { BattleCard } from '../../types/battleCard'
import { REFLECT_PERCENT_BY_TIER } from '../../types/battleCard'
import type { TowerEnemy } from '../../types/tower'
import { TOWER_CONFIG } from '../../types/tower'
import { calculateAttackInterval, formatLargeNumber } from '../../utils/towerBattle'
import { GiStopwatch, GiSwordWound, GiCardRandom } from 'react-icons/gi'

// =============================================
// 타입 정의
// =============================================

interface BattleResult {
  timeRemaining: number
  playerDamageDealt: number
  enemyDamageDealt: number
  playerFinalHp: number
  enemyFinalHp: number
}

export interface SkillCooldownState {
  cooldownRemaining: number
  durationRemaining: number
  isActive: boolean
}

interface TowerBattleProps {
  playerName: string
  playerAvatarUrl?: string  // 플레이어 프로필 이미지
  playerStats: CharacterStats
  playerCards: BattleCard[]
  enemy: TowerEnemy
  onVictory: (result: BattleResult & { skillCooldowns: SkillCooldownState[], playerShield: number }) => void
  onDefeat: (result: BattleResult) => void
  // 층간 상태 유지를 위한 초기값
  initialPlayerHp?: number  // 이전 층에서의 남은 HP
  initialSkillCooldowns?: SkillCooldownState[]  // 이전 층에서의 스킬 쿨다운 상태
  initialPlayerShield?: number  // 이전 층에서의 보호막
}

interface SkillState {
  card: BattleCard
  cooldownRemaining: number
  durationRemaining: number
  isActive: boolean
}

interface FloatingDamage {
  id: number
  damage: number
  isCrit: boolean
  isHeal: boolean
  isMiss: boolean
  target: 'player' | 'enemy'
}

// =============================================
// 컴포넌트
// =============================================

export function TowerBattle({
  playerName,
  playerAvatarUrl,
  playerStats,
  playerCards,
  enemy,
  onVictory,
  onDefeat,
  initialPlayerHp,
  initialSkillCooldowns,
  initialPlayerShield,
}: TowerBattleProps) {
  const { TIME_LIMIT, PLAYER_HP_MULTIPLIER, DAMAGE_REDUCTION } = TOWER_CONFIG

  // 기본 스탯
  const DEFAULT_STATS: CharacterStats = {
    hp: 100, attack: 10, defense: 5, critRate: 5,
    critDamage: 150, attackSpeed: 100, penetration: 0, evasion: 0,
  }

  // 안전한 스탯 (useMemo로 안정화)
  const safePlayerStats = useMemo<CharacterStats>(() => ({
    hp: playerStats.hp || DEFAULT_STATS.hp,
    attack: playerStats.attack || DEFAULT_STATS.attack,
    defense: playerStats.defense || DEFAULT_STATS.defense,
    critRate: playerStats.critRate ?? DEFAULT_STATS.critRate,
    critDamage: playerStats.critDamage || DEFAULT_STATS.critDamage,
    attackSpeed: playerStats.attackSpeed || DEFAULT_STATS.attackSpeed,
    penetration: playerStats.penetration ?? DEFAULT_STATS.penetration,
    evasion: playerStats.evasion ?? DEFAULT_STATS.evasion,
  }), [playerStats.hp, playerStats.attack, playerStats.defense, playerStats.critRate,
      playerStats.critDamage, playerStats.attackSpeed, playerStats.penetration, playerStats.evasion])

  // HP 초기값
  const playerMaxHp = safePlayerStats.hp * PLAYER_HP_MULTIPLIER
  const enemyMaxHp = enemy.stats.hp

  // 상태 - 이전 층에서의 HP가 있으면 그것을 사용, 없으면 최대 HP
  const [playerHp, setPlayerHp] = useState(() =>
    initialPlayerHp !== undefined ? Math.min(initialPlayerHp, playerMaxHp) : playerMaxHp
  )
  const [enemyHp, setEnemyHp] = useState(enemyMaxHp)
  const [timeRemaining, setTimeRemaining] = useState<number>(TIME_LIMIT)
  const [battleEnded, setBattleEnded] = useState(false)

  // 보호막 상태 - 이전 층에서의 보호막이 있으면 그것을 사용
  const [playerShield, setPlayerShield] = useState(initialPlayerShield ?? 0)
  const playerShieldRef = useRef(initialPlayerShield ?? 0)
  // 보호막 남은 지속시간 (스킬과 독립적으로 관리)
  const [playerShieldDuration, setPlayerShieldDuration] = useState(0)
  const playerShieldDurationRef = useRef(0)

  // 플로팅 데미지
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([])
  const damageIdRef = useRef(0)

  // 스킬 상태 - 이전 층에서의 쿨다운이 있으면 그것을 사용
  const [playerSkills, setPlayerSkills] = useState<SkillState[]>(() =>
    playerCards.map((card, index) => ({
      card,
      cooldownRemaining: initialSkillCooldowns?.[index]?.cooldownRemaining ?? 0,
      durationRemaining: initialSkillCooldowns?.[index]?.durationRemaining ?? 0,
      isActive: initialSkillCooldowns?.[index]?.isActive ?? false,
    }))
  )
  const playerSkillsRef = useRef(playerSkills)
  useEffect(() => { playerSkillsRef.current = playerSkills }, [playerSkills])

  // 적 이미지 상태
  const [enemyImageState, setEnemyImageState] = useState<'idle' | 'hit' | 'attack' | 'death'>('idle')

  // 플레이어 공격 애니메이션
  const [isPlayerAttacking, setIsPlayerAttacking] = useState(false)

  // 스킬 사용 이펙트 (스킬 인덱스, 공격 스킬 여부)
  const [activeSkillEffect, setActiveSkillEffect] = useState<{ index: number; isAttack: boolean } | null>(null)

  // 누적 데미지
  const playerDamageRef = useRef(0)
  const enemyDamageRef = useRef(0)

  // HP refs
  const playerHpRef = useRef(playerHp)
  const enemyHpRef = useRef(enemyHp)
  const timeRef = useRef(timeRemaining)

  // 공격 타이머 refs
  const playerNextAttackRef = useRef(0)
  const enemyNextAttackRef = useRef(0)
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTickRef = useRef(Date.now())

  // 결과 전송 완료 ref
  const resultSentRef = useRef(false)

  // 스킬 중복 실행 방지 ref
  const skillLastUsedRef = useRef<Record<number, number>>({})
  const SKILL_DEBOUNCE_MS = 100

  useEffect(() => { playerHpRef.current = playerHp }, [playerHp])
  useEffect(() => { enemyHpRef.current = enemyHp }, [enemyHp])
  useEffect(() => { timeRef.current = timeRemaining }, [timeRemaining])
  useEffect(() => { playerShieldRef.current = playerShield }, [playerShield])
  useEffect(() => { playerShieldDurationRef.current = playerShieldDuration }, [playerShieldDuration])

  // 플로팅 데미지 추가
  const addFloatingDamage = useCallback((
    damage: number,
    isCrit: boolean,
    isHeal: boolean,
    target: 'player' | 'enemy',
    isMiss: boolean = false
  ) => {
    const id = ++damageIdRef.current
    setFloatingDamages(prev => [...prev, { id, damage, isCrit, isHeal, isMiss, target }])
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== id))
    }, 800)
  }, [])

  // 패시브 효과 계산
  const getPassiveBonus = useCallback((effectType: string): number => {
    return playerSkillsRef.current
      .filter(s => s.card.activationType === 'passive' && s.card.effect.type === effectType)
      .reduce((sum, s) => sum + s.card.effect.value, 0)
  }, [])

  // 활성화된 액티브 효과 값
  const getActiveEffectValue = useCallback((effectType: string): number => {
    return playerSkillsRef.current
      .filter(s => s.isActive && s.card.effect.type === effectType)
      .reduce((sum, s) => sum + s.card.effect.value, 0)
  }, [])

  // 데미지 계산
  const calculateDamage = useCallback((
    attackerStats: CharacterStats,
    defenderStats: CharacterStats,
    isPlayer: boolean,
    defenderHpRatio: number = 1,  // 상대 HP 비율 (처형 효과용)
    ignoreEvasion: boolean = false  // 회피 무시 여부 (냉기 효과용)
  ): { damage: number; isCrit: boolean; isMiss: boolean } => {
    // 회피 판정 (방어자의 evasion으로 판정) - ignoreEvasion이면 무시
    const evasion = defenderStats.evasion || 0
    if (!ignoreEvasion && evasion > 0 && Math.random() * 100 < evasion) {
      return { damage: 0, isCrit: false, isMiss: true }
    }
    let attackBoost = 0
    let defenseBoost = 0
    let critRateBoost = 0
    let critDamageBoost = 0
    let penetrationBoost = 0

    if (isPlayer) {
      attackBoost = getPassiveBonus('attack_boost') + getActiveEffectValue('attack_boost')
      critRateBoost = getPassiveBonus('crit_rate_boost') + getActiveEffectValue('crit_rate_boost')
      critDamageBoost = getPassiveBonus('crit_damage_boost') + getActiveEffectValue('crit_damage_boost')
      penetrationBoost = getPassiveBonus('penetration_boost') + getActiveEffectValue('penetration_boost')

      // 폭풍 연타: 공격력 감소 (효과값의 1/5)
      const doubleAttackValue = getActiveEffectValue('double_attack')
      if (doubleAttackValue > 0) {
        attackBoost -= Math.floor(doubleAttackValue / 5)
      }
    } else {
      defenseBoost = getPassiveBonus('defense_boost') + getActiveEffectValue('defense_boost')
    }

    const attack = Math.max(1, attackerStats.attack || 10) * (1 + attackBoost / 100)
    let defense = Math.max(0, defenderStats.defense || 5) * (1 + defenseBoost / 100)

    // 도발 효과: 플레이어가 공격할 때 적의 방어력 30% 감소
    if (isPlayer) {
      const tauntActive = getActiveEffectValue('taunt') > 0
      if (tauntActive) {
        defense *= 0.7  // 30% 방어력 감소
      }
    }

    // 관통력 곱연산: (1 - 기본관통) × (1 - 보너스관통) = 남은 방어 비율
    const basePen = (attackerStats.penetration || 0) / 100
    const bonusPen = penetrationBoost / 100
    const penetration = (1 - (1 - basePen) * (1 - bonusPen)) * 100

    // LoL 스타일 방어력 계산 (K=120)
    // 데미지 배율 = 1 - (방어력 / (방어력 + K)) × (1 - 관통력/100)
    const damageMultiplier = getDamageMultiplier(defense, penetration)
    let baseDamage = Math.max(1, attack * damageMultiplier)

    // 데미지 랜덤 범위
    baseDamage *= (0.9 + Math.random() * 0.2)

    // 치명타 체크
    const critRate = Math.min(100, (attackerStats.critRate || 5) + critRateBoost)
    const guaranteedCrit = getActiveEffectValue('guaranteed_crit') > 0
    const isCrit = guaranteedCrit || Math.random() * 100 < critRate

    if (isCrit) {
      // 크뎀 체감 효과 적용 (200% 초과분은 50%만 적용)
      const rawCritDamage = (attackerStats.critDamage || 150) + critDamageBoost
      const critDamage = getEffectiveCritDamage(rawCritDamage)
      baseDamage *= (critDamage / 100)
    }

    let finalDamage = Math.max(1, Math.floor(baseDamage * DAMAGE_REDUCTION))

    // 처형 효과: 상대 HP 50% 이하 시 추가 데미지 (플레이어만)
    if (isPlayer) {
      const executeBonus = getPassiveBonus('execute')
      if (executeBonus > 0 && defenderHpRatio <= 0.5) {
        finalDamage = Math.floor(finalDamage * (1 + executeBonus / 100))
      }
    }

    return { damage: finalDamage, isCrit, isMiss: false }
  }, [getPassiveBonus, getActiveEffectValue, DAMAGE_REDUCTION])

  // 스킬 사용
  const useSkill = useCallback((index: number) => {
    if (battleEnded) return

    // 중복 실행 방지 (100ms 이내 재실행 차단)
    const now = Date.now()
    const lastUsed = skillLastUsedRef.current[index] || 0
    if (now - lastUsed < SKILL_DEBOUNCE_MS) {
      return
    }
    skillLastUsedRef.current[index] = now

    // 현재 스킬 정보 가져오기 (ref 사용하여 최신 상태 참조)
    const skill = playerSkillsRef.current[index]
    if (!skill || skill.cooldownRemaining > 0) return
    if (skill.card.activationType === 'passive') return

    const effect = skill.card.effect

    // 즉시 효과 처리 (setState 콜백 바깥에서 실행)
    // 공격 스킬 여부 판단
    const isAttackSkill = effect.type === 'first_strike' || effect.type === 'shield_bash' || effect.type === 'sacrifice'

    // 스킬 사용 시각 효과
    setActiveSkillEffect({ index, isAttack: isAttackSkill })
    setTimeout(() => setActiveSkillEffect(null), 400)

    if (effect.type === 'hp_recovery') {
      const healAmount = Math.floor(playerHpRef.current * effect.value / 100)
      const newPlayerHp = Math.min(playerMaxHp, playerHpRef.current + healAmount)
      playerHpRef.current = newPlayerHp
      setPlayerHp(newPlayerHp)
      addFloatingDamage(healAmount, false, true, 'player')
    } else if (effect.type === 'first_strike') {
      const bonusDamage = Math.floor(enemyMaxHp * effect.value / 100)
      const newEnemyHp = Math.max(0, enemyHpRef.current - bonusDamage)
      enemyHpRef.current = newEnemyHp
      setEnemyHp(newEnemyHp)
      addFloatingDamage(bonusDamage, false, false, 'enemy')
      // 적 피격 효과
      setEnemyImageState('hit')
      setTimeout(() => setEnemyImageState(prev => prev === 'death' ? 'death' : 'idle'), 300)
    } else if (effect.type === 'shield_bash') {
      const defense = safePlayerStats.defense * (1 + getPassiveBonus('defense_boost') / 100)
      const bonusDamage = Math.floor(defense * effect.value / 100)
      const newEnemyHp = Math.max(0, enemyHpRef.current - bonusDamage)
      enemyHpRef.current = newEnemyHp
      setEnemyHp(newEnemyHp)
      addFloatingDamage(bonusDamage, false, false, 'enemy')
      // 적 피격 효과
      setEnemyImageState('hit')
      setTimeout(() => setEnemyImageState(prev => prev === 'death' ? 'death' : 'idle'), 300)
    } else if (effect.type === 'sacrifice') {
      // 희생 일격: HP 15% 소모, 소모량의 value% 데미지
      const hpCost = Math.floor(playerHpRef.current * 0.15)
      const bonusDamage = Math.floor(hpCost * effect.value / 100)
      // HP 소모
      const newPlayerHp = Math.max(1, playerHpRef.current - hpCost) // 최소 1 HP 유지
      playerHpRef.current = newPlayerHp
      setPlayerHp(newPlayerHp)
      addFloatingDamage(hpCost, false, false, 'player') // 플레이어에게 빨간 데미지 표시
      // 적에게 데미지
      const newEnemyHp = Math.max(0, enemyHpRef.current - bonusDamage)
      enemyHpRef.current = newEnemyHp
      setEnemyHp(newEnemyHp)
      addFloatingDamage(bonusDamage, true, false, 'enemy') // 크리티컬 표시로 강조
      // 적 피격 효과
      setEnemyImageState('hit')
      setTimeout(() => setEnemyImageState(prev => prev === 'death' ? 'death' : 'idle'), 300)
    } else if (effect.type === 'shield') {
      // 보호막: 최대 HP의 value% 만큼 보호막 생성, 지속시간 설정
      const shieldAmount = Math.floor(playerMaxHp * effect.value / 100)
      playerShieldRef.current = shieldAmount
      setPlayerShield(shieldAmount)
      playerShieldDurationRef.current = skill.card.duration
      setPlayerShieldDuration(skill.card.duration)
      // 보호막 생성 플로팅 메시지 (회복 스타일로 표시)
      addFloatingDamage(shieldAmount, false, true, 'player')
    } else if (effect.type === 'freeze') {
      // 냉기: 적 공속 감소 + 회피 무시 (지속 효과로 처리)
      // 적 피격 효과로 냉기 시각 피드백
      setEnemyImageState('hit')
      setTimeout(() => setEnemyImageState(prev => prev === 'death' ? 'death' : 'idle'), 300)
    } else if (effect.type === 'taunt') {
      // 도발: 적 공속 증가 + 방어력 감소 (지속 효과로 처리)
      setEnemyImageState('hit')
      setTimeout(() => setEnemyImageState(prev => prev === 'death' ? 'death' : 'idle'), 300)
    }

    // 지속 효과 활성화 (taunt은 effect.value가 지속시간)
    // shield는 effect.value가 HP%, freeze는 effect.value가 공속감소%이므로 card.duration 사용
    const durationBasedEffects = ['guaranteed_crit', 'immunity', 'silence', 'taunt']
    const effectDuration = durationBasedEffects.includes(effect.type)
      ? effect.value
      : skill.card.duration

    // 쿨타임 초기화 패시브 체크
    const cooldownResetChance = getPassiveBonus('cooldown_reset')
    const isCooldownReset = cooldownResetChance > 0 && Math.random() * 100 < cooldownResetChance
    const finalCooldown = isCooldownReset ? 0 : skill.card.cooldown

    // 쿨타임 초기화 시 플로팅 텍스트로 알림
    if (isCooldownReset) {
      addFloatingDamage(0, false, false, 'player', false)
      // 간단한 콘솔 로그 (디버깅용)
      console.log('⏰ 쿨타임 초기화!')
    }

    // 스킬 상태 업데이트 (순수 함수)
    setPlayerSkills(prev => {
      const newSkills = [...prev]
      newSkills[index] = {
        ...prev[index],
        isActive: effectDuration > 0,
        durationRemaining: effectDuration,
        cooldownRemaining: finalCooldown,
      }

      return newSkills
    })
  }, [battleEnded, playerMaxHp, enemyMaxHp, safePlayerStats.defense, addFloatingDamage, getPassiveBonus])

  // 게임 루프
  useEffect(() => {
    if (battleEnded) return

    const playerInterval = calculateAttackInterval(safePlayerStats.attackSpeed)
    const enemyInterval = calculateAttackInterval(enemy.stats.attackSpeed)

    playerNextAttackRef.current = playerInterval / 2
    enemyNextAttackRef.current = enemyInterval / 2 + 200
    lastTickRef.current = Date.now()

    const gameLoop = () => {
      const now = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      // 시간 업데이트
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - delta)
        timeRef.current = newTime
        return newTime
      })

      // 스킬 쿨다운/지속시간 업데이트
      const deltaSec = delta / 1000
      setPlayerSkills(prev => prev.map(skill => {
        const stillActive = skill.durationRemaining > deltaSec
        return {
          ...skill,
          cooldownRemaining: Math.max(0, skill.cooldownRemaining - deltaSec),
          durationRemaining: Math.max(0, skill.durationRemaining - deltaSec),
          isActive: stillActive ? skill.isActive : false,
        }
      }))

      // 보호막 지속시간 감소 (스킬과 독립적으로 관리)
      setPlayerShieldDuration(prev => {
        const newDuration = Math.max(0, prev - deltaSec)
        if (prev > 0 && newDuration === 0 && playerShieldRef.current > 0) {
          playerShieldRef.current = 0
          setPlayerShield(0)
        }
        return newDuration
      })

      // 공격 타이밍 체크
      playerNextAttackRef.current -= delta
      enemyNextAttackRef.current -= delta

      // 플레이어 공격
      if (playerNextAttackRef.current <= 0 && enemyHpRef.current > 0) {
        // 공격속도 증가: speed_boost + double_attack (폭풍 연타) + berserker (광전사)
        const speedBoost = getPassiveBonus('speed_boost') + getActiveEffectValue('speed_boost') + getActiveEffectValue('double_attack')

        // 광전사: HP 50% 이하일 때 체력에 비례해서 공격속도 증가
        // 50% HP = 0% 보너스, 0% HP = effect.value% 보너스 (선형 스케일링)
        const playerHpRatio = playerHpRef.current / playerMaxHp
        const berserkerBaseValue = getPassiveBonus('berserker')
        let berserkerBonus = 0
        if (playerHpRatio <= 0.5 && berserkerBaseValue > 0) {
          berserkerBonus = Math.floor((0.5 - playerHpRatio) / 0.5 * berserkerBaseValue)
        }

        const totalSpeedBoost = speedBoost + berserkerBonus
        const speedMultiplier = 1 / (1 + totalSpeedBoost / 100)  // 공속 증가는 간격 감소로 적용
        playerNextAttackRef.current = playerInterval * speedMultiplier

        // 적 HP 비율 계산 (처형 효과용)
        const enemyHpRatio = enemyHpRef.current / enemyMaxHp
        // 냉기 효과가 활성화되어 있으면 적의 회피 무시
        const freezeIgnoreEvasion = getActiveEffectValue('freeze') > 0  // freeze가 활성화되면 회피 무시
        const { damage, isCrit, isMiss } = calculateDamage(safePlayerStats, enemy.stats, true, enemyHpRatio, freezeIgnoreEvasion)

        if (isMiss) {
          // 적이 회피 성공
          addFloatingDamage(0, false, false, 'enemy', true)
        } else {
          playerDamageRef.current += damage

          setEnemyHp(prev => {
            const newHp = Math.max(0, prev - damage)
            enemyHpRef.current = newHp
            return newHp
          })

          // 흡혈
          const lifesteal = getPassiveBonus('lifesteal') + getActiveEffectValue('lifesteal')
          if (lifesteal > 0 && isCrit) {
            const healAmount = Math.floor(damage * lifesteal / 100)
            setPlayerHp(hp => {
              const newHp = Math.min(playerMaxHp, hp + healAmount)
              playerHpRef.current = newHp
              return newHp
            })
            addFloatingDamage(healAmount, false, true, 'player')
          }

          addFloatingDamage(damage, isCrit, false, 'enemy')
        }

        // 공격 애니메이션
        setIsPlayerAttacking(true)
        setEnemyImageState('hit')
        setTimeout(() => {
          setIsPlayerAttacking(false)
          setEnemyImageState(prev => prev === 'death' ? 'death' : 'idle')
        }, 200)
      }

      // 적 공격
      if (enemyNextAttackRef.current <= 0 && playerHpRef.current > 0 && enemyHpRef.current > 0) {
        // 냉기 효과: 적 공속 감소 (effect.value% 만큼)
        const freezeValue = getActiveEffectValue('freeze')
        let enemySpeedModifier = 1
        if (freezeValue > 0) {
          // 공속 X% 감소 = 간격 1/(1-X/100) 배
          enemySpeedModifier = 1 / (1 - freezeValue / 100)
        }

        enemyNextAttackRef.current = enemyInterval * enemySpeedModifier

        const { damage: rawDamage, isCrit, isMiss } = calculateDamage(enemy.stats, safePlayerStats, false)

        // 도발 효과: 받는 피해 30% 감소
        const tauntActive = getActiveEffectValue('taunt') > 0
        const damage = tauntActive ? Math.floor(rawDamage * 0.7) : rawDamage

        if (isMiss) {
          // 플레이어가 회피 성공
          addFloatingDamage(0, false, false, 'player', true)
        } else {
          // 반사 데미지 (하이브리드: 고정 + 받은 데미지 %)
          const reflectSkill = playerSkillsRef.current.find(s =>
            s.card.activationType === 'passive' && s.card.effect.type === 'damage_reflect')
          if (reflectSkill && rawDamage > 0) {
            const fixedReflect = reflectSkill.card.effect.value
            const percentReflect = REFLECT_PERCENT_BY_TIER[reflectSkill.card.tier]
            const totalReflect = fixedReflect + Math.floor(rawDamage * percentReflect / 100)
            setEnemyHp(prev => {
              const newHp = Math.max(0, prev - totalReflect)
              enemyHpRef.current = newHp
              return newHp
            })
            addFloatingDamage(totalReflect, false, false, 'enemy')
          }

          enemyDamageRef.current += damage

          // 보호막이 있으면 먼저 흡수
          let remainingDamage = damage
          if (playerShieldRef.current > 0) {
            if (playerShieldRef.current >= remainingDamage) {
              // 보호막이 데미지를 완전히 흡수
              const newShield = playerShieldRef.current - remainingDamage
              playerShieldRef.current = newShield
              setPlayerShield(newShield)
              remainingDamage = 0
            } else {
              // 보호막이 일부만 흡수
              remainingDamage -= playerShieldRef.current
              playerShieldRef.current = 0
              setPlayerShield(0)
            }
          }

          // 남은 데미지를 HP에 적용
          if (remainingDamage > 0) {
            setPlayerHp(prev => {
              const newHp = Math.max(0, prev - remainingDamage)
              playerHpRef.current = newHp
              return newHp
            })
          }

          addFloatingDamage(damage, isCrit, false, 'player')
        }

        // 적 공격 애니메이션
        setEnemyImageState('attack')
        setTimeout(() => {
          setEnemyImageState(prev => prev === 'death' ? 'death' : 'idle')
        }, 200)
      }
    }

    gameLoopRef.current = setInterval(gameLoop, 50)

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 배틀 종료 체크
  useEffect(() => {
    if (battleEnded || resultSentRef.current) return

    const enemyDead = enemyHp <= 0
    const playerDead = playerHp <= 0
    const timeUp = timeRemaining <= 0

    if (enemyDead) {
      // 승리 - 사망 모션 보여주고 콜백 호출
      setBattleEnded(true)
      setEnemyImageState('death')
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }

      resultSentRef.current = true
      onVictory({
        timeRemaining,
        playerDamageDealt: playerDamageRef.current,
        enemyDamageDealt: enemyDamageRef.current,
        playerFinalHp: playerHp,
        enemyFinalHp: 0,
        // 다음 층으로 전달할 스킬 쿨다운 상태
        skillCooldowns: playerSkillsRef.current.map(s => ({
          cooldownRemaining: s.cooldownRemaining,
          durationRemaining: s.durationRemaining,
          isActive: s.isActive,
        })),
        // 다음 층으로 전달할 보호막
        playerShield: playerShieldRef.current,
      })
    } else if (playerDead || timeUp) {
      // 패배
      setBattleEnded(true)
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }

      resultSentRef.current = true
      onDefeat({
        timeRemaining,
        playerDamageDealt: playerDamageRef.current,
        enemyDamageDealt: enemyDamageRef.current,
        playerFinalHp: playerHp,
        enemyFinalHp: enemyHp,
      })
    }
  }, [enemyHp, playerHp, timeRemaining, battleEnded, onVictory, onDefeat])

  // UI 계산
  const timeProgress = timeRemaining / TIME_LIMIT
  const isLowTime = timeRemaining < 5000
  const enemyHpPercent = (enemyHp / enemyMaxHp) * 100
  const playerHpPercent = (playerHp / playerMaxHp) * 100

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl overflow-hidden border border-gray-700/50">
      {/* 상단 - 타이머 + 적 HP 바 */}
      <div className="p-4 bg-black/30">
        {/* 타이머 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GiStopwatch className={`text-xl ${isLowTime ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`} />
            <span className={`font-bold text-lg ${isLowTime ? 'text-red-400' : 'text-white'}`}>
              {Math.ceil(timeRemaining / 1000)}초
            </span>
          </div>
          <span className="text-gray-400 text-sm">{enemy.floor}층</span>
        </div>

        {/* 타이머 바 */}
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all duration-100 ${
              isLowTime
                ? 'bg-gradient-to-r from-red-600 to-red-400 animate-pulse'
                : 'bg-gradient-to-r from-yellow-500 to-amber-400'
            }`}
            style={{ width: `${timeProgress * 100}%` }}
          />
        </div>

        {/* 적 HP 바 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-red-400 font-bold text-sm">{enemy.name}</span>
            <span className="text-gray-400 text-xs">
              {formatLargeNumber(enemyHp)} / {formatLargeNumber(enemyMaxHp)}
            </span>
          </div>
          <div className="h-5 bg-gray-700/80 rounded-lg overflow-hidden border border-red-900/50 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-200 relative"
              style={{ width: `${enemyHpPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* 배틀 필드 */}
      <div className="relative h-56 bg-gradient-to-b from-gray-800/50 to-gray-900/80 overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/20 to-transparent" />
        </div>

        {/* 바닥 */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 to-transparent" />

        {/* 플레이어 공격 이펙트 */}
        {isPlayerAttacking && (
          <div className="absolute left-1/4 top-1/2 -translate-y-1/2 z-20">
            <div className="animate-[attack-slash_0.2s_ease-out]">
              <GiSwordWound className="text-5xl text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
            </div>
          </div>
        )}

        {/* 스킬 공격 이펙트 */}
        {activeSkillEffect?.isAttack && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <div className="animate-skill-hit">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-orange-500 via-yellow-400 to-red-500 opacity-70 blur-md" />
              <GiSwordWound className="absolute inset-0 m-auto text-6xl text-white drop-shadow-[0_0_20px_rgba(255,200,50,1)]" />
            </div>
          </div>
        )}

        {/* 허수아비 (우측 배치) */}
        <div className="absolute right-8 bottom-8 flex flex-col items-center">
          <div
            className={`relative transition-all duration-150 ${
              enemyImageState === 'hit' ? 'translate-x-2 scale-95' :
              enemyImageState === 'attack' ? '-translate-x-4 scale-105' :
              enemyImageState === 'death' ? 'opacity-50 grayscale rotate-12' : ''
            }`}
          >
            <img
              src={enemy.images[enemyImageState]}
              alt={enemy.name}
              className="w-28 h-28 object-contain drop-shadow-2xl"
              style={{
                filter: enemyImageState === 'hit'
                  ? 'brightness(2) drop-shadow(0 0 20px rgba(255,100,100,0.8))'
                  : enemyImageState === 'attack'
                  ? 'drop-shadow(0 0 15px rgba(255,50,50,0.6))'
                  : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
              }}
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const fallback = document.createElement('span')
                  fallback.className = 'text-7xl'
                  fallback.textContent = enemy.emoji
                  parent.appendChild(fallback)
                }
              }}
            />

            {/* 플로팅 데미지 (적에게) */}
            {floatingDamages
              .filter(d => d.target === 'enemy')
              .map(d => (
                <div
                  key={d.id}
                  className={`absolute left-1/2 -top-4 -translate-x-1/2 font-bold pointer-events-none z-30 animate-float-up whitespace-nowrap ${
                    d.isMiss ? 'text-cyan-400 italic text-base' :
                    d.isHeal ? 'text-green-400 text-base' :
                    d.isCrit ? 'text-orange-400 text-lg scale-110' : 'text-yellow-200 text-base'
                  }`}
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                  {d.isMiss ? 'MISS' :
                   d.isHeal ? `+${d.damage.toLocaleString()}` :
                   d.isCrit ? `${d.damage.toLocaleString()} 치명타!` :
                   d.damage.toLocaleString()}
                </div>
              ))}
          </div>

          {/* 그림자 */}
          <div
            className={`w-20 h-4 bg-black/40 rounded-full blur-sm transition-all duration-150 ${
              enemyImageState === 'death' ? 'opacity-30 scale-75' : ''
            }`}
          />
        </div>

        {/* 플레이어 영역 */}
        <div className="absolute left-4 bottom-4">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-2">
              {playerAvatarUrl ? (
                <img
                  src={playerAvatarUrl}
                  alt={playerName}
                  className="w-8 h-8 rounded-full object-cover border-2 border-cyan-500/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                  {playerName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-cyan-400 font-bold text-sm">{playerName}</span>
            </div>

            {/* 플레이어 HP 바 */}
            <div className="w-32">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>HP</span>
                <span>{Math.floor(playerHp).toLocaleString()}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden border border-emerald-900/50">
                <div
                  className={`h-full transition-all duration-200 ${
                    playerHpPercent < 30
                      ? 'bg-gradient-to-r from-red-600 to-red-400 animate-pulse'
                      : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400'
                  }`}
                  style={{ width: `${playerHpPercent}%` }}
                />
              </div>
            </div>

            {/* 보호막 바 (보호막이 있을 때만 표시) */}
            {playerShield > 0 && (
              <div className="w-32 mt-1">
                <div className="flex justify-between text-xs text-cyan-400 mb-0.5">
                  <span>🛡️ 보호막</span>
                  <span>{Math.floor(playerShield).toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden border border-cyan-500/50">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 transition-all duration-200"
                    style={{ width: `${Math.min(100, (playerShield / playerMaxHp) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* 활성 버프/패시브 표시 */}
            {(playerSkills.some(s => s.isActive) || playerSkills.some(s => s.card.activationType === 'passive')) && (
              <div className="flex gap-1 mt-2 flex-wrap max-w-32">
                {/* 패시브 스킬 (항상 활성) */}
                {playerSkills
                  .filter(s => s.card.activationType === 'passive')
                  .map(skill => (
                    <div
                      key={skill.card.id}
                      className="flex items-center gap-0.5 bg-blue-900/60 border border-blue-500/50 rounded px-1 py-0.5"
                      title={`${skill.card.name}: ${skill.card.description}`}
                    >
                      <span className="text-[10px]">{skill.card.emoji}</span>
                    </div>
                  ))}
                {/* 액티브 버프 (지속시간 표시) */}
                {playerSkills
                  .filter(s => s.isActive && s.card.activationType === 'active')
                  .map(skill => (
                    <div
                      key={skill.card.id}
                      className="flex items-center gap-0.5 bg-yellow-900/60 border border-yellow-500/50 rounded px-1 py-0.5 animate-pulse"
                      title={`${skill.card.name}: ${skill.card.description}`}
                    >
                      <span className="text-[10px]">{skill.card.emoji}</span>
                      <span className="text-[8px] text-yellow-300 font-bold">
                        {skill.durationRemaining.toFixed(1)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* 플레이어 플로팅 데미지 */}
            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {floatingDamages
                .filter(d => d.target === 'player')
                .map(d => (
                  <div
                    key={d.id}
                    className={`absolute left-1/2 -top-2 -translate-x-1/2 font-bold animate-float-up whitespace-nowrap ${
                      d.isMiss ? 'text-cyan-400 italic text-base' :
                      d.isHeal ? 'text-green-400 text-sm' :
                      d.isCrit ? 'text-orange-400 text-base' : 'text-red-400 text-sm'
                    }`}
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  >
                    {d.isMiss ? 'MISS' :
                     d.isHeal ? `+${d.damage.toLocaleString()}` :
                     d.isCrit ? `-${d.damage.toLocaleString()} 치명타!` :
                     `-${d.damage.toLocaleString()}`}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* PvP 스타일 스킬 버튼 */}
      <div className="p-3 bg-gray-900/50 border-t border-gray-700/50">
        <div className="grid grid-cols-3 gap-2">
          {playerSkills.map((skill, index) => {
            const isActive = skill.card.activationType === 'active'
            const onCooldown = skill.cooldownRemaining > 0
            const isBuffActive = skill.isActive
            const cooldownProgress = onCooldown
              ? (skill.card.cooldown - skill.cooldownRemaining) / skill.card.cooldown
              : 1
            const isReady = isActive && !onCooldown && !battleEnded
            const isSkillActivating = activeSkillEffect?.index === index

            return (
              <button
                key={skill.card.id}
                onClick={() => isReady && useSkill(index)}
                disabled={!isReady}
                className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                  isSkillActivating
                    ? 'bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300 scale-95 shadow-xl shadow-yellow-500/50'
                    : !isActive
                    ? 'bg-gray-700/50 border-gray-600 cursor-default'
                    : onCooldown
                      ? 'bg-gray-800 border-gray-600 cursor-not-allowed'
                      : isBuffActive
                        ? 'bg-yellow-900/50 border-yellow-400 animate-pulse'
                        : 'bg-gradient-to-b from-gray-700 to-gray-800 border-yellow-500 hover:border-yellow-400 hover:scale-105 cursor-pointer shadow-lg shadow-yellow-500/20'
                }`}
              >
                {/* 스킬 발동 이펙트 */}
                {isSkillActivating && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/50 via-white/30 to-yellow-400/50 animate-skill-flash z-20 pointer-events-none" />
                )}

                {/* 쿨다운 프로그레스 바 */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div
                      className={`h-full transition-all duration-200 ${
                        onCooldown ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${cooldownProgress * 100}%` }}
                    />
                  </div>
                )}

                {/* 쿨다운 오버레이 */}
                {onCooldown && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <div className="text-center">
                      <span className="text-xl font-bold text-white">
                        {Math.ceil(skill.cooldownRemaining)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 스킬 정보 */}
                <div className="text-center p-2 pb-3">
                  <span className={`text-2xl drop-shadow-lg transition-transform ${isSkillActivating ? 'scale-125' : ''}`}>
                    {skill.card.emoji}
                  </span>
                  <p className="text-[10px] font-bold mt-1 truncate text-white">{skill.card.name}</p>
                  <p className={`text-[9px] mt-0.5 ${
                    isReady ? 'text-yellow-400 font-bold' : 'text-gray-400'
                  }`}>
                    {!isActive ? '패시브' : isReady ? 'READY!' : `CD ${skill.card.cooldown}s`}
                  </p>
                </div>

                {/* 활성화 표시 */}
                {isBuffActive && (
                  <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[9px] font-bold px-1 py-0.5 rounded-full">
                    {skill.durationRemaining.toFixed(1)}s
                  </div>
                )}

                {/* 사용 가능 표시 */}
                {isReady && !isSkillActivating && (
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
                <GiCardRandom className="text-2xl opacity-30 mx-auto" />
                <p className="text-[10px] mt-1">빈 슬롯</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes float-up {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-30px); }
        }
        .animate-float-up {
          animation: float-up 0.8s ease-out forwards;
        }
        @keyframes attack-slash {
          0% { opacity: 0; transform: translateX(-30px) rotate(-45deg) scale(0.5); }
          50% { opacity: 1; transform: translateX(30px) rotate(0deg) scale(1.2); }
          100% { opacity: 0; transform: translateX(60px) rotate(45deg) scale(0.8); }
        }
        @keyframes skill-flash {
          0% { opacity: 0; transform: translateX(-100%); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateX(100%); }
        }
        .animate-skill-flash {
          animation: skill-flash 0.4s ease-out forwards;
        }
        @keyframes skill-attack-hit {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.3); }
          100% { opacity: 0; transform: scale(1); }
        }
        .animate-skill-hit {
          animation: skill-attack-hit 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
