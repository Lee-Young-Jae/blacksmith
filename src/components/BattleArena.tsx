import { useEffect, useState } from 'react'
import type { BattleMatch } from '../types/battle'

interface BattleArenaProps {
  battle: BattleMatch
  isMatchmaking: boolean
  isFighting: boolean
  isFinished: boolean
  onClose: () => void
  onClaimReward: (reward: number) => void
}

export function BattleArena({
  battle,
  isMatchmaking,
  isFighting,
  isFinished,
  onClose,
  onClaimReward,
}: BattleArenaProps) {
  const [showDamage, setShowDamage] = useState(false)
  const [rewardClaimed, setRewardClaimed] = useState(false)

  useEffect(() => {
    if (isFinished) {
      setTimeout(() => setShowDamage(true), 500)
    }
  }, [isFinished])

  const handleClaimReward = () => {
    // 보상이 있으면 지급 (패배해도 참여 보상)
    if (!rewardClaimed && battle.goldReward > 0) {
      onClaimReward(battle.goldReward)
      setRewardClaimed(true)
    }
    onClose()
  }

  // 매칭 중
  if (isMatchmaking) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-lg">
        <div className="flex flex-col items-center gap-6">
          <h3 className="text-xl font-bold text-white">상대를 찾는 중...</h3>
          <div className="w-16 h-16 border-4 border-gray-600 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const { player, opponent, result, goldReward } = battle

  return (
    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg">
      {/* 제목 */}
      <h3 className="text-xl font-bold text-white text-center mb-6">
        {isFighting ? '⚔️ 대결 중...' : '대결 결과'}
      </h3>

      {/* VS 화면 */}
      <div className="flex items-center justify-between mb-6">
        {/* 플레이어 */}
        <div className={`flex-1 text-center p-4 rounded-lg ${
          isFinished && result === 'win' ? 'bg-green-900/30 ring-2 ring-green-500' : 'bg-gray-700/50'
        }`}>
          <span className="text-4xl">{player.weapon.weaponType.emoji}</span>
          <p className="text-white font-bold mt-2">{player.name}</p>
          <p className="text-gray-400 text-sm">+{player.weapon.starLevel}성</p>
          <p className="text-yellow-400 font-bold mt-1">{player.baseAttack}</p>
          {showDamage && (
            <p className={`text-lg font-bold mt-2 animate-bounce ${
              result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-red-400' : 'text-gray-400'
            }`}>
              ⚡ {player.finalDamage}
            </p>
          )}
        </div>

        {/* VS */}
        <div className={`mx-4 text-2xl font-bold ${isFighting ? 'animate-pulse text-yellow-400' : 'text-gray-500'}`}>
          VS
        </div>

        {/* 상대 */}
        <div className={`flex-1 text-center p-4 rounded-lg ${
          isFinished && result === 'lose' ? 'bg-red-900/30 ring-2 ring-red-500' : 'bg-gray-700/50'
        }`}>
          <span className="text-4xl">{opponent.weapon.weaponType.emoji}</span>
          <p className="text-white font-bold mt-2">{opponent.name}</p>
          <p className="text-gray-400 text-sm">+{opponent.weapon.starLevel}성</p>
          <p className="text-yellow-400 font-bold mt-1">{opponent.baseAttack}</p>
          {showDamage && (
            <p className={`text-lg font-bold mt-2 animate-bounce ${
              result === 'lose' ? 'text-green-400' : result === 'win' ? 'text-red-400' : 'text-gray-400'
            }`}>
              ⚡ {opponent.finalDamage}
            </p>
          )}
        </div>
      </div>

      {/* 대결 중 애니메이션 */}
      {isFighting && (
        <div className="flex justify-center my-8">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 결과 표시 */}
      {isFinished && result && (
        <div className="text-center">
          <div className={`text-4xl font-bold mb-4 ${
            result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {result === 'win' && '🎉 승리!'}
            {result === 'lose' && '😢 패배...'}
            {result === 'draw' && '🤝 무승부'}
          </div>

          <p className={`font-bold text-xl mb-2 ${
            result === 'win' ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            🪙 +{goldReward.toLocaleString()} 골드
          </p>
          {result === 'lose' && (
            <p className="text-gray-500 text-sm mb-4">참여 보상</p>
          )}
          {result === 'draw' && (
            <p className="text-gray-500 text-sm mb-4">무승부 보상</p>
          )}

          <button
            onClick={handleClaimReward}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-transform"
          >
            {!rewardClaimed ? '보상 받기' : '확인'}
          </button>
        </div>
      )}
    </div>
  )
}
