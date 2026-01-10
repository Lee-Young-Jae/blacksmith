/**
 * PvP Matchmaking Component
 *
 * 상대 검색, 공격덱 선택, 배틀 실행을 담당합니다.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { CharacterStats } from "../../types/stats";
import { formatNumberString } from "../../types/stats";
import type { OwnedCard, CardSlots } from "../../types/cardDeck";
import type { EquippedItems } from "../../types/equipment";
import type { BattleCard } from "../../types/battleCard";
import type { PvPOpponent, BattleSnapshot } from "../../types/pvpBattle";
import { ownedCardToBattleCard, TIER_ORDER } from "../../types/cardDeck";
import {
  generateAICardsMatchingPlayer,
  type RealtimeBattleResult,
} from "../../hooks/usePvPBattle";
import { BATTLE_CARD_TIER_COLORS } from "../../types/battleCard";
import { calculateTotalGoldBonus } from "../../utils/pvpBattle";
import { calculateRatingChange } from "../../types/league";
import { PvPRealtimeBattle } from "./PvPRealtimeBattle";
import { useAchievements } from "../../hooks/useAchievements";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  GiCrossedSwords,
  GiCardDraw,
  GiChart,
  GiLightBulb,
} from "react-icons/gi";
import { FaRobot, FaUser, FaTimes } from "react-icons/fa";
import { AvatarWithBorder, getFrameForBorder } from "../achievements/ProfileBorder";

// =============================================
// 타입 정의
// =============================================

interface PvPMatchmakingProps {
  playerStats: CharacterStats;
  playerName: string;
  playerAvatarUrl?: string; // 플레이어 프로필 이미지
  playerBorderId?: string | null; // 플레이어 업적 테두리 ID
  combatPower: number;
  equipment: EquippedItems;
  ownedCards: OwnedCard[];
  pvpBattle: {
    status: string;
    opponent: PvPOpponent | null;
    attackDeck: BattleCard[];
    currentBattle: any;
    error: string | null;
    isLoading: boolean;
    searchOpponent: (rating: number, combatPower: number) => Promise<boolean>;
    startBattle: (
      snapshot: BattleSnapshot,
      attackerCards: BattleCard[]
    ) => void;
    recordBattleResult: (
      result: RealtimeBattleResult,
      attackerCards: BattleCard[],
      defenderCards: BattleCard[]
    ) => Promise<void>;
    cancelSearch: () => void;
    resetBattle: () => void;
  };
  myRating: number;
  onGoldUpdate?: (amount: number) => void;
  ensureDefenseDeck?: (
    stats: CharacterStats,
    equipment: EquippedItems,
    combatPower: number
  ) => Promise<boolean>;
}

// =============================================
// 카드 선택 컴포넌트
// =============================================

function CardSelector({
  cards,
  selectedSlots,
  onSelect,
}: {
  cards: OwnedCard[];
  selectedSlots: CardSlots;
  onSelect: (slotIndex: number, card: OwnedCard | null) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  // 카드를 티어순으로 정렬
  const sortedCards = [...cards].sort(
    (a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier]
  );

  // 이미 선택된 카드 ID
  const selectedIds = selectedSlots.filter(Boolean).map((c) => c!.id);

  return (
    <div className="space-y-4">
      {/* 선택된 슬롯 */}
      <div className="flex gap-3 justify-center">
        {[0, 1, 2].map((slotIndex) => {
          const card = selectedSlots[slotIndex];
          const isActive = activeSlot === slotIndex;

          return (
            <div
              key={slotIndex}
              onClick={() => setActiveSlot(isActive ? null : slotIndex)}
              className={`w-24 h-32 rounded-lg border-2 cursor-pointer transition-all ${
                isActive
                  ? "border-amber-400 bg-amber-900/20"
                  : card
                  ? `${BATTLE_CARD_TIER_COLORS[card.tier]} border-current`
                  : "border-amber-700/30 border-dashed bg-stone-700/30"
              }`}
            >
              {card ? (
                <div className="h-full flex flex-col items-center justify-center p-2">
                  <span className="text-2xl mb-1">
                    {ownedCardToBattleCard(card).emoji}
                  </span>
                  <p className="text-xs text-center text-white font-medium line-clamp-2">
                    {ownedCardToBattleCard(card).name}
                  </p>
                  <p className="text-[10px] text-amber-200/60 mt-1">
                    {ownedCardToBattleCard(card).description}
                  </p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-amber-200/50 text-sm">
                    슬롯 {slotIndex + 1}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 슬롯 선택 안내 */}
      {activeSlot !== null && (
        <div className="text-center text-sm text-yellow-400">
          슬롯 {activeSlot + 1}에 넣을 카드를 선택하세요
          {selectedSlots[activeSlot] && (
            <button
              onClick={() => {
                onSelect(activeSlot, null);
                setActiveSlot(null);
              }}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              (비우기)
            </button>
          )}
        </div>
      )}

      {/* 카드 목록 */}
      {activeSlot !== null && (
        <div className="max-h-48 overflow-y-auto bg-stone-800/50 rounded-lg p-2 border border-amber-700/30">
          <div className="grid grid-cols-3 gap-2">
            {sortedCards.map((card) => {
              const isSelected = selectedIds.includes(card.id);
              const battleCard = ownedCardToBattleCard(card);

              return (
                <button
                  key={card.id}
                  onClick={() => {
                    if (!isSelected) {
                      onSelect(activeSlot, card);
                      setActiveSlot(null);
                    }
                  }}
                  disabled={isSelected}
                  className={`p-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? "opacity-40 cursor-not-allowed bg-stone-600"
                      : `${
                          BATTLE_CARD_TIER_COLORS[card.tier]
                        } hover:scale-105 cursor-pointer`
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{battleCard.emoji}</span>
                    <span className="text-xs font-medium truncate">
                      {battleCard.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-200/60 truncate">
                    {battleCard.description}
                  </p>
                </button>
              );
            })}
          </div>
          {sortedCards.length === 0 && (
            <p className="text-amber-200/50 text-center py-4">
              보유한 카드가 없습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// 메인 컴포넌트
// =============================================

export function PvPMatchmaking({
  playerStats,
  playerName,
  playerAvatarUrl,
  playerBorderId,
  combatPower,
  equipment,
  ownedCards,
  pvpBattle,
  myRating,
  onGoldUpdate,
  ensureDefenseDeck,
}: PvPMatchmakingProps) {
  // 업적 시스템
  const { user } = useAuth();
  const { updateProgress } = useAchievements();

  // 이전 공격덱 복원을 위한 ref (초기 로드 추적)
  const initialLoadDone = useRef(false)
  const lastOwnedCardsLength = useRef(0)

  // localStorage에서 저장된 덱 ID 가져오기
  const getSavedDeckIds = useCallback((): (string | null)[] => {
    try {
      const saved = localStorage.getItem('pvp_attack_deck')
      if (saved) {
        return JSON.parse(saved) as (string | null)[]
      }
    } catch {
      // 무시
    }
    return [null, null, null]
  }, [])

  // 저장된 ID로 실제 카드 객체 찾기
  const restoreDeckFromIds = useCallback((savedIds: (string | null)[]): CardSlots => {
    return savedIds.map(id =>
      id ? ownedCards.find(c => c.id === id) || null : null
    ) as CardSlots
  }, [ownedCards])

  // 이전 공격덱 복원 (localStorage에서)
  const [selectedCards, setSelectedCards] = useState<CardSlots>([null, null, null]);

  // 초기 로드: ownedCards가 처음 로드될 때 덱 복원
  useEffect(() => {
    // ownedCards가 비어있으면 아직 로드 안 됨
    if (ownedCards.length === 0) return

    // 초기 로드가 아직 안 됐으면 복원
    if (!initialLoadDone.current) {
      const savedIds = getSavedDeckIds()
      const restored = restoreDeckFromIds(savedIds)
      setSelectedCards(restored)
      initialLoadDone.current = true
      lastOwnedCardsLength.current = ownedCards.length
      return
    }

    // 카드 수가 줄었을 때만 검증 (합성/판매로 카드가 사라진 경우)
    if (ownedCards.length < lastOwnedCardsLength.current) {
      setSelectedCards(prev => {
        return prev.map(card => {
          if (!card) return null
          // 카드가 아직 존재하는지 확인
          const stillExists = ownedCards.some(c => c.id === card.id)
          return stillExists ? card : null
        }) as CardSlots
      })
    }
    lastOwnedCardsLength.current = ownedCards.length
  }, [ownedCards, getSavedDeckIds, restoreDeckFromIds])

  // 카드 선택 변경 시 localStorage에 저장
  useEffect(() => {
    // 초기 로드 전에는 저장하지 않음 (빈 덱으로 덮어쓰기 방지)
    if (!initialLoadDone.current) return

    const cardIds = selectedCards.map(c => c?.id || null)
    localStorage.setItem('pvp_attack_deck', JSON.stringify(cardIds))
  }, [selectedCards])

  // AI 상대일 때, 플레이어 카드에 맞춰 재생성된 AI 카드
  const [matchedAICards, setMatchedAICards] = useState<BattleCard[]>([]);

  // 상대 찾기 + 자동 방어덱 등록
  const handleSearchOpponent = async () => {
    // 자동 방어덱 등록 (없으면 생성, 있으면 스탯 업데이트)
    if (ensureDefenseDeck) {
      await ensureDefenseDeck(playerStats, equipment, combatPower);
    }
    // 상대 검색 (레이팅 기반, 전투력은 AI 폴백용)
    await searchOpponent(myRating, combatPower);
  };

  const {
    status,
    opponent,
    error,
    isLoading,
    searchOpponent,
    startBattle,
    recordBattleResult,
    cancelSearch,
    resetBattle,
  } = pvpBattle;

  // 카드 선택 핸들러
  const handleCardSelect = (slotIndex: number, card: OwnedCard | null) => {
    const newSlots = [...selectedCards] as CardSlots;
    newSlots[slotIndex] = card;
    setSelectedCards(newSlots);
  };

  // 취소 핸들러 (AI 카드 초기화 포함)
  const handleCancel = () => {
    setMatchedAICards([]);
    cancelSearch();
  };

  // 대전 시작 - 실시간 배틀로 전환
  const handleStartBattle = () => {
    // 공격 카드 변환
    const attackCards = selectedCards
      .filter((c): c is OwnedCard => c !== null)
      .map(ownedCardToBattleCard);

    // AI 상대일 경우, 플레이어 카드에 맞춰 AI 카드 재생성
    // 30%: 더 높은 등급, 60%: 비슷한 등급, 10%: 더 낮은 등급
    if (opponent?.isAI) {
      const matchedCards = generateAICardsMatchingPlayer(attackCards);
      setMatchedAICards(matchedCards);
    }

    const snapshot: BattleSnapshot = {
      oderId: "",
      username: playerName,
      stats: playerStats,
      combatPower,
      equipment,
      cards: attackCards,
      tier: "bronze",
      rating: myRating,
    };

    // startBattle 호출하면 status가 'fighting'으로 변경됨
    // 실제 배틀은 PvPRealtimeBattle 컴포넌트에서 처리
    // 결과 기록은 onBattleEnd에서 recordBattleResult로 처리
    startBattle(snapshot, attackCards);
  };

  // 검색 중
  if (status === "searching") {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        {/* 애니메이션 영역 */}
        <div className="relative w-32 h-32 mb-6">
          {/* 외곽 링 */}
          <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />

          {/* 중간 링 */}
          <div className="absolute inset-3 border-4 border-blue-500/30 rounded-full" />
          <div
            className="absolute inset-3 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />

          {/* 내부 링 */}
          <div className="absolute inset-6 border-4 border-cyan-500/30 rounded-full" />
          <div
            className="absolute inset-6 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"
            style={{ animationDuration: "0.8s" }}
          />

          {/* 중앙 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <GiCrossedSwords className="text-4xl text-purple-400 animate-pulse" />
          </div>
        </div>

        {/* 텍스트 */}
        <div className="text-center space-y-2 mb-6">
          <p className="text-amber-100 font-bold text-xl">상대를 찾는 중...</p>
          <p className="text-amber-200/60 text-sm">
            레이팅 {myRating.toLocaleString()} 근처에서 검색
          </p>
          <p className="text-amber-200/50 text-xs">최근 대전 상대 제외</p>
          <div className="flex items-center justify-center gap-1 text-amber-400">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
              .
            </span>
            <span
              className="animate-bounce"
              style={{ animationDelay: "150ms" }}
            >
              .
            </span>
            <span
              className="animate-bounce"
              style={{ animationDelay: "300ms" }}
            >
              .
            </span>
          </div>
        </div>

        {/* 취소 버튼 */}
        <button
          onClick={handleCancel}
          className="px-6 py-2 bg-stone-700/60 text-amber-200/80 rounded-xl hover:bg-stone-600/60 border border-amber-700/30 transition-colors flex items-center gap-2"
        >
          <FaTimes className="text-red-400" /> 취소
        </button>
      </div>
    );
  }

  // 배틀 진행 중 - 실시간 배틀
  if (status === "fighting" && opponent) {
    const playerCards = selectedCards
      .filter((c): c is OwnedCard => c !== null)
      .map(ownedCardToBattleCard);

    // 골드 보너스 카드 효과 계산
    const goldBonusPercent = calculateTotalGoldBonus(playerCards);
    const goldMultiplier = 1 + goldBonusPercent / 100;

    // 보상 계산 (AI는 50%, 골드 보너스 적용)
    const aiMultiplier = opponent.isAI ? 0.5 : 1;
    const winGold = Math.floor(500 * aiMultiplier * goldMultiplier);
    const loseGold = Math.floor(100 * aiMultiplier * goldMultiplier);
    const drawGold = Math.floor(250 * aiMultiplier * goldMultiplier);

    // 상대 카드 결정:
    // 1. AI 상대이면서 플레이어 카드에 맞춰 재생성된 카드가 있으면 사용
    // 2. 그렇지 않으면 상대의 실제 방어덱 카드 사용
    // 3. 없으면 AI 카드 (레거시) 또는 빈 배열
    const opponentCards =
      opponent.isAI && matchedAICards.length > 0
        ? matchedAICards
        : opponent.defenseCards || opponent.aiCards || [];

    // 레이팅 변화 계산
    const opponentRating = opponent.rating || 400;
    const ratingChanges = calculateRatingChange(myRating, opponentRating, false);
    const drawRatingChanges = calculateRatingChange(myRating, opponentRating, true);

    // AI전 레이팅 변화: 승리 시 30% (최소 3, 최대 10), 패배/무승부 시 0
    const winRatingChange = opponent.isAI
      ? Math.max(3, Math.min(10, Math.floor(ratingChanges.winnerChange * 0.3)))
      : ratingChanges.winnerChange;
    const loseRatingChange = opponent.isAI ? 0 : ratingChanges.loserChange;
    const drawRatingChange = opponent.isAI ? 0 : drawRatingChanges.winnerChange;

    return (
      <PvPRealtimeBattle
        playerName={playerName}
        playerAvatarUrl={playerAvatarUrl}
        playerFrameImage={getFrameForBorder(playerBorderId)}
        playerStats={playerStats}
        playerCards={playerCards}
        opponentName={opponent.username}
        opponentAvatarUrl={opponent.avatarUrl}
        opponentFrameImage={getFrameForBorder(opponent.equippedBorder)}
        opponentStats={opponent.stats}
        opponentCards={opponentCards}
        opponentIsAI={opponent.isAI}
        winReward={winGold}
        loseReward={loseGold}
        drawReward={drawGold}
        winRatingChange={winRatingChange}
        loseRatingChange={loseRatingChange}
        drawRatingChange={drawRatingChange}
        onBattleEnd={async (result) => {
          // 실제 배틀 결과를 DB에 기록
          await recordBattleResult(result, playerCards, opponentCards);

          // 보상 처리 (UI 업데이트)
          const reward =
            result.winner === "player"
              ? winGold
              : result.winner === "opponent"
              ? loseGold
              : drawGold;
          if (onGoldUpdate) onGoldUpdate(reward);

          // 업적 진행 업데이트 (승리 시)
          if (result.winner === "player" && user) {
            try {
              // 현재 승리 수 조회
              const { data: rankingData } = await supabase
                .from("pvp_rankings")
                .select("wins")
                .eq("user_id", user.id)
                .single();

              if (rankingData) {
                // PvP 승리 업적 업데이트
                await updateProgress("pvp_wins", rankingData.wins || 0);
              }
            } catch (err) {
              console.error("Failed to update achievement:", err);
            }
          }

          setMatchedAICards([]); // AI 카드 초기화
          resetBattle();
        }}
      />
    );
  }

  // 상대 선택됨 - 덱 선택 (VS 화면)
  if (status === "preparing" && opponent) {
    const selectedCardCount = selectedCards.filter(Boolean).length;

    return (
      <div className="space-y-4">
        {/* VS 헤더 */}
        <div className="bg-gradient-to-r from-amber-900/40 via-stone-800 to-orange-900/40 rounded-xl p-4 border border-amber-700/30">
          <div className="flex items-center justify-between">
            {/* 플레이어 */}
            <div className="flex-1 text-center">
              <div className="mx-auto mb-2 flex justify-center">
                <AvatarWithBorder
                  avatarUrl={playerAvatarUrl}
                  username={playerName}
                  borderId={playerBorderId}
                  size="lg"
                  fallbackIcon={<FaUser className="text-2xl text-white" />}
                />
              </div>
              <p className="text-amber-400 font-bold">{playerName}</p>
              <p className="text-yellow-400 text-sm font-medium">
                {combatPower.toLocaleString()}
              </p>
              <p className="text-amber-200/50 text-xs">전투력</p>
            </div>

            {/* VS */}
            <div className="px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center border-2 border-orange-400 shadow-lg shadow-orange-500/50 animate-pulse">
                <span className="text-white font-black text-xl">VS</span>
              </div>
            </div>

            {/* 상대 */}
            <div className="flex-1 text-center">
              <div className="mx-auto mb-2 flex justify-center">
                {opponent.isAI ? (
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-lg shadow-yellow-500/30">
                    <FaRobot className="text-3xl text-white" />
                  </div>
                ) : (
                  <AvatarWithBorder
                    avatarUrl={opponent.avatarUrl}
                    username={opponent.username}
                    borderId={opponent.equippedBorder}
                    size="lg"
                    fallbackIcon={<FaUser className="text-2xl text-white" />}
                  />
                )}
              </div>
              <p className="text-orange-400 font-bold">{opponent.username}</p>
              <p className="text-yellow-400 text-sm font-medium">
                {opponent.combatPower.toLocaleString()}
              </p>
              <p className="text-amber-200/50 text-xs">전투력</p>
            </div>
          </div>

          {/* AI 알림 */}
          {opponent.isAI && (
            <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded-xl">
              <p className="text-yellow-400 text-xs text-center flex items-center justify-center gap-1">
                <FaRobot /> AI 상대입니다 (보상 50%, 승리 시 MMR 30%)
              </p>
            </div>
          )}
        </div>

        {/* 스탯 비교 */}
        <div className="bg-stone-800/50 rounded-xl p-3 border border-amber-700/30">
          <h4 className="text-amber-100 font-bold text-sm mb-3 text-center flex items-center justify-center gap-2">
            <GiChart className="text-amber-400" /> 스탯 비교
          </h4>
          <div className="space-y-2">
            {[
              {
                label: "공격력",
                player: playerStats.attack,
                opp: opponent.stats.attack,
                color: "red",
              },
              {
                label: "방어력",
                player: playerStats.defense,
                opp: opponent.stats.defense,
                color: "blue",
              },
              {
                label: "HP",
                player: playerStats.hp,
                opp: opponent.stats.hp,
                color: "green",
              },
              {
                label: "공격속도",
                player: playerStats.attackSpeed,
                opp: opponent.stats.attackSpeed,
                color: "cyan",
                suffix: "%",
              },
              {
                label: "회피율",
                player: playerStats.evasion,
                opp: opponent.stats.evasion || 0,
                color: "emerald",
                suffix: "%",
              },
            ].map((stat) => {
              const playerWins = stat.player > stat.opp;
              const oppWins = stat.opp > stat.player;
              const formatValue = (v: number) => stat.suffix ? formatNumberString(v) : Math.round(v);
              return (
                <div key={stat.label} className="flex items-center text-xs">
                  <span
                    className={`w-16 text-right font-bold ${
                      playerWins ? `text-${stat.color}-400` : "text-gray-400"
                    }`}
                  >
                    {formatValue(stat.player)}
                    {stat.suffix || ""}
                  </span>
                  <div className="flex-1 mx-2 h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full bg-${stat.color}-500`}
                      style={{
                        width: `${
                          (stat.player / (stat.player + stat.opp)) * 100
                        }%`,
                      }}
                    />
                    <div
                      className="h-full bg-gray-500"
                      style={{
                        width: `${
                          (stat.opp / (stat.player + stat.opp)) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span
                    className={`w-16 font-bold ${
                      oppWins ? `text-${stat.color}-400` : "text-gray-400"
                    }`}
                  >
                    {formatValue(stat.opp)}
                    {stat.suffix || ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 공격덱 선택 */}
        <div className="bg-stone-800/50 rounded-xl p-4 border border-amber-700/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-amber-100 font-bold flex items-center gap-2">
              <GiCardDraw className="text-amber-400" /> 공격덱 선택
            </h4>
            <span className="text-sm text-amber-200/60">{selectedCardCount}/3</span>
          </div>
          <CardSelector
            cards={ownedCards}
            selectedSlots={selectedCards}
            onSelect={handleCardSelect}
          />
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 bg-stone-700/60 text-amber-200/80 rounded-xl hover:bg-stone-600/60 border border-amber-700/30 transition-colors"
          >
            ← 취소
          </button>
          <button
            onClick={handleStartBattle}
            disabled={isLoading}
            className="flex-[2] px-4 py-4 bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform disabled:opacity-50 shadow-lg shadow-orange-500/30"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                준비 중...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <GiCrossedSwords /> 대전 시작!
              </span>
            )}
          </button>
        </div>

        <p className="text-amber-200/50 text-xs text-center flex items-center justify-center gap-1">
          <GiLightBulb className="text-amber-400" /> 카드를 선택하지 않아도
          대전할 수 있습니다
        </p>
      </div>
    );
  }

  // 대기 상태 - 매칭 시작
  return (
    <div className="space-y-4">
      {/* 내 정보 */}
      <div className="bg-stone-800/50 rounded-xl p-4 border border-amber-700/30">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-amber-100 font-bold">내 스탯</h4>
          <div className="text-sm">
            <span className="text-amber-200/60">레이팅 </span>
            <span className="text-amber-400 font-bold">
              {myRating.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-stone-700/50 rounded-lg p-2 text-center">
            <p className="text-red-400 font-bold">{playerStats.attack}</p>
            <p className="text-amber-200/50">공격력</p>
          </div>
          <div className="bg-stone-700/50 rounded-lg p-2 text-center">
            <p className="text-blue-400 font-bold">{playerStats.defense}</p>
            <p className="text-amber-200/50">방어력</p>
          </div>
          <div className="bg-stone-700/50 rounded-lg p-2 text-center">
            <p className="text-green-400 font-bold">{playerStats.hp}</p>
            <p className="text-amber-200/50">HP</p>
          </div>
          <div className="bg-stone-700/50 rounded-lg p-2 text-center">
            <p className="text-cyan-400 font-bold">
              {formatNumberString(playerStats.attackSpeed)}%
            </p>
            <p className="text-amber-200/50">공속</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs mt-2">
          <div className="bg-stone-700/50 rounded-lg p-2 text-center">
            <p className="text-yellow-400 font-bold">{formatNumberString(playerStats.critRate)}%</p>
            <p className="text-amber-200/50">치명타</p>
          </div>
          <div className="bg-stone-700/50 rounded-lg p-2 text-center">
            <p className="text-orange-400 font-bold">
              {formatNumberString(playerStats.critDamage)}%
            </p>
            <p className="text-amber-200/50">치명뎀</p>
          </div>
          <div className="bg-stone-700/50 rounded-lg p-2 text-center">
            <p className="text-purple-400 font-bold">
              {formatNumberString(playerStats.penetration)}%
            </p>
            <p className="text-amber-200/50">관통력</p>
          </div>
          <div className="bg-stone-700/50 rounded-lg p-2 text-center">
            <p className="text-emerald-400 font-bold">
              {formatNumberString(playerStats.evasion)}%
            </p>
            <p className="text-amber-200/50">회피율</p>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-xl">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* 매칭 버튼 */}
      <button
        onClick={handleSearchOpponent}
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform disabled:opacity-50 shadow-lg shadow-amber-500/30"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            검색 중...
          </span>
        ) : (
          "상대 찾기"
        )}
      </button>

      <p className="text-amber-200/50 text-xs text-center">
        비슷한 레이팅의 상대를 검색합니다
        <br />
        최근 5경기 상대는 제외됩니다
        <br />
        상대가 없으면 AI와 대전합니다
      </p>

      {/* 보유 카드 수 */}
      <div className="text-center text-amber-200/60 text-sm">
        보유 카드: {ownedCards.length}장
      </div>
    </div>
  );
}
