/**
 * 수련의 숲 결과 화면
 *
 * 승리/실패 결과와 보상을 표시합니다.
 * 승리 시 자동으로 다음 층으로 진행합니다.
 */

import { useState, useEffect, useCallback } from 'react'
import type { TowerBattleResult } from '../../types/tower'
import { TOWER_CONFIG } from '../../types/tower'
import { GiTwoCoins, GiTrophy, GiCrossedSwords, GiHealthNormal } from 'react-icons/gi'
import { FaArrowRight, FaRedo, FaDoorOpen, FaPause, FaPlay } from 'react-icons/fa'

// 자동 진행 대기 시간 (초)
const AUTO_CONTINUE_DELAY = 3

// =============================================
// 타입 정의
// =============================================

interface TowerResultProps {
  result: TowerBattleResult
  onContinue: () => void  // 다음 층 또는 층 선택으로
  onRetry: () => void     // 같은 층 재도전
  onExit: () => void      // 나가기
}

// =============================================
// 컴포넌트
// =============================================

export function TowerResult({
  result,
  onContinue,
  onRetry,
  onExit,
}: TowerResultProps) {
  const { success, floor, timeRemaining, rewards, isNewRecord, isFirstMilestone } = result

  // 클리어 시간 계산
  const clearTime = (TOWER_CONFIG.TIME_LIMIT - timeRemaining) / 1000

  // 자동 진행 카운트다운 상태
  const [countdown, setCountdown] = useState(AUTO_CONTINUE_DELAY)
  const [isPaused, setIsPaused] = useState(false)

  // 자동 진행 토글
  const toggleAutoContinue = useCallback(() => {
    setIsPaused(prev => !prev)
  }, [])

  // 자동 진행 타이머 (승리 시에만)
  useEffect(() => {
    if (!success || isPaused) return

    if (countdown <= 0) {
      onContinue()
      return
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [success, countdown, isPaused, onContinue])

  return (
    <div className="space-y-4">
      {/* 결과 헤더 */}
      <div
        className={`rounded-xl p-6 text-center ${
          success
            ? 'bg-gradient-to-br from-emerald-900/50 to-green-900/50 border border-emerald-500/50'
            : 'bg-gradient-to-br from-red-900/50 to-rose-900/50 border border-red-500/50'
        }`}
      >
        {/* 아이콘 */}
        <div className={`text-6xl mb-4 ${success ? 'animate-bounce' : ''}`}>
          {success ? '🎉' : '💀'}
        </div>

        {/* 결과 텍스트 */}
        <h2 className={`text-2xl font-bold mb-2 ${success ? 'text-emerald-400' : 'text-red-400'}`}>
          {success ? '클리어!' : '실패...'}
        </h2>

        <p className="text-gray-300">
          {floor}층 {success ? '돌파 성공' : '도전 실패'}
        </p>

        {/* 클리어 시간 (성공 시) */}
        {success && (
          <div className="mt-3 inline-flex items-center gap-2 bg-black/30 rounded-lg px-4 py-2">
            <span className="text-gray-400">클리어 시간</span>
            <span className="text-yellow-400 font-bold">{clearTime.toFixed(1)}초</span>
          </div>
        )}

        {/* 기록 갱신 배지 */}
        {isNewRecord && (
          <div className="mt-3 inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 rounded-lg px-4 py-2">
            <GiTrophy className="text-yellow-400" />
            <span className="text-purple-300 font-bold">🏆 최고 기록 갱신!</span>
          </div>
        )}

        {/* 마일스톤 클리어 배지 */}
        {isFirstMilestone && (
          <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg px-4 py-2">
            <span className="text-emerald-300 font-bold">⭐ {floor}층 최초 클리어!</span>
          </div>
        )}
      </div>

      {/* 배틀 통계 */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <GiCrossedSwords />
          배틀 통계
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
              <GiCrossedSwords className="text-sm" />
              <span className="text-xs">내 총 데미지</span>
            </div>
            <p className="text-lg font-bold text-white">
              {result.playerDamageDealt.toLocaleString()}
            </p>
          </div>

          <div className="text-center p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
              <GiHealthNormal className="text-sm" />
              <span className="text-xs">받은 데미지</span>
            </div>
            <p className="text-lg font-bold text-white">
              {result.enemyDamageDealt.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 보상 (성공 시) */}
      {success && rewards.totalGold > 0 && (
        <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-xl p-4">
          <h3 className="text-sm text-yellow-400 mb-3 flex items-center gap-2">
            <GiTwoCoins />
            획득 보상
          </h3>

          <div className="space-y-2">
            {/* 기본 보상 */}
            <div className="flex items-center justify-between text-gray-300">
              <span>클리어 보상</span>
              <span className="text-yellow-400">+{rewards.baseGold.toLocaleString()} G</span>
            </div>

            {/* 마일스톤 보너스 */}
            {rewards.milestoneBonus > 0 && (
              <div className="flex items-center justify-between text-emerald-400">
                <span className="flex items-center gap-1">
                  ⭐ {floor}층 최초 클리어
                </span>
                <span>+{rewards.milestoneBonus.toLocaleString()} G</span>
              </div>
            )}

            {/* 기록 갱신 보너스 */}
            {rewards.recordBonus > 0 && (
              <div className="flex items-center justify-between text-purple-400">
                <span className="flex items-center gap-1">
                  🏆 기록 갱신 보너스
                </span>
                <span>+{rewards.recordBonus.toLocaleString()} G</span>
              </div>
            )}

            {/* 총 보상 */}
            <div className="border-t border-yellow-500/30 pt-2 mt-2 flex items-center justify-between">
              <span className="font-bold text-white">총 획득</span>
              <span className="text-xl font-bold text-yellow-400">
                +{rewards.totalGold.toLocaleString()} G
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 버튼 그룹 */}
      <div className="space-y-2">
        {success ? (
          <>
            {/* 자동 진행 표시 */}
            <div className="flex items-center justify-center gap-3 py-2">
              <span className="text-gray-400 text-sm">
                {isPaused ? '자동 진행 일시정지' : `${countdown}초 후 자동 진행`}
              </span>
              <button
                onClick={toggleAutoContinue}
                className={`p-2 rounded-full transition-colors ${
                  isPaused
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-yellow-600 hover:bg-yellow-500'
                }`}
                title={isPaused ? '재개' : '일시정지'}
              >
                {isPaused ? <FaPlay className="text-sm" /> : <FaPause className="text-sm" />}
              </button>
            </div>

            {/* 다음 층 도전 */}
            <button
              onClick={onContinue}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
            >
              <FaArrowRight />
              {floor + 1}층 도전하기
            </button>

            {/* 층 선택으로 */}
            <button
              onClick={() => {
                setIsPaused(true) // 나가기 시 자동 진행 멈춤
                onExit()
              }}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <FaDoorOpen />
              층 선택으로
            </button>
          </>
        ) : (
          <>
            {/* 재도전 */}
            <button
              onClick={onRetry}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
            >
              <FaRedo />
              {floor}층 재도전
            </button>

            {/* 층 선택으로 */}
            <button
              onClick={onExit}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <FaDoorOpen />
              층 선택으로
            </button>
          </>
        )}
      </div>
    </div>
  )
}
