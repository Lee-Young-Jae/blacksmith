/**
 * PvP Battle Replay Component
 *
 * 다회전 배틀의 진행 과정을 애니메이션으로 보여줍니다.
 */

import { useState, useEffect } from 'react'
import type { PvPBattle, BattleRound } from '../../types/pvpBattle'

// =============================================
// 타입 정의
// =============================================

interface PvPBattleReplayProps {
  battle: PvPBattle | null
  isPlaying: boolean
  onClose: () => void
  onClaimReward: (amount: number) => void
}

// =============================================
// HP 바 컴포넌트
// =============================================

function HpBar({
  current,
  max,
}: {
  current: number
  max: number
}) {
  const percent = Math.max(0, (current / max) * 100)
  const color = percent > 50 ? 'bg-green-500' : percent > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">HP</span>
        <span className={`font-medium ${percent > 25 ? 'text-white' : 'text-red-400'}`}>
          {current} / {max}
        </span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// =============================================
// 라운드 로그 컴포넌트
// =============================================

function RoundLog({ round, attackerName, defenderName }: {
  round: BattleRound
  attackerName: string
  defenderName: string
}) {
  return (
    <div className="bg-gray-700/30 rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-yellow-400">라운드 {round.round}</span>
        <span className="text-gray-500 text-xs">
          선공: {round.firstAttacker === 'attacker' ? attackerName : defenderName}
        </span>
      </div>

      <div className="space-y-1">
        {/* 공격자 행동 */}
        <div className="flex items-center gap-2">
          <span className="text-blue-400">{attackerName}</span>
          <span className="text-gray-400">→</span>
          <span className={round.attackerAction.isCrit ? 'text-orange-400 font-bold' : 'text-red-400'}>
            {round.attackerAction.damage} 데미지
            {round.attackerAction.isCrit && ' (치명타!)'}
          </span>
          {round.attackerAction.cardUsed && (
            <span className="text-purple-400 text-xs">
              [{round.attackerAction.cardUsed.name}]
            </span>
          )}
        </div>

        {/* 방어자 행동 */}
        <div className="flex items-center gap-2">
          <span className="text-red-400">{defenderName}</span>
          <span className="text-gray-400">→</span>
          <span className={round.defenderAction.isCrit ? 'text-orange-400 font-bold' : 'text-red-400'}>
            {round.defenderAction.damage} 데미지
            {round.defenderAction.isCrit && ' (치명타!)'}
          </span>
          {round.defenderAction.cardUsed && (
            <span className="text-purple-400 text-xs">
              [{round.defenderAction.cardUsed.name}]
            </span>
          )}
        </div>

        {/* 특수 이벤트 */}
        {round.events.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {round.events.map((event, i) => (
              <div key={i} className="text-xs text-yellow-300">
                {event.source === 'attacker' ? attackerName : defenderName}: {event.description}
              </div>
            ))}
          </div>
        )}
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
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [rewardClaimed, setRewardClaimed] = useState(false)

  // 새로운 배틀이 시작되면 상태 초기화
  useEffect(() => {
    if (battle && isPlaying) {
      // 새 배틀 시작 시 상태 완전 초기화
      setCurrentRoundIndex(0)
      setShowResult(false)
      setRewardClaimed(false)
    }
  }, [battle?.id, isPlaying])

  // 자동 재생
  useEffect(() => {
    if (!battle || !isPlaying) return

    if (currentRoundIndex < battle.rounds.length) {
      const timer = setTimeout(() => {
        setCurrentRoundIndex(prev => prev + 1)
      }, 2500) // 2.5초마다 다음 라운드

      return () => clearTimeout(timer)
    } else {
      // 모든 라운드 완료
      const timer = setTimeout(() => {
        setShowResult(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [battle, isPlaying, currentRoundIndex])

  if (!battle) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  const currentRound = battle.rounds[currentRoundIndex - 1]
  const attackerHp = currentRound?.attackerHpAfter ?? battle.attackerStats.hp
  const defenderHp = currentRound?.defenderHpAfter ?? battle.defenderStats.hp

  const handleClaimReward = () => {
    if (!rewardClaimed) {
      onClaimReward(battle.attackerReward)
      setRewardClaimed(true)
    }
    onClose()
  }

  // 결과 화면 (showResult가 true일 때만 표시)
  if (showResult) {
    const isWin = battle.result === 'attacker_win'
    const isLose = battle.result === 'defender_win'

    return (
      <div className="space-y-4">
        {/* 결과 헤더 */}
        <div className={`text-center py-6 rounded-lg ${
          isWin ? 'bg-green-900/30' : isLose ? 'bg-red-900/30' : 'bg-gray-700/30'
        }`}>
          <div className={`text-4xl font-bold mb-2 ${
            isWin ? 'text-green-400' : isLose ? 'text-red-400' : 'text-gray-400'
          }`}>
            {isWin && '승리!'}
            {isLose && '패배...'}
            {battle.result === 'draw' && '무승부'}
          </div>
          <p className="text-gray-400">
            {battle.totalRounds}라운드 | HP {battle.attackerFinalHp} vs {battle.defenderFinalHp}
          </p>
        </div>

        {/* 보상 */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">획득 골드</p>
              <p className="text-yellow-400 font-bold text-xl">
                +{battle.attackerReward.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">레이팅 변동</p>
              <p className={`font-bold text-xl ${
                battle.attackerRatingChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {battle.attackerRatingChange >= 0 ? '+' : ''}{battle.attackerRatingChange}
              </p>
            </div>
          </div>
        </div>

        {/* 라운드 로그 */}
        <div className="max-h-48 overflow-y-auto space-y-2">
          {battle.rounds.map((round, i) => (
            <RoundLog
              key={i}
              round={round}
              attackerName={battle.attackerName}
              defenderName={battle.defenderName}
            />
          ))}
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={handleClaimReward}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-lg hover:scale-105 transition-transform"
        >
          {rewardClaimed ? '확인' : '보상 받기'}
        </button>
      </div>
    )
  }

  // 진행 중 화면
  return (
    <div className="space-y-4">
      {/* VS 헤더 */}
      <div className="flex items-center justify-between">
        {/* 공격자 */}
        <div className="flex-1 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-2">
            <span className="text-2xl">⚔️</span>
          </div>
          <p className="text-white font-bold text-sm">{battle.attackerName}</p>
          <HpBar
            current={attackerHp}
            max={battle.attackerStats.hp}
          />
        </div>

        {/* VS */}
        <div className="px-4">
          <div className="text-2xl font-bold text-yellow-400 animate-pulse">VS</div>
        </div>

        {/* 방어자 */}
        <div className="flex-1 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-2">
            <span className="text-2xl">🛡️</span>
          </div>
          <p className="text-white font-bold text-sm">{battle.defenderName}</p>
          <HpBar
            current={defenderHp}
            max={battle.defenderStats.hp}
          />
        </div>
      </div>

      {/* 스탯 비교 */}
      <div className="bg-gray-700/30 rounded-lg p-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* 나 */}
          <div className="bg-blue-900/30 rounded p-2">
            <p className="text-blue-400 font-bold text-center mb-1">나</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <span className="text-red-400">{battle.attackerStats.attack}</span>
                <p className="text-[9px] text-gray-500">공격</p>
              </div>
              <div>
                <span className="text-blue-400">{battle.attackerStats.defense}</span>
                <p className="text-[9px] text-gray-500">방어</p>
              </div>
              <div>
                <span className="text-yellow-400">{battle.attackerStats.critRate}%</span>
                <p className="text-[9px] text-gray-500">치확</p>
              </div>
            </div>
          </div>
          {/* 적 */}
          <div className="bg-red-900/30 rounded p-2">
            <p className="text-red-400 font-bold text-center mb-1">적</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <span className="text-red-400">{battle.defenderStats.attack}</span>
                <p className="text-[9px] text-gray-500">공격</p>
              </div>
              <div>
                <span className="text-blue-400">{battle.defenderStats.defense}</span>
                <p className="text-[9px] text-gray-500">방어</p>
              </div>
              <div>
                <span className="text-yellow-400">{battle.defenderStats.critRate}%</span>
                <p className="text-[9px] text-gray-500">치확</p>
              </div>
            </div>
          </div>
        </div>
        {/* 사용 카드 표시 */}
        {(battle.attackerCards.length > 0 || battle.defenderCards.length > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-600/50 flex justify-between text-[10px]">
            <div className="text-blue-300">
              카드: {battle.attackerCards.length > 0
                ? battle.attackerCards.map(c => c.emoji).join(' ')
                : '없음'}
            </div>
            <div className="text-red-300">
              카드: {battle.defenderCards.length > 0
                ? battle.defenderCards.map(c => c.emoji).join(' ')
                : '없음'}
            </div>
          </div>
        )}
      </div>

      {/* 라운드 카운터 */}
      <div className="text-center">
        <span className="text-yellow-400 font-bold text-lg">
          라운드 {currentRoundIndex} / {battle.totalRounds}
        </span>
      </div>

      {/* 현재 라운드 */}
      {currentRound && (
        <div className="animate-fade-in">
          <RoundLog
            round={currentRound}
            attackerName={battle.attackerName}
            defenderName={battle.defenderName}
          />
        </div>
      )}

      {/* 진행 바 */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
          style={{ width: `${(currentRoundIndex / battle.totalRounds) * 100}%` }}
        />
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex justify-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <button
          onClick={() => setShowResult(true)}
          className="px-4 py-1 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600 transition-colors"
        >
          스킵 →
        </button>
      </div>
    </div>
  )
}
