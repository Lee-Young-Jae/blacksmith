import type { UserWeapon } from '../types/weapon'
import { getWeaponName } from '../types/weapon'
import type { AIDifficulty } from '../types/battle'
import { AI_DIFFICULTY_CONFIG } from '../types/battle'

interface BattleMatchmakingProps {
  weapon: UserWeapon
  onSelectDifficulty: (difficulty: AIDifficulty) => void
  getExpectedReward: (difficulty: AIDifficulty) => { win: number; lose: number; draw: number }
  battlesRemaining: number
  maxBattles: number
}

const DIFFICULTIES: AIDifficulty[] = ['easy', 'normal', 'hard', 'extreme']

export function BattleMatchmaking({
  weapon,
  onSelectDifficulty,
  getExpectedReward,
  battlesRemaining,
  maxBattles,
}: BattleMatchmakingProps) {
  const canBattle = battlesRemaining > 0

  return (
    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
      <h3 className="text-xl font-bold text-white text-center mb-2">AI 대결</h3>

      {/* 대결 횟수 표시 */}
      <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">오늘 남은 대결</span>
          <span className={`font-bold ${canBattle ? 'text-green-400' : 'text-red-400'}`}>
            {battlesRemaining}/{maxBattles}
          </span>
        </div>
        <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${canBattle ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-red-500'}`}
            style={{ width: `${(battlesRemaining / maxBattles) * 100}%` }}
          />
        </div>
      </div>

      {!canBattle && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm text-center">
            오늘 대결 횟수를 모두 사용했습니다.<br />
            내일 다시 도전해주세요!
          </p>
        </div>
      )}

      <p className="text-gray-400 text-center text-sm mb-6">
        난이도를 선택하고 대결을 시작하세요
      </p>

      {/* 내 무기 정보 */}
      <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{weapon.weaponType.emoji}</span>
            <div>
              <p className="text-white font-bold">{getWeaponName(weapon.weaponType, weapon.starLevel)}</p>
              <p className="text-gray-400 text-sm">+{weapon.starLevel}성</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-yellow-400 font-bold">{weapon.totalAttack}</p>
            <p className="text-gray-500 text-xs">공격력</p>
          </div>
        </div>
      </div>

      {/* 난이도 선택 */}
      <div className="space-y-3">
        {DIFFICULTIES.map(difficulty => {
          const config = AI_DIFFICULTY_CONFIG[difficulty]
          const reward = getExpectedReward(difficulty)

          return (
            <button
              key={difficulty}
              onClick={() => onSelectDifficulty(difficulty)}
              disabled={!canBattle}
              className={`w-full p-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${canBattle ? 'hover:scale-[1.02]' : ''} ${
                difficulty === 'easy'
                  ? 'bg-green-900/30 hover:bg-green-900/50 border border-green-500/30'
                  : difficulty === 'normal'
                    ? 'bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30'
                    : difficulty === 'hard'
                      ? 'bg-orange-900/30 hover:bg-orange-900/50 border border-orange-500/30'
                      : 'bg-red-900/30 hover:bg-red-900/50 border border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.emoji}</span>
                  <div className="text-left">
                    <p className="text-white font-bold">{config.name}</p>
                    <p className="text-gray-400 text-xs">
                      상대 공격력 x{config.multiplier}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold text-sm">
                    승: 🪙 {reward.win.toLocaleString()}
                  </p>
                  <p className="text-red-400 text-xs">
                    패: 🪙 {reward.lose.toLocaleString()}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-gray-500 text-xs text-center mt-4">
        * 공격력 + 30% 랜덤 요소로 승패 결정<br />
        * 패배해도 참여 보상을 받습니다
      </p>
    </div>
  )
}
