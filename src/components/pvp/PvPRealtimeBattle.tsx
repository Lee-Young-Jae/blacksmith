/**
 * PvP Realtime Battle
 *
 * 실시간 배틀 - 플레이어가 액티브 스킬을 직접 사용
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CharacterStats } from '../../types/stats'
import type { BattleCard } from '../../types/battleCard'
import { PVP_BATTLE_CONFIG } from '../../types/pvpBattle'
import { BATTLE_CARD_TIER_COLORS } from '../../types/battleCard'

// =============================================
// 타입 정의
// =============================================

interface PvPRealtimeBattleProps {
  // 플레이어 정보
  playerName: string
  playerStats: CharacterStats
  playerCards: BattleCard[]

  // 상대 정보
  opponentName: string
  opponentStats: CharacterStats
  opponentCards: BattleCard[]
  opponentIsAI?: boolean

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
  target: 'player' | 'opponent'
}

// =============================================
// 컴포넌트
// =============================================

export function PvPRealtimeBattle({
  playerName,
  playerStats,
  playerCards,
  opponentName,
  opponentStats,
  opponentCards,
  opponentIsAI = true,
  onBattleEnd,
}: PvPRealtimeBattleProps) {
  // HP 배율 적용
  const hpMultiplier = PVP_BATTLE_CONFIG.HP_MULTIPLIER
  const damageReduction = PVP_BATTLE_CONFIG.DAMAGE_REDUCTION

  // 상태
  const [playerHp, setPlayerHp] = useState(playerStats.hp * hpMultiplier)
  const [opponentHp, setOpponentHp] = useState(opponentStats.hp * hpMultiplier)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [battleEnded, setBattleEnded] = useState(false)

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

  // 플로팅 데미지
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([])
  const damageIdRef = useRef(0)

  // 공격 타이머
  const playerNextAttackRef = useRef(1000)
  const opponentNextAttackRef = useRef(1200)
  const lastUpdateRef = useRef(Date.now())

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
  const playerMaxHp = playerStats.hp * hpMultiplier
  const opponentMaxHp = opponentStats.hp * hpMultiplier

  // 플로팅 데미지 추가
  const addFloatingDamage = useCallback((
    target: 'player' | 'opponent',
    damage: number,
    isCrit: boolean,
    isHeal: boolean = false
  ) => {
    const id = damageIdRef.current++
    setFloatingDamages(prev => [...prev, { id, damage, isCrit, isHeal, target }])
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== id))
    }, 800)
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

  // 데미지 계산
  const calculateDamage = useCallback((
    attackerStats: CharacterStats,
    defenderStats: CharacterStats,
    attackerSkills: SkillState[],
    defenderSkills: SkillState[]
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
    const defenseReductionRate = defense / (defense + 100) * (1 - penetration / 100)
    let baseDamage = Math.max(1, attack * (1 - defenseReductionRate * 0.5))

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

    // 더블 어택
    if (hasActiveEffect(attackerSkills, 'double_attack')) {
      baseDamage *= 2
    }

    // 면역 체크
    if (hasActiveEffect(defenderSkills, 'immunity')) {
      return { damage: 0, isCrit: false }
    }

    // 데미지 감소 적용 (최소 1 데미지 보장)
    const finalDamage = Math.max(1, Math.floor(baseDamage * damageReduction))

    return { damage: finalDamage, isCrit }
  }, [getPassiveBonus, hasActiveEffect, damageReduction])

  // 스킬 사용
  const useSkill = useCallback((skillIndex: number) => {
    setPlayerSkills(prev => {
      const newSkills = [...prev]
      const skill = newSkills[skillIndex]

      // 쿨다운 중이면 무시
      if (skill.cooldownRemaining > 0) return prev

      // 패시브는 버튼 클릭 불필요
      if (skill.card.activationType === 'passive') return prev

      // 스킬 발동
      const card = skill.card
      const effect = card.effect

      // 즉시 효과
      if (effect.type === 'hp_recovery') {
        const healAmount = Math.floor(playerMaxHp * effect.value / 100)
        setPlayerHp(hp => Math.min(playerMaxHp, hp + healAmount))
        addFloatingDamage('player', healAmount, false, true)
      } else if (effect.type === 'first_strike') {
        // 강타: 즉시 추가 데미지
        const bonusDamage = effect.value
        setOpponentHp(hp => Math.max(0, hp - bonusDamage))
        addFloatingDamage('opponent', bonusDamage, true, false)
      } else if (effect.type === 'stun') {
        // 스턴: 상대 다음 공격 지연
        opponentNextAttackRef.current += 2000
      }

      // 지속 효과 활성화
      if (card.duration > 0) {
        newSkills[skillIndex] = {
          ...skill,
          isActive: true,
          durationRemaining: card.duration,
          cooldownRemaining: card.cooldown,
        }
      } else {
        // 즉시 효과는 바로 쿨다운
        newSkills[skillIndex] = {
          ...skill,
          cooldownRemaining: card.cooldown,
        }
      }

      return newSkills
    })
  }, [playerMaxHp, addFloatingDamage])

  // AI 스킬 사용 로직
  const aiUseSkill = useCallback(() => {
    setOpponentSkills(prev => {
      const newSkills = [...prev]

      // 사용 가능한 액티브 스킬 찾기
      const availableSkillIndex = newSkills.findIndex(
        s => s.card.activationType === 'active' &&
          s.cooldownRemaining <= 0 &&
          !s.isActive
      )

      if (availableSkillIndex === -1) return prev

      const skill = newSkills[availableSkillIndex]
      const card = skill.card
      const effect = card.effect

      // 즉시 효과
      if (effect.type === 'hp_recovery') {
        const healAmount = Math.floor(opponentMaxHp * effect.value / 100)
        setOpponentHp(hp => Math.min(opponentMaxHp, hp + healAmount))
        addFloatingDamage('opponent', healAmount, false, true)
      } else if (effect.type === 'first_strike') {
        const bonusDamage = effect.value
        setPlayerHp(hp => Math.max(0, hp - bonusDamage))
        addFloatingDamage('player', bonusDamage, true, false)
      } else if (effect.type === 'stun') {
        playerNextAttackRef.current += 2000
      }

      // 지속 효과 활성화
      if (card.duration > 0) {
        newSkills[availableSkillIndex] = {
          ...skill,
          isActive: true,
          durationRemaining: card.duration,
          cooldownRemaining: card.cooldown,
        }
      } else {
        newSkills[availableSkillIndex] = {
          ...skill,
          cooldownRemaining: card.cooldown,
        }
      }

      return newSkills
    })
  }, [opponentMaxHp, addFloatingDamage])

  // 스탯 ref (effect 재시작 방지용)
  const playerStatsRef = useRef(playerStats)
  const opponentStatsRef = useRef(opponentStats)

  useEffect(() => {
    playerStatsRef.current = playerStats
  }, [playerStats])

  useEffect(() => {
    opponentStatsRef.current = opponentStats
  }, [opponentStats])

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
        const activeSpeedBoost = hasActiveEffect(currentPlayerSkills, 'speed_boost') ? 50 : 0
        const adjustedInterval = interval / (1 + (speedBoost + activeSpeedBoost) / 100)
        playerNextAttackRef.current = Math.max(500, adjustedInterval)

        // 데미지 계산
        const { damage, isCrit } = calculateDamage(currentPlayerStats, currentOpponentStats, currentPlayerSkills, currentOpponentSkills)

        if (damage > 0) addFloatingDamage('opponent', damage, isCrit)

        setOpponentHp(prev => {
          const newHp = Math.max(0, prev - damage)

          // 흡혈
          const lifesteal = getPassiveBonus(currentPlayerSkills, 'lifesteal')
          if (lifesteal > 0 && damage > 0) {
            const healAmount = Math.floor(damage * lifesteal / 100)
            setPlayerHp(hp => Math.min(playerMaxHp, hp + healAmount))
          }

          // 반사
          const reflect = getPassiveBonus(currentOpponentSkills, 'damage_reflect')
          if (reflect > 0 && damage > 0) {
            const reflectDamage = Math.floor(damage * reflect / 100)
            setPlayerHp(hp => Math.max(0, hp - reflectDamage))
          }

          return newHp
        })
      }

      // 상대 공격
      opponentNextAttackRef.current -= deltaMs
      if (opponentNextAttackRef.current <= 0) {
        const safeAttackSpeed = Math.max(1, currentOpponentStats.attackSpeed || 100)
        const interval = 2000 / (safeAttackSpeed / 100)
        const speedBoost = getPassiveBonus(currentOpponentSkills, 'speed_boost')
        const activeSpeedBoost = hasActiveEffect(currentOpponentSkills, 'speed_boost') ? 50 : 0
        const adjustedInterval = interval / (1 + (speedBoost + activeSpeedBoost) / 100)
        opponentNextAttackRef.current = Math.max(500, adjustedInterval)

        const { damage, isCrit } = calculateDamage(currentOpponentStats, currentPlayerStats, currentOpponentSkills, currentPlayerSkills)

        if (damage > 0) addFloatingDamage('player', damage, isCrit)

        setPlayerHp(prev => {
          const newHp = Math.max(0, prev - damage)

          // 흡혈
          const lifesteal = getPassiveBonus(currentOpponentSkills, 'lifesteal')
          if (lifesteal > 0 && damage > 0) {
            const healAmount = Math.floor(damage * lifesteal / 100)
            setOpponentHp(hp => Math.min(opponentMaxHp, hp + healAmount))
          }

          // 반사
          const reflect = getPassiveBonus(currentPlayerSkills, 'damage_reflect')
          if (reflect > 0 && damage > 0) {
            const reflectDamage = Math.floor(damage * reflect / 100)
            setOpponentHp(hp => Math.max(0, hp - reflectDamage))
          }

          return newHp
        })

        // AI 스킬 사용 (30% 확률)
        if (opponentIsAI && Math.random() < 0.3) {
          aiUseSkill()
        }
      }
    }, 50) // 20fps

    return () => clearInterval(gameLoop)
  }, [isRunning, battleEnded, getPassiveBonus, hasActiveEffect, addFloatingDamage,
      calculateDamage, aiUseSkill, playerMaxHp, opponentMaxHp, opponentIsAI])

  // 배틀 종료 체크
  useEffect(() => {
    if (battleEnded) return

    const playerDead = playerHp <= 0
    const opponentDead = opponentHp <= 0
    const timeUp = elapsedTime >= PVP_BATTLE_CONFIG.BATTLE_DURATION

    if (playerDead || opponentDead || timeUp) {
      setBattleEnded(true)
      setIsRunning(false)

      let winner: 'player' | 'opponent' | 'draw'
      if (playerDead && opponentDead) {
        winner = 'draw'
      } else if (opponentDead) {
        winner = 'player'
      } else if (playerDead) {
        winner = 'opponent'
      } else {
        // 시간 초과: HP 비율로 판정
        const playerRatio = playerHp / playerMaxHp
        const opponentRatio = opponentHp / opponentMaxHp
        if (playerRatio > opponentRatio) winner = 'player'
        else if (opponentRatio > playerRatio) winner = 'opponent'
        else winner = 'draw'
      }

      setTimeout(() => {
        onBattleEnd({
          winner,
          playerFinalHp: playerHp,
          opponentFinalHp: opponentHp,
          battleDuration: elapsedTime,
        })
      }, 1000)
    }
  }, [playerHp, opponentHp, elapsedTime, battleEnded, playerMaxHp, opponentMaxHp, onBattleEnd])

  // 시간 표시
  const timeRemaining = Math.max(0, (PVP_BATTLE_CONFIG.BATTLE_DURATION - elapsedTime) / 1000)

  return (
    <div className="space-y-4">
      {/* 타이머 */}
      <div className="text-center">
        <span className={`text-2xl font-bold ${timeRemaining < 5 ? 'text-red-400' : 'text-yellow-400'}`}>
          {timeRemaining.toFixed(1)}s
        </span>
      </div>

      {/* 배틀 영역 */}
      <div className="relative bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl p-4 min-h-[200px]">
        {/* 상대 */}
        <div className="absolute top-4 right-4 text-right">
          <p className="text-white font-bold">{opponentName}</p>
          <div className="w-32 h-3 bg-gray-600 rounded-full mt-1">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-200"
              style={{ width: `${Math.max(0, (opponentHp / opponentMaxHp) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {Math.floor(opponentHp)} / {opponentMaxHp}
          </p>

          {/* 상대 플로팅 데미지 */}
          {floatingDamages.filter(d => d.target === 'opponent').map(d => (
            <div
              key={d.id}
              className={`absolute right-8 top-8 animate-float-up font-bold text-lg ${
                d.isHeal ? 'text-green-400' : d.isCrit ? 'text-orange-400' : 'text-white'
              }`}
            >
              {d.isHeal ? '+' : '-'}{d.damage}
            </div>
          ))}
        </div>

        {/* 플레이어 */}
        <div className="absolute bottom-4 left-4">
          <p className="text-cyan-400 font-bold">{playerName}</p>
          <div className="w-32 h-3 bg-gray-600 rounded-full mt-1">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-200"
              style={{ width: `${Math.max(0, (playerHp / playerMaxHp) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {Math.floor(playerHp)} / {playerMaxHp}
          </p>

          {/* 플레이어 플로팅 데미지 */}
          {floatingDamages.filter(d => d.target === 'player').map(d => (
            <div
              key={d.id}
              className={`absolute left-8 bottom-8 animate-float-up font-bold text-lg ${
                d.isHeal ? 'text-green-400' : d.isCrit ? 'text-orange-400' : 'text-white'
              }`}
            >
              {d.isHeal ? '+' : '-'}{d.damage}
            </div>
          ))}
        </div>

        {/* 중앙 VS */}
        <div className="flex items-center justify-center h-full">
          <span className="text-4xl font-bold text-gray-500">VS</span>
        </div>
      </div>

      {/* 스킬 버튼들 */}
      <div className="grid grid-cols-3 gap-2">
        {playerSkills.map((skill, index) => {
          const isActive = skill.card.activationType === 'active'
          const onCooldown = skill.cooldownRemaining > 0
          const isBuffActive = skill.isActive

          return (
            <button
              key={skill.card.id}
              onClick={() => isActive && useSkill(index)}
              disabled={!isActive || onCooldown || battleEnded}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                !isActive
                  ? 'bg-gray-700/50 border-gray-600 cursor-default'
                  : onCooldown
                    ? 'bg-gray-700 border-gray-500 cursor-not-allowed opacity-60'
                    : isBuffActive
                      ? 'bg-yellow-900/50 border-yellow-500 animate-pulse'
                      : `${BATTLE_CARD_TIER_COLORS[skill.card.tier]} hover:scale-105 cursor-pointer`
              }`}
            >
              {/* 쿨다운 오버레이 */}
              {onCooldown && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <span className="text-white font-bold text-lg">
                    {Math.ceil(skill.cooldownRemaining)}s
                  </span>
                </div>
              )}

              {/* 스킬 정보 */}
              <div className="text-center">
                <span className="text-2xl">{skill.card.emoji}</span>
                <p className="text-xs font-medium mt-1 truncate">{skill.card.name}</p>
                <p className="text-[10px] text-gray-400">
                  {isActive ? `쿨다운: ${skill.card.cooldown}s` : '패시브'}
                </p>
              </div>

              {/* 활성화 표시 */}
              {isBuffActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-[10px]">!</span>
                </div>
              )}
            </button>
          )
        })}

        {/* 빈 슬롯 */}
        {[...Array(3 - playerSkills.length)].map((_, i) => (
          <div
            key={`empty-${i}`}
            className="p-3 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/30"
          >
            <div className="text-center text-gray-500">
              <span className="text-2xl">-</span>
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
        const playerRatio = playerHp / playerMaxHp
        const opponentRatio = opponentHp / opponentMaxHp
        const playerDead = playerHp <= 0
        const opponentDead = opponentHp <= 0

        let resultText: React.ReactNode
        if (playerDead && opponentDead) {
          resultText = <span className="text-yellow-400">무승부</span>
        } else if (opponentDead) {
          resultText = <span className="text-green-400">승리!</span>
        } else if (playerDead) {
          resultText = <span className="text-red-400">패배...</span>
        } else if (playerRatio > opponentRatio) {
          resultText = <span className="text-green-400">승리!</span>
        } else if (opponentRatio > playerRatio) {
          resultText = <span className="text-red-400">패배...</span>
        } else {
          resultText = <span className="text-yellow-400">무승부</span>
        }

        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-2xl font-bold mb-2">{resultText}</p>
              <p className="text-gray-400 text-sm">
                내 HP: {Math.floor(playerRatio * 100)}% | 상대 HP: {Math.floor(opponentRatio * 100)}%
              </p>
              <p className="text-gray-500 text-xs mt-2">결과 처리 중...</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
