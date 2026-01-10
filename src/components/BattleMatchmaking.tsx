import type { AIDifficulty } from "../types/battle";
import { AI_DIFFICULTY_CONFIG } from "../types/battle";
import type { CharacterStats } from "../types/stats";
import { calculateCombatPower, formatNumberString } from "../types/stats";
import {
  GiSwordBrandish,
  GiShield,
  GiBullseye,
  GiFlame,
  GiDaggers,
  GiHealthNormal,
  GiTwoCoins,
  GiLightBulb,
  GiAnvilImpact,
} from "react-icons/gi";
import { FaClock } from "react-icons/fa";

interface BattleMatchmakingProps {
  playerStats: CharacterStats;
  onSelectDifficulty: (difficulty: AIDifficulty) => void;
  getExpectedReward: (difficulty: AIDifficulty) => {
    win: number;
    lose: number;
    draw: number;
  };
  battlesRemaining: number;
  maxBattles: number;
}

const DIFFICULTIES: AIDifficulty[] = ["easy", "normal", "hard", "extreme"];

export function BattleMatchmaking({
  playerStats,
  onSelectDifficulty,
  getExpectedReward,
  battlesRemaining,
  maxBattles,
}: BattleMatchmakingProps) {
  const canBattle = battlesRemaining > 0;
  const combatPower = calculateCombatPower(playerStats);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-4 sm:p-6 lg:p-8 border border-amber-700/30 shadow-2xl flex-1">
        {/* 헤더 */}
        <div className="text-center mb-4 sm:mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-amber-100 mb-1 flex items-center justify-center gap-2">
            <GiAnvilImpact className="text-amber-400 text-lg sm:text-xl" />
            AI 대결
          </h3>
          <p className="text-amber-200/60 text-xs sm:text-sm">
            난이도를 선택하고 대결을 시작하세요
          </p>
        </div>

        {/* 대결 횟수 표시 */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-stone-800/60 to-stone-900/60 rounded-xl border border-amber-700/30">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-amber-200/80 text-xs sm:text-sm font-medium">
              오늘 남은 대결
            </span>
            <span
              className={`font-bold text-base sm:text-lg ${
                canBattle ? "text-green-400" : "text-red-400"
              }`}
            >
              {battlesRemaining}/{maxBattles}
            </span>
          </div>
          <div className="h-2.5 sm:h-3 bg-stone-700 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                canBattle
                  ? "bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 shadow-lg shadow-green-500/30"
                  : "bg-red-500"
              }`}
              style={{ width: `${(battlesRemaining / maxBattles) * 100}%` }}
            />
          </div>
        </div>

        {!canBattle && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-red-900/40 to-rose-900/30 border-2 border-red-500/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FaClock className="text-red-300 text-lg sm:text-xl" />
              <p className="text-red-300 font-bold text-xs sm:text-sm">
                대결 횟수 소진
              </p>
            </div>
            <p className="text-red-400 text-xs sm:text-sm">
              오늘 대결 횟수를 모두 사용했습니다.
              <br />
              내일 다시 도전해주세요!
            </p>
          </div>
        )}

        {/* 내 스탯 정보 */}
        <div className="mb-4 sm:mb-6 p-4 sm:p-5 bg-gradient-to-br from-amber-900/20 to-stone-900/40 rounded-xl border border-amber-700/30">
          <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-amber-700/30">
            <span className="text-amber-200/80 text-xs sm:text-sm font-medium">
              내 전투력
            </span>
            <span className="text-amber-400 font-bold text-lg sm:text-xl">
              {combatPower.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between p-2 sm:p-2.5 bg-stone-800/50 rounded-lg">
              <span className="text-amber-100/80 flex items-center gap-1 sm:gap-1.5">
                <GiSwordBrandish className="text-red-400 text-sm sm:text-base" />
                <span className="truncate">공격력</span>
              </span>
              <span className="text-red-400 font-semibold text-xs sm:text-sm ml-1">
                {playerStats.attack.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-2.5 bg-stone-800/50 rounded-lg">
              <span className="text-amber-100/80 flex items-center gap-1 sm:gap-1.5">
                <GiShield className="text-blue-400 text-sm sm:text-base" />
                <span className="truncate">방어력</span>
              </span>
              <span className="text-blue-400 font-semibold text-xs sm:text-sm ml-1">
                {playerStats.defense.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-2.5 bg-stone-800/50 rounded-lg">
              <span className="text-amber-100/80 flex items-center gap-1 sm:gap-1.5">
                <GiBullseye className="text-yellow-400 text-sm sm:text-base" />
                <span className="truncate">치명타</span>
              </span>
              <span className="text-yellow-400 font-semibold text-xs sm:text-sm ml-1">
                {formatNumberString(playerStats.critRate)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-2.5 bg-stone-800/50 rounded-lg">
              <span className="text-amber-100/80 flex items-center gap-1 sm:gap-1.5">
                <GiFlame className="text-orange-400 text-sm sm:text-base" />
                <span className="truncate">치명타데미지</span>
              </span>
              <span className="text-orange-400 font-semibold text-xs sm:text-sm ml-1">
                {formatNumberString(playerStats.critDamage)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-2.5 bg-stone-800/50 rounded-lg">
              <span className="text-amber-100/80 flex items-center gap-1 sm:gap-1.5">
                <GiDaggers className="text-purple-400 text-sm sm:text-base" />
                <span className="truncate">관통력</span>
              </span>
              <span className="text-purple-400 font-semibold text-xs sm:text-sm ml-1">
                {formatNumberString(playerStats.penetration)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-2.5 bg-stone-800/50 rounded-lg">
              <span className="text-amber-100/80 flex items-center gap-1 sm:gap-1.5">
                <GiHealthNormal className="text-green-400 text-sm sm:text-base" />
                <span className="truncate">HP</span>
              </span>
              <span className="text-green-400 font-semibold text-xs sm:text-sm ml-1">
                {playerStats.hp.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 난이도 선택 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {DIFFICULTIES.map((difficulty) => {
            const config = AI_DIFFICULTY_CONFIG[difficulty];
            const reward = getExpectedReward(difficulty);

            const difficultyStyles = {
              easy: "bg-gradient-to-br from-green-900/40 to-emerald-900/30 border-green-500/40 hover:border-green-400/60 hover:shadow-lg hover:shadow-green-500/20",
              normal:
                "bg-gradient-to-br from-blue-900/40 to-cyan-900/30 border-blue-500/40 hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/20",
              hard: "bg-gradient-to-br from-orange-900/40 to-amber-900/30 border-orange-500/40 hover:border-orange-400/60 hover:shadow-lg hover:shadow-orange-500/20",
              extreme:
                "bg-gradient-to-br from-red-900/40 to-rose-900/30 border-red-500/40 hover:border-red-400/60 hover:shadow-lg hover:shadow-red-500/20",
            };

            return (
              <button
                key={difficulty}
                onClick={() => onSelectDifficulty(difficulty)}
                disabled={!canBattle}
                className={`w-full p-3 sm:p-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 ${
                  canBattle ? "hover:scale-[1.02] hover:-translate-y-0.5" : ""
                } ${difficultyStyles[difficulty]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="text-2xl sm:text-3xl relative flex-shrink-0">
                      <span>{config.emoji}</span>
                      {canBattle && (
                        <div className="absolute inset-0 bg-current opacity-20 blur-lg" />
                      )}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-amber-100 font-bold text-sm sm:text-base truncate">
                        {config.name}
                      </p>
                      <p className="text-amber-200/50 text-xs mt-0.5 truncate">
                        공격력 x{config.multiplier}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 mb-1">
                      <GiTwoCoins className="text-green-400 text-sm sm:text-base" />
                      <span className="text-green-400 font-bold text-xs sm:text-sm">
                        {reward.win.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-red-400 text-[10px] sm:text-xs">
                        패:
                      </span>
                      <GiTwoCoins className="text-red-400 text-[10px] sm:text-xs" />
                      <span className="text-red-400 text-[10px] sm:text-xs">
                        {reward.lose.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-stone-800/50 rounded-lg p-2.5 sm:p-3 border border-amber-700/30">
          <div className="flex items-start gap-2 text-amber-200/60 text-[10px] sm:text-xs leading-relaxed">
            <GiLightBulb className="text-amber-400 mt-0.5 flex-shrink-0 text-sm sm:text-base" />
            <div>
              <p>공격력 + 30% 랜덤 요소로 승패 결정</p>
              <p className="mt-1">패배해도 참여 보상을 받습니다</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
