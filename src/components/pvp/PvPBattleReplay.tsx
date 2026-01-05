/**
 * PvP Battle Replay Component
 *
 * 실시간 액션 배틀 - 데미지가 캐릭터 위에 표시되고 HP가 실시간으로 변화
 */

import { useState, useEffect, useRef } from 'react'
import type { PvPBattle } from '../../types/pvpBattle'
import { PVP_BATTLE_CONFIG } from '../../types/pvpBattle'
import { GiCrossedSwords, GiShield } from 'react-icons/gi'

// =============================================
// 타입 정의
// =============================================

interface PvPBattleReplayProps {
  battle: PvPBattle | null
  isPlaying: boolean
  onClose: () => void
  onClaimReward: (amount: number) => void
}

interface FloatingDamage {
  id: number
  damage: number
  isCrit: boolean
  isHeal: boolean
  x: number
  y: number
  opacity: number
}

interface CharacterState {
  hp: number
  maxHp: number
  isHit: boolean
  isAttacking: boolean
  lastDamage: number
}

// =============================================
// 플로팅 데미지 컴포넌트
// =============================================

function FloatingDamageNumber({ damage, isCrit, isHeal, style }: {
  damage: number
  isCrit: boolean
  isHeal: boolean
  style: React.CSSProperties
}) {
  return (
    <div
      className={`absolute pointer-events-none font-bold text-lg animate-float-up ${
        isHeal
          ? 'text-green-400'
          : isCrit
            ? 'text-orange-400 text-xl'
            : 'text-white'
      }`}
      style={style}
    >
      {isHeal ? '+' : '-'}{damage}
      {isCrit && <span className="text-xs ml-1">!</span>}
    </div>
  )
}

// =============================================
// 캐릭터 컴포넌트
// =============================================

function BattleCharacter({
  name,
  state,
  isLeft,
  floatingDamages,
  attackSpeed,
  icon,
  gradientFrom,
  gradientTo,
}: {
  name: string
  state: CharacterState
  isLeft: boolean
  floatingDamages: FloatingDamage[]
  attackSpeed: number
  icon: React.ReactNode
  gradientFrom: string
  gradientTo: string
}) {
  const hpPercent = Math.max(0, (state.hp / state.maxHp) * 100)
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className={`flex-1 flex flex-col ${isLeft ? 'items-start' : 'items-end'}`}>
      {/* 캐릭터 아바타 영역 */}
      <div className="relative mb-2">
        {/* 플로팅 데미지 */}
        {floatingDamages.map(fd => (
          <FloatingDamageNumber
            key={fd.id}
            damage={fd.damage}
            isCrit={fd.isCrit}
            isHeal={fd.isHeal}
            style={{
              left: `${fd.x}px`,
              top: `${fd.y}px`,
              opacity: fd.opacity,
              transform: `translateY(${(1 - fd.opacity) * -30}px)`,
              transition: 'all 0.1s ease-out',
            }}
          />
        ))}

        {/* 캐릭터 */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl
            bg-gradient-to-br ${gradientFrom} ${gradientTo}
            ${state.isHit ? 'animate-shake scale-95' : ''}
            ${state.isAttacking ? 'scale-110' : ''}
            transition-transform duration-100
            shadow-lg
          `}
        >
          {icon}
        </div>

        {/* 공격 이펙트 */}
        {state.isAttacking && (
          <div className={`absolute inset-0 rounded-full animate-ping opacity-50
            bg-gradient-to-br ${gradientFrom} ${gradientTo}`}
          />
        )}
      </div>

      {/* 이름 및 공속 */}
      <div className={`mb-1 ${isLeft ? 'text-left' : 'text-right'} w-full`}>
        <p className={`font-bold text-sm ${isLeft ? 'text-blue-400' : 'text-red-400'}`}>
          {name}
        </p>
        <p className="text-gray-500 text-xs">공속 {attackSpeed}</p>
      </div>

      {/* HP 바 */}
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className={hpPercent > 25 ? 'text-white' : 'text-red-400'}>
            {Math.floor(state.hp)}
          </span>
          <span className="text-gray-500">/ {state.maxHp}</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${hpColor} transition-all duration-150 ease-out`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// =============================================
// 메인 컴포넌트
// =============================================

export function PvPBattleReplay({
  battle,
  isPlaying,
  onClose,
  onClaimReward,
}: PvPBattleReplayProps) {
  const [showResult, setShowResult] = useState(false)
  const [rewardClaimed, setRewardClaimed] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const [attackerState, setAttackerState] = useState<CharacterState>({
    hp: 0, maxHp: 0, isHit: false, isAttacking: false, lastDamage: 0
  })
  const [defenderState, setDefenderState] = useState<CharacterState>({
    hp: 0, maxHp: 0, isHit: false, isAttacking: false, lastDamage: 0
  })

  const [attackerFloatingDamages, setAttackerFloatingDamages] = useState<FloatingDamage[]>([])
  const [defenderFloatingDamages, setDefenderFloatingDamages] = useState<FloatingDamage[]>([])

  const [recentLogs, setRecentLogs] = useState<string[]>([])

  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const lastProcessedIndexRef = useRef(-1)
  const damageIdRef = useRef(0)

  // 플로팅 데미지 추가 (ref로 안정적인 참조)
  const addFloatingDamageRef = useRef((
    target: 'attacker' | 'defender',
    damage: number,
    isCrit: boolean,
    isHeal: boolean = false
  ) => {
    const newDamage: FloatingDamage = {
      id: damageIdRef.current++,
      damage,
      isCrit,
      isHeal,
      x: 20 + Math.random() * 20,
      y: -10 - Math.random() * 20,
      opacity: 1,
    }

    if (target === 'attacker') {
      setAttackerFloatingDamages(prev => [...prev, newDamage])
    } else {
      setDefenderFloatingDamages(prev => [...prev, newDamage])
    }

    // 페이드 아웃
    setTimeout(() => {
      if (target === 'attacker') {
        setAttackerFloatingDamages(prev => prev.filter(d => d.id !== newDamage.id))
      } else {
        setDefenderFloatingDamages(prev => prev.filter(d => d.id !== newDamage.id))
      }
    }, 800)
  })

  // 배틀 초기화
  useEffect(() => {
    if (battle && isPlaying) {
      setShowResult(false)
      setRewardClaimed(false)
      setElapsedTime(0)
      setIsPaused(false)
      setRecentLogs([])
      setAttackerFloatingDamages([])
      setDefenderFloatingDamages([])
      lastProcessedIndexRef.current = -1
      startTimeRef.current = null

      const hpMultiplier = PVP_BATTLE_CONFIG.HP_MULTIPLIER
      setAttackerState({
        hp: battle.attackerStats.hp * hpMultiplier,
        maxHp: battle.attackerStats.hp * hpMultiplier,
        isHit: false,
        isAttacking: false,
        lastDamage: 0,
      })
      setDefenderState({
        hp: battle.defenderStats.hp * hpMultiplier,
        maxHp: battle.defenderStats.hp * hpMultiplier,
        isHit: false,
        isAttacking: false,
        lastDamage: 0,
      })
    }
  }, [battle?.id, isPlaying])

  // 메인 애니메이션 루프
  useEffect(() => {
    if (!battle || !isPlaying || showResult || isPaused) return
    if (battle.actions.length === 0) {
      setShowResult(true)
      return
    }

    const speedMultiplier = 1 // 배틀 속도 (1배속 = 실시간)
    let isCancelled = false

    const animate = (timestamp: number) => {
      if (isCancelled) return

      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const elapsed = (timestamp - startTimeRef.current) * speedMultiplier
      setElapsedTime(elapsed)

      // 현재 시간까지의 액션 처리
      // 이미 처리된 액션까지의 HP를 추적
      const hpMult = PVP_BATTLE_CONFIG.HP_MULTIPLIER
      let currentAttackerHp = battle.attackerStats.hp * hpMult
      let currentDefenderHp = battle.defenderStats.hp * hpMult

      // 이전에 처리된 액션들의 HP 반영
      for (let i = 0; i <= lastProcessedIndexRef.current && i < battle.actions.length; i++) {
        const action = battle.actions[i]
        if (action.type === 'attack') {
          if (action.actor === 'attacker') {
            currentDefenderHp = action.targetHpAfter
          } else {
            currentAttackerHp = action.targetHpAfter
          }
        }
      }

      // 새로운 액션 처리
      for (let i = lastProcessedIndexRef.current + 1; i < battle.actions.length; i++) {
        const action = battle.actions[i]
        if (action.timestamp <= elapsed) {
          lastProcessedIndexRef.current = i

          if (action.type === 'attack') {
            if (action.actor === 'attacker') {
              currentDefenderHp = action.targetHpAfter
              // 공격자가 공격
              setAttackerState(prev => ({ ...prev, isAttacking: true }))
              setDefenderState(prev => ({
                ...prev,
                hp: action.targetHpAfter,
                isHit: true,
                lastDamage: action.damage
              }))
              addFloatingDamageRef.current('defender', action.damage, action.isCrit)

              // 로그 추가
              setRecentLogs(prev => [
                `${battle.attackerName}: ${action.damage}${action.isCrit ? ' 치명타!' : ''}`,
                ...prev.slice(0, 4)
              ])

              // 애니메이션 리셋
              setTimeout(() => {
                setAttackerState(prev => ({ ...prev, isAttacking: false }))
                setDefenderState(prev => ({ ...prev, isHit: false }))
              }, 150)
            } else {
              currentAttackerHp = action.targetHpAfter
              // 방어자가 공격
              setDefenderState(prev => ({ ...prev, isAttacking: true }))
              setAttackerState(prev => ({
                ...prev,
                hp: action.targetHpAfter,
                isHit: true,
                lastDamage: action.damage
              }))
              addFloatingDamageRef.current('attacker', action.damage, action.isCrit)

              setRecentLogs(prev => [
                `${battle.defenderName}: ${action.damage}${action.isCrit ? ' 치명타!' : ''}`,
                ...prev.slice(0, 4)
              ])

              setTimeout(() => {
                setDefenderState(prev => ({ ...prev, isAttacking: false }))
                setAttackerState(prev => ({ ...prev, isHit: false }))
              }, 150)
            }
          } else if (action.type === 'effect' && action.cardUsed) {
            setRecentLogs(prev => [
              `${action.cardUsed!.emoji} ${action.description}`,
              ...prev.slice(0, 4)
            ])
          }
        } else {
          break
        }
      }

      // 배틀 종료 체크 - HP가 0이 되거나 15초가 지나면 종료
      const maxDuration = PVP_BATTLE_CONFIG.BATTLE_DURATION
      const battleEnded =
        currentAttackerHp <= 0 ||
        currentDefenderHp <= 0 ||
        elapsed >= maxDuration

      if (battleEnded) {
        // 최종 HP 설정 (배율 적용된 값)
        const finalAttackerHp = Math.max(0, currentAttackerHp)
        const finalDefenderHp = Math.max(0, currentDefenderHp)
        setAttackerState(prev => ({ ...prev, hp: finalAttackerHp }))
        setDefenderState(prev => ({ ...prev, hp: finalDefenderHp }))

        setTimeout(() => {
          setShowResult(true)
        }, 500)
        return
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      isCancelled = true
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.id, isPlaying, showResult, isPaused])

  if (!battle) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  const handleClaimReward = () => {
    if (!rewardClaimed) {
      onClaimReward(battle.attackerReward)
      setRewardClaimed(true)
    }
    onClose()
  }

  const handleSkip = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    setShowResult(true)
  }

  // 결과 화면
  if (showResult) {
    const isWin = battle.result === 'attacker_win'
    const isLose = battle.result === 'defender_win'

    return (
      <div className="space-y-4 animate-fade-in">
        {/* 결과 헤더 */}
        <div className={`text-center py-8 rounded-xl ${
          isWin ? 'bg-gradient-to-b from-green-900/50 to-green-900/20'
          : isLose ? 'bg-gradient-to-b from-red-900/50 to-red-900/20'
          : 'bg-gradient-to-b from-gray-700/50 to-gray-700/20'
        }`}>
          <div className={`text-5xl font-bold mb-3 ${
            isWin ? 'text-green-400' : isLose ? 'text-red-400' : 'text-gray-400'
          }`}>
            {isWin && '승리!'}
            {isLose && '패배...'}
            {battle.result === 'draw' && '무승부'}
          </div>
          <p className="text-gray-300 text-lg">
            HP {battle.attackerFinalHp} vs {battle.defenderFinalHp}
          </p>
          <div className="flex justify-center gap-6 mt-3 text-sm text-gray-400">
            <span>내 공격: {battle.attackerAttackCount}회</span>
            <span>상대 공격: {battle.defenderAttackCount}회</span>
          </div>
        </div>

        {/* 보상 */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">획득 골드</p>
              <p className="text-yellow-400 font-bold text-2xl">
                +{battle.attackerReward.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">레이팅 변동</p>
              <p className={`font-bold text-2xl ${
                battle.attackerRatingChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {battle.attackerRatingChange >= 0 ? '+' : ''}{battle.attackerRatingChange}
              </p>
            </div>
          </div>
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={handleClaimReward}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform shadow-lg"
        >
          {rewardClaimed ? '확인' : '보상 받기'}
        </button>
      </div>
    )
  }

  // 진행 중 화면
  const maxDuration = PVP_BATTLE_CONFIG.BATTLE_DURATION
  const progress = (elapsedTime / maxDuration) * 100
  const timeRemaining = Math.max(0, (maxDuration - elapsedTime) / 1000)

  return (
    <div className="space-y-4">
      {/* 타이머 */}
      <div className="text-center">
        <span className="text-2xl font-bold text-yellow-400">
          {timeRemaining.toFixed(1)}s
        </span>
      </div>

      {/* 배틀 아레나 */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-4 relative overflow-hidden">
        {/* 배경 이펙트 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500 rounded-full blur-3xl" />
        </div>

        {/* 캐릭터들 */}
        <div className="relative flex items-start justify-between gap-8">
          <BattleCharacter
            name={battle.attackerName}
            state={attackerState}
            isLeft={true}
            floatingDamages={attackerFloatingDamages}
            attackSpeed={battle.attackerStats.attackSpeed}
            icon={<GiCrossedSwords className="text-white" />}
            gradientFrom="from-blue-500"
            gradientTo="to-purple-600"
          />

          {/* VS */}
          <div className="flex flex-col items-center justify-center pt-6">
            <div className="text-3xl font-bold text-yellow-400 animate-pulse">VS</div>
          </div>

          <BattleCharacter
            name={battle.defenderName}
            state={defenderState}
            isLeft={false}
            floatingDamages={defenderFloatingDamages}
            attackSpeed={battle.defenderStats.attackSpeed}
            icon={<GiShield className="text-white" />}
            gradientFrom="from-red-500"
            gradientTo="to-orange-600"
          />
        </div>
      </div>

      {/* 실시간 로그 */}
      <div className="bg-gray-900/80 rounded-lg p-3 h-24 overflow-hidden">
        <div className="space-y-1">
          {recentLogs.map((log, i) => (
            <div
              key={i}
              className="text-sm transition-opacity duration-300"
              style={{ opacity: 1 - i * 0.2 }}
            >
              <span className="text-gray-300">{log}</span>
            </div>
          ))}
          {recentLogs.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-4">
              전투 시작...
            </div>
          )}
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-100"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      {/* 컨트롤 */}
      <div className="flex justify-center">
        <button
          onClick={handleSkip}
          className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
        >
          스킵 →
        </button>
      </div>
    </div>
  )
}
