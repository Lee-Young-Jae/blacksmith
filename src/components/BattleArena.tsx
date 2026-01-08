import { useEffect, useState } from "react";
import type { BattleMatch } from "../types/battle";
import type { CharacterStats } from "../types/stats";
import { WeaponImage } from "./WeaponImage";
import { getWeaponName } from "../types/weapon";
import {
  GiSwordBrandish,
  GiShield,
  GiBullseye,
  GiFlame,
  GiDaggers,
  GiLightningBow,
  GiTwoCoins,
  GiTrophy,
} from "react-icons/gi";
import { FaHandshake, FaSadTear } from "react-icons/fa";
import type { IconType } from "react-icons";

// 스탯 표시용 헬퍼
function StatLine({
  label,
  value,
  Icon,
  isPercent = false,
}: {
  label: string;
  value: number;
  Icon: IconType;
  isPercent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 py-1 sm:py-1.5 md:py-2">
      <span className="text-gray-300 flex items-center gap-1.5 sm:gap-2 md:gap-2.5 min-w-0 flex-1">
        <Icon className="text-sm sm:text-base md:text-lg shrink-0" />
        <span className="text-xs sm:text-sm md:text-base truncate pr-1 md:pr-2">
          {label}
        </span>
      </span>
      <span className="text-white font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap shrink-0 ml-2">
        {isPercent ? `${value}%` : value.toLocaleString()}
      </span>
    </div>
  );
}

// 플레이어/상대 스탯 패널
function StatsDisplay({ stats }: { stats: CharacterStats }) {
  return (
    <div className="w-full space-y-0 sm:space-y-0.5 md:space-y-1 mt-3 text-left bg-gray-800/30 rounded-lg p-2.5 sm:p-3 md:p-4 lg:p-3.5">
      <StatLine label="공격력" value={stats.attack} Icon={GiSwordBrandish} />
      <StatLine label="방어력" value={stats.defense} Icon={GiShield} />
      <StatLine
        label="치명타"
        value={stats.critRate}
        Icon={GiBullseye}
        isPercent
      />
      <StatLine
        label="치명타데미지"
        value={stats.critDamage}
        Icon={GiFlame}
        isPercent
      />
      <StatLine
        label="관통력"
        value={stats.penetration}
        Icon={GiDaggers}
        isPercent
      />
    </div>
  );
}

interface BattleArenaProps {
  battle: BattleMatch;
  isMatchmaking: boolean;
  isFighting: boolean;
  isFinished: boolean;
  onClose: () => void;
  onClaimReward: (reward: number) => void;
}

export function BattleArena({
  battle,
  isMatchmaking,
  isFighting,
  isFinished,
  onClose,
  onClaimReward,
}: BattleArenaProps) {
  const [showDamage, setShowDamage] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  useEffect(() => {
    if (isFinished) {
      setTimeout(() => setShowDamage(true), 500);
    }
  }, [isFinished]);

  const handleClaimReward = () => {
    // 보상이 있으면 지급 (패배해도 참여 보상)
    if (!rewardClaimed && battle.goldReward > 0) {
      onClaimReward(battle.goldReward);
      setRewardClaimed(true);
    }
    onClose();
  };

  // 매칭 중
  if (isMatchmaking) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl p-8 w-full max-w-2xl border border-gray-700/50 shadow-2xl">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <h3 className="text-2xl font-bold text-white mb-2">
              상대를 찾는 중...
            </h3>
            <div className="absolute -top-1 -left-1 w-full h-full bg-yellow-400/20 blur-xl rounded-full" />
          </div>
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gray-700 border-t-yellow-400 border-r-purple-400 rounded-full animate-spin" />
            <div
              className="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-blue-400 border-l-green-400 rounded-full animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">
            AI 상대를 생성하고 있습니다...
          </p>
        </div>
      </div>
    );
  }

  const { player, opponent, result, goldReward } = battle;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-700/50 shadow-2xl flex-1">
        {/* 제목 */}
        <div className="text-center mb-4 sm:mb-6">
          <h3
            className={`text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center gap-2 ${
              isFighting
                ? "text-yellow-400 animate-pulse"
                : isFinished && result === "win"
                ? "text-green-400"
                : isFinished && result === "lose"
                ? "text-red-400"
                : "text-white"
            }`}
          >
            {isFighting && <GiSwordBrandish className="text-lg sm:text-xl" />}
            {isFighting ? "대결 중..." : isFinished ? "대결 결과" : "대결 준비"}
          </h3>
          {isFighting && (
            <div className="flex justify-center gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* VS 화면 - 반응형 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 sm:gap-6 mb-6 items-start">
          {/* 플레이어 */}
          <div
            className={`p-4 sm:p-5 lg:p-6 rounded-xl transition-all duration-500 ${
              isFinished && result === "win"
                ? "bg-gradient-to-br from-green-900/40 to-emerald-900/30 ring-2 ring-green-500 shadow-lg shadow-green-500/20"
                : isFinished && result === "lose"
                ? "bg-gray-700/30 opacity-60"
                : "bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-500/30"
            }`}
          >
            <div className="flex flex-col items-center">
              {/* 무기 표시 */}
              <div className="mb-3 sm:mb-4 relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                <WeaponImage
                  weapon={player.weapon.weaponType}
                  level={player.weapon.starLevel}
                  size="lg"
                  showGlow={!player.weapon.isDestroyed}
                />
              </div>
              <p className="text-white font-bold text-base sm:text-lg mb-1">
                {player.name}
              </p>
              <p className="text-gray-400 text-xs mb-2 sm:mb-3 text-center">
                {getWeaponName(
                  player.weapon.weaponType,
                  player.weapon.starLevel
                )}{" "}
                {player.weapon.starLevel}성
              </p>
              <StatsDisplay stats={player.stats} />
              {showDamage && (
                <div className="mt-4 text-center w-full">
                  <div
                    className={`text-2xl font-bold mb-1 flex items-center justify-center gap-1 ${
                      result === "win"
                        ? "text-green-400"
                        : result === "lose"
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {player.isCrit && (
                      <GiFlame className="text-orange-400 animate-pulse text-xl" />
                    )}
                    <GiLightningBow className="text-lg" />
                    <span>{player.finalDamage.toLocaleString()}</span>
                  </div>
                  {player.isCrit && (
                    <p className="text-orange-400 text-xs font-bold animate-pulse mt-1">
                      치명타!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* VS - 모바일에서는 가로선으로, 데스크톱에서는 세로 */}
          <div className="lg:flex lg:items-center lg:justify-center">
            <div
              className={`hidden lg:block transition-all duration-300 ${
                isFighting ? "animate-pulse" : ""
              }`}
            >
              <div className="relative">
                <span
                  className={`text-3xl lg:text-4xl font-bold ${
                    isFighting
                      ? "text-yellow-400 drop-shadow-lg"
                      : isFinished && result === "win"
                      ? "text-green-400"
                      : isFinished && result === "lose"
                      ? "text-red-400"
                      : "text-gray-500"
                  }`}
                >
                  VS
                </span>
                {isFighting && (
                  <div className="absolute inset-0 bg-yellow-400/30 blur-xl animate-pulse" />
                )}
              </div>
            </div>
            {/* 모바일용 가로선 */}
            <div className="lg:hidden flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-gray-600" />
              <span
                className={`text-lg font-bold px-2 ${
                  isFighting
                    ? "text-yellow-400"
                    : isFinished && result === "win"
                    ? "text-green-400"
                    : isFinished && result === "lose"
                    ? "text-red-400"
                    : "text-gray-500"
                }`}
              >
                VS
              </span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-600 to-gray-600" />
            </div>
          </div>

          {/* 상대 */}
          <div
            className={`p-4 sm:p-5 lg:p-6 rounded-xl transition-all duration-500 ${
              isFinished && result === "lose"
                ? "bg-gradient-to-br from-red-900/40 to-rose-900/30 ring-2 ring-red-500 shadow-lg shadow-red-500/20"
                : isFinished && result === "win"
                ? "bg-gray-700/30 opacity-60"
                : "bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30"
            }`}
          >
            <div className="flex flex-col items-center">
              {/* 무기 표시 */}
              <div className="mb-3 sm:mb-4 relative">
                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                <WeaponImage
                  weapon={opponent.weapon.weaponType}
                  level={opponent.weapon.starLevel}
                  size="lg"
                  showGlow={!opponent.weapon.isDestroyed}
                />
              </div>
              <p className="text-white font-bold text-base sm:text-lg mb-1">
                {opponent.name}
              </p>
              <p className="text-gray-400 text-xs mb-2 sm:mb-3 text-center">
                {getWeaponName(
                  opponent.weapon.weaponType,
                  opponent.weapon.starLevel
                )}{" "}
                {opponent.weapon.starLevel}성
              </p>
              <StatsDisplay stats={opponent.stats} />
              {showDamage && (
                <div className="mt-4 text-center w-full">
                  <div
                    className={`text-2xl font-bold mb-1 flex items-center justify-center gap-1 ${
                      result === "lose"
                        ? "text-green-400"
                        : result === "win"
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {opponent.isCrit && (
                      <GiFlame className="text-orange-400 animate-pulse text-xl" />
                    )}
                    <GiLightningBow className="text-lg" />
                    <span>{opponent.finalDamage.toLocaleString()}</span>
                  </div>
                  {opponent.isCrit && (
                    <p className="text-orange-400 text-xs font-bold animate-pulse mt-1">
                      치명타!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 대결 중 애니메이션 */}
        {isFighting && (
          <div className="flex justify-center my-4 sm:my-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex gap-1.5 sm:gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-bounce shadow-lg"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full animate-pulse" />
              <div className="flex gap-1.5 sm:gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full animate-bounce shadow-lg"
                    style={{ animationDelay: `${i * 0.2 + 0.3}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 결과 표시 */}
        {isFinished && result && (
          <div className="text-center mt-4 sm:mt-6">
            <div
              className={`flex items-center justify-center gap-2 mb-4 ${
                result === "win"
                  ? "text-green-400"
                  : result === "lose"
                  ? "text-red-400"
                  : "text-gray-400"
              }`}
            >
              {result === "win" && (
                <>
                  <GiTrophy className="text-4xl animate-bounce" />
                  <span className="text-4xl font-bold animate-bounce">
                    승리!
                  </span>
                </>
              )}
              {result === "lose" && (
                <>
                  <FaSadTear className="text-4xl animate-bounce" />
                  <span className="text-4xl font-bold animate-bounce">
                    패배...
                  </span>
                </>
              )}
              {result === "draw" && (
                <>
                  <FaHandshake className="text-4xl animate-bounce" />
                  <span className="text-4xl font-bold animate-bounce">
                    무승부
                  </span>
                </>
              )}
            </div>

            <div
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl mb-4 ${
                result === "win"
                  ? "bg-gradient-to-r from-yellow-900/50 to-amber-900/50 border border-yellow-500/50"
                  : "bg-gray-800/50 border border-gray-600/50"
              }`}
            >
              <GiTwoCoins className="text-2xl" />
              <p
                className={`font-bold text-xl ${
                  result === "win" ? "text-yellow-400" : "text-gray-400"
                }`}
              >
                +{goldReward.toLocaleString()} 골드
              </p>
            </div>

            {result === "lose" && (
              <p className="text-gray-500 text-sm mb-4">참여 보상</p>
            )}
            {result === "draw" && (
              <p className="text-gray-500 text-sm mb-4">무승부 보상</p>
            )}

            <button
              onClick={handleClaimReward}
              className={`w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-white transition-all transform hover:scale-105 shadow-lg ${
                result === "win"
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400"
                  : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400"
              }`}
            >
              {!rewardClaimed ? "보상 받기" : "확인"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
