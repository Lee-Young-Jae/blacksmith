import { useState, useEffect, useCallback } from "react";
import type { GachaResult } from "../../types/gacha";
import { EQUIPMENT_SLOT_NAMES } from "../../types/equipment";
import { EquipmentImage } from "../equipment";
import { GiAnvil, GiHammerNails, GiFireBowl, GiSparkles } from "react-icons/gi";
import { FaFire } from "react-icons/fa";
import { IoGridOutline } from "react-icons/io5";
import { useTutorial } from "../../contexts/TutorialContext";

interface GachaResultDisplayProps {
  results: GachaResult[];
  onClose: () => void;
}

export default function GachaResultDisplay({
  results,
  onClose,
}: GachaResultDisplayProps) {
  const { isActive: isTutorialActive } = useTutorial();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [forgeState, setForgeState] = useState<"heating" | "striking" | "revealed">(
    isTutorialActive ? "revealed" : "heating"
  );
  const [strikeCount, setStrikeCount] = useState(isTutorialActive ? 3 : 0);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(
    isTutorialActive ? new Set(results.map((_, i) => i)) : new Set()
  );
  const [viewMode, setViewMode] = useState<"forge" | "grid">("forge");
  const [showSparks, setShowSparks] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isSinglePull = results.length === 1;
  const allRevealed = revealedIndices.size >= results.length;
  const strikesNeeded = 3; // 3번 두드리면 완성

  // Auto start heating (튜토리얼 중에는 스킵)
  useEffect(() => {
    if (isTutorialActive) return;
    const timer = setTimeout(() => {
      setForgeState("striking");
    }, 800);
    return () => clearTimeout(timer);
  }, [currentIndex, isTutorialActive]);

  // Handle strike (tap)
  const handleStrike = useCallback(() => {
    if (forgeState === "heating" || isTransitioning) return;

    if (forgeState === "striking") {
      // 시각 효과
      setShowSparks(true);
      setIsShaking(true);
      setShowFlash(true);
      setTimeout(() => setShowSparks(false), 300);
      setTimeout(() => setIsShaking(false), 150);
      setTimeout(() => setShowFlash(false), 80);

      // 햅틱 피드백 (모바일)
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }

      const newCount = strikeCount + 1;
      setStrikeCount(newCount);

      if (newCount >= strikesNeeded) {
        // 완성 시 효과
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
        setForgeState("revealed");
        setRevealedIndices(prev => new Set([...prev, currentIndex]));
      }
    } else if (forgeState === "revealed") {
      // Move to next with smooth transition
      if (currentIndex < results.length - 1) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
          setForgeState("heating");
          setStrikeCount(0);
          setTimeout(() => setIsTransitioning(false), 50);
        }, 200);
      }
    }
  }, [forgeState, strikeCount, currentIndex, results.length, strikesNeeded, isTransitioning]);

  // Skip all
  const skipAll = () => {
    const allIndices = new Set(results.map((_, i) => i));
    setRevealedIndices(allIndices);
    setForgeState("revealed");
    setStrikeCount(strikesNeeded);
  };

  // Go to specific item
  const goToItem = (index: number) => {
    setCurrentIndex(index);
    if (revealedIndices.has(index)) {
      setForgeState("revealed");
      setStrikeCount(strikesNeeded);
    } else {
      setForgeState("heating");
      setStrikeCount(0);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleStrike();
      } else if (e.key === "Escape") {
        if (allRevealed) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStrike, allRevealed, onClose]);

  const currentResult = results[currentIndex];

  return (
    <div
      className={`fixed inset-0 z-50 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 ${
        isShaking ? "animate-shake" : ""
      }`}
      onClick={allRevealed && viewMode === "forge" ? onClose : undefined}
    >
      {/* Flash effect - 은은하게 */}
      {showFlash && (
        <div className="absolute inset-0 z-[60] bg-amber-200/20 pointer-events-none animate-flash" />
      )}

      {/* Ambient fire glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-600/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-red-500/30 blur-[60px] rounded-full animate-pulse" />
      </div>

      {/* Floating embers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full animate-float-up"
            style={{
              left: `${30 + Math.random() * 40}%`,
              bottom: `${10 + Math.random() * 20}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-200/80">
          <GiAnvil className="text-xl" />
          <span className="text-sm font-medium">
            {isSinglePull ? "단조 완료" : `${currentIndex + 1} / ${results.length}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isSinglePull && (
            <button
              onClick={() => {
                skipAll();
                setViewMode(viewMode === "forge" ? "grid" : "forge");
              }}
              className="p-2 rounded-lg bg-amber-900/30 hover:bg-amber-900/50 text-amber-200/80 hover:text-amber-200 transition-all border border-amber-700/30"
            >
              <IoGridOutline className="text-lg" />
            </button>
          )}

          {!allRevealed && !isSinglePull && (
            <button
              onClick={skipAll}
              className="px-3 py-2 rounded-lg bg-amber-900/30 hover:bg-amber-900/50 text-amber-200/80 hover:text-amber-200 transition-all text-sm border border-amber-700/30"
            >
              전체 완성
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="h-full flex flex-col pt-14 pb-4">
        {viewMode === "forge" ? (
          <>
            {/* Forge Area */}
            <div
              className="flex-1 flex flex-col items-center justify-center px-4 cursor-pointer select-none"
              onClick={(e) => {
                e.stopPropagation();
                if (allRevealed) {
                  onClose();
                } else {
                  handleStrike();
                }
              }}
            >
              {/* Strike indicator - 항상 공간 유지 */}
              <div className={`mb-4 flex items-center gap-2 h-8 transition-opacity duration-300 ${
                forgeState === "striking" ? "opacity-100" : "opacity-0"
              }`}>
                <GiHammerNails className="text-amber-400 text-2xl animate-bounce" />
                <div className="flex gap-1">
                  {[...Array(strikesNeeded)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        i < strikeCount
                          ? "bg-amber-400 scale-110"
                          : "bg-amber-900/50 border border-amber-700/50"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Forge/Anvil */}
              <div className="relative">
                {/* Sparks effect */}
                {showSparks && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-spark"
                        style={{
                          transform: `rotate(${i * 30}deg) translateY(-40px)`,
                          animationDelay: `${i * 0.02}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* The Card/Item */}
                <div
                  className={`
                    relative w-64 sm:w-72 aspect-[3/4] rounded-2xl overflow-hidden
                    transition-all duration-300 transform
                    ${forgeState === "revealed" ? "scale-100" : "scale-95"}
                    ${isTransitioning ? "opacity-0 scale-90" : "opacity-100"}
                  `}
                  style={{
                    background: forgeState === "revealed"
                      ? "linear-gradient(145deg, rgba(251,191,36,0.15), rgba(180,83,9,0.2), rgba(251,191,36,0.1))"
                      : "linear-gradient(145deg, rgba(255,100,0,0.3), rgba(255,50,0,0.4), rgba(255,100,0,0.3))",
                    boxShadow: forgeState === "revealed"
                      ? "0 0 60px rgba(251,191,36,0.3), inset 0 0 30px rgba(251,191,36,0.1)"
                      : "0 0 80px rgba(255,100,0,0.5), inset 0 0 40px rgba(255,50,0,0.3)",
                  }}
                >
                  {/* Heat waves effect */}
                  {forgeState !== "revealed" && (
                    <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 via-transparent to-red-500/10 animate-pulse" />
                  )}

                  {/* Border */}
                  <div className={`
                    absolute inset-0 rounded-2xl border-2 transition-colors duration-500
                    ${forgeState === "revealed" ? "border-amber-500/50" : "border-orange-500/50"}
                  `} />

                  {/* Content */}
                  <div className="relative h-full flex flex-col p-6">
                    {/* NEW badge */}
                    {currentResult.isNew && forgeState === "revealed" && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold px-2.5 py-1 rounded-full animate-bounce shadow-lg">
                        NEW!
                      </div>
                    )}

                    {/* Equipment display */}
                    <div className="flex-1 flex items-center justify-center">
                      {forgeState === "revealed" ? (
                        <div className="relative animate-fade-in">
                          <EquipmentImage
                            equipmentBase={currentResult.equipment}
                            starLevel={0}
                            size="2xl"
                            className="drop-shadow-2xl"
                          />
                          <div className="absolute inset-0 bg-amber-500/30 blur-2xl -z-10 scale-150 rounded-full" />
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Molten metal blob */}
                          <div
                            className={`
                              w-24 h-24 rounded-full
                              bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600
                              animate-pulse shadow-2xl
                              ${forgeState === "striking" ? "animate-jiggle" : ""}
                            `}
                            style={{
                              boxShadow: "0 0 40px rgba(255,150,0,0.8), 0 0 80px rgba(255,100,0,0.5)",
                            }}
                          />
                          {/* Fire icon */}
                          <FaFire className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl text-yellow-200/80" />
                        </div>
                      )}
                    </div>

                    {/* Equipment info */}
                    <div className="text-center">
                      {forgeState === "revealed" ? (
                        <>
                          <h3 className="text-xl font-bold text-amber-100 mb-1 drop-shadow-lg">
                            {currentResult.equipment.levels[0].name}
                          </h3>
                          <p className="text-amber-200/60 text-sm">
                            {EQUIPMENT_SLOT_NAMES[currentResult.equipment.slot]}
                          </p>
                          {currentResult.equipment.levels[0].comment && (
                            <p className="text-amber-200/40 text-xs mt-2 italic">
                              "{currentResult.equipment.levels[0].comment}"
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-amber-200/60 text-sm">
                          {forgeState === "heating" ? "가열 중..." : "두드려서 완성하세요!"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Anvil base */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-gradient-to-t from-stone-800 to-stone-700 rounded-t-lg border-t-2 border-stone-600" />
              </div>

              {/* Tap hint */}
              <div className="mt-8 h-8 flex items-center justify-center">
                {forgeState === "striking" && (
                  <div className="text-amber-300/80 text-sm animate-pulse flex items-center gap-2">
                    <GiHammerNails className="text-lg" />
                    <span>탭하여 두드리기</span>
                  </div>
                )}
                {forgeState === "revealed" && !allRevealed && (
                  <div className="text-amber-200/60 text-sm animate-pulse">
                    탭하여 다음 장비 단조
                  </div>
                )}
                {forgeState === "revealed" && allRevealed && (
                  <div className="text-amber-200/60 text-sm animate-pulse">
                    터치하여 닫기
                  </div>
                )}
              </div>
            </div>

            {/* Bottom thumbnail strip */}
            {!isSinglePull && (
              <div className="px-4 py-3">
                <div className="flex justify-center gap-1.5 sm:gap-2 overflow-x-auto py-2 scrollbar-hide">
                  {results.map((result, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToItem(index);
                      }}
                      className={`
                        relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg transition-all duration-200
                        border
                        ${index === currentIndex
                          ? "ring-2 ring-amber-400 scale-110 bg-amber-900/40 border-amber-500/50"
                          : "bg-stone-800/50 hover:bg-stone-700/50 border-stone-700/50"
                        }
                        ${revealedIndices.has(index) ? "opacity-100" : "opacity-50"}
                      `}
                    >
                      {revealedIndices.has(index) ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <EquipmentImage
                            equipmentBase={result.equipment}
                            starLevel={0}
                            size="md"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GiFireBowl className="text-orange-500/60 text-lg" />
                        </div>
                      )}
                      {result.isNew && revealedIndices.has(index) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Grid View */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-2xl mx-auto">
                {results.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      goToItem(index);
                      setViewMode("forge");
                    }}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-amber-900/30 to-stone-900/50 border border-amber-700/30 hover:border-amber-500/50 transition-all hover:scale-105 active:scale-95"
                    style={{
                      animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <div className="h-full flex flex-col p-2 sm:p-3">
                      {result.isNew && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                      )}
                      <div className="flex-1 flex items-center justify-center">
                        <EquipmentImage
                          equipmentBase={result.equipment}
                          starLevel={0}
                          size="lg"
                        />
                      </div>
                      <div className="text-center mt-auto">
                        <div className="text-xs font-medium text-amber-100 truncate">
                          {result.equipment.levels[0].name}
                        </div>
                        <div className="text-[10px] text-amber-200/50">
                          {EQUIPMENT_SLOT_NAMES[result.equipment.slot]}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="px-4 py-3">
              <div className="bg-amber-900/20 rounded-2xl p-4 max-w-md mx-auto border border-amber-700/30">
                <h3 className="text-center text-amber-100 font-bold mb-3 flex items-center justify-center gap-2">
                  <GiSparkles className="text-amber-400" />
                  단조 완료
                </h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {(["weapon", "hat", "top", "bottom", "gloves", "shoes", "earring"] as const).map((slot) => {
                    const count = results.filter((r) => r.slot === slot).length;
                    if (count === 0) return null;
                    return (
                      <div key={slot} className="text-center bg-amber-900/30 rounded-lg px-3 py-2 border border-amber-700/30">
                        <div className="text-lg font-bold text-amber-100">{count}</div>
                        <div className="text-[10px] text-amber-200/60">{EQUIPMENT_SLOT_NAMES[slot]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full max-w-md mx-auto mt-4 py-3 rounded-xl bg-amber-700/30 hover:bg-amber-700/50 text-amber-100 font-medium transition-all block border border-amber-600/30"
              >
                확인
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
