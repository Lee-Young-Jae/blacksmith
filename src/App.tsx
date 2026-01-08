import { useState, useEffect } from "react";
import {
  GiAnvilImpact,
  GiForestCamp,
  GiTicket,
  GiSwordman,
} from "react-icons/gi";
import { FaRobot } from "react-icons/fa";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { LoginScreen } from "./components/LoginScreen";
import { UserProfile } from "./components/UserProfile";
import { WeaponDisplay } from "./components/WeaponDisplay";
import { WeaponAcquire } from "./components/WeaponAcquire";
// import { StarForcePanel } from './components/StarForcePanel'  // Legacy weapon starforce
import { GoldDisplay } from "./components/GoldDisplay";
import { NavigationTabs, type TabType } from "./components/NavigationTabs";
import { BattleMatchmaking } from "./components/BattleMatchmaking";
import { BattleArena } from "./components/BattleArena";
import { BattleCardSelect } from "./components/BattleCardSelect";
// import { SellPanel } from './components/SellPanel'  // Legacy weapon sell
import { LiveFeed } from "./components/LiveFeed";
import { useLiveFeed } from "./hooks/useLiveFeed";
import { DestroyEffect } from "./components/DestroyEffect";
import { EnhanceEffect } from "./components/EnhanceEffect";
import {
  EquipmentSlots,
  EquipmentInventory,
  EquipmentImage,
  EquipmentEnhancePanel,
  EquipmentSellPanel,
  EquipmentDisplay,
  EquipmentRecoveryPanel,
} from "./components/equipment";
import { StatsPanel } from "./components/stats";
import { DEFAULT_CHARACTER_STATS, calculateCombatPower } from "./types/stats";
import { PotentialPanel } from "./components/potential";
import { GachaPanel } from "./components/gacha";
import { PvPArena } from "./components/pvp/PvPArena";
import { TowerArena } from "./components/tower";
import { usePotential } from "./hooks/usePotential";
import { useGacha } from "./hooks/useGacha";
import { useUserData } from "./hooks/useUserData";
import { useDailyBattle } from "./hooks/useDailyBattle";
import { useStarForce } from "./hooks/useStarForce";
import { useEquipmentStarForce } from "./hooks/useEquipmentStarForce";
import { useBattle } from "./hooks/useBattle";
import { useBattleCards } from "./hooks/useBattleCards";
import { useEquipment } from "./hooks/useEquipment";
import { useGift } from "./hooks/useGift";
import { useEnhancementTickets } from "./hooks/useEnhancementTickets";
import {
  GiftIcon,
  GiftBoxPanel,
  SendCondolenceModal,
  SendEquipmentModal,
  AdminGoldPanel,
  AdminTicketPanel,
} from "./components/gift";
import { ReferralPanel } from "./components/referral/ReferralPanel";
import { WelcomeModal } from "./components/referral/WelcomeModal";
import { TutorialOverlay } from "./components/tutorial";
import { TutorialProvider, useTutorial } from "./contexts/TutorialContext";
import { getTotalAttack } from "./utils/starforce";
import type { AIDifficulty } from "./types/battle";
import type { UserWeapon, WeaponType, WeaponLevel } from "./types/weapon";
import { getEquipmentName, getEquipmentDisplayName } from "./types/equipment";
import type {
  EquipmentSlot,
  UserEquipment,
  EquipmentLevel,
} from "./types/equipment";
// import { getWeaponComment } from './types/weapon'  // Legacy weapon system

// 장착된 모든 장비 → 배틀용 무기 변환 (전체 스탯 기반)
function createBattleWeaponFromEquipment(
  equippedItems: Partial<Record<EquipmentSlot, UserEquipment>>,
  totalStats: { attack: number }
): UserWeapon | null {
  const equippedWeapon = equippedItems.weapon;

  // 장착된 장비가 하나도 없으면 null
  const hasAnyEquipment = Object.values(equippedItems).some(
    (e) => e !== undefined
  );
  if (!hasAnyEquipment) return null;

  // 무기가 있으면 무기 정보 사용, 없으면 기본값
  if (equippedWeapon) {
    const weaponLevels: WeaponLevel[] = equippedWeapon.equipmentBase.levels.map(
      (level: EquipmentLevel) => ({
        name: level.name,
        comment: level.comment,
        image: level.image,
      })
    );

    const weaponType: WeaponType = {
      id: equippedWeapon.equipmentBase.id,
      category: "hammer",
      baseAttack: equippedWeapon.equipmentBase.baseStats.attack || 0,
      sellPriceBase: 0,
      emoji: equippedWeapon.equipmentBase.emoji,
      levels: weaponLevels,
    };

    return {
      id: equippedWeapon.id,
      weaponTypeId: equippedWeapon.equipmentBaseId,
      weaponType,
      starLevel: equippedWeapon.starLevel,
      isDestroyed: false,
      consecutiveFails: equippedWeapon.consecutiveFails,
      createdAt: equippedWeapon.createdAt,
      totalAttack: totalStats.attack, // 모든 장비의 총 공격력
    };
  }

  // 무기 없이 다른 장비만 있는 경우 (맨손 전투)
  const anyEquipment = Object.values(equippedItems).find(
    (e) => e !== undefined
  )!;
  const defaultWeaponType: WeaponType = {
    id: "unarmed",
    category: "club",
    baseAttack: 0,
    sellPriceBase: 0,
    emoji: "👊",
    levels: [
      { name: "맨손", comment: "장비의 힘으로 싸웁니다.", image: undefined },
    ],
  };

  return {
    id: "equipped-stats",
    weaponTypeId: "unarmed",
    weaponType: defaultWeaponType,
    starLevel: 0,
    isDestroyed: false,
    consecutiveFails: 0,
    createdAt: anyEquipment.createdAt,
    totalAttack: totalStats.attack, // 모든 장비의 총 공격력
  };
}

type GameView = "acquire" | "main";

function GameContent() {
  const { user, isLoading: authLoading } = useAuth();
  const userData = useUserData();
  const dailyBattle = useDailyBattle();
  const equipmentSystem = useEquipment();
  const liveFeed = useLiveFeed();
  const giftSystem = useGift();
  const tutorial = useTutorial();

  const [view, setView] = useState<GameView>("acquire");
  const [activeTab, setActiveTab] = useState<TabType>("equipment");
  const [showDestroyEffect, setShowDestroyEffect] = useState(false);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [localWeapon, setLocalWeapon] = useState<UserWeapon | null>(null);
  const [inventoryFilterSlot, setInventoryFilterSlot] =
    useState<EquipmentSlot | null>(null);
  const [selectedPotentialEquipment, setSelectedPotentialEquipment] =
    useState<UserEquipment | null>(null);
  const [selectedSellEquipment, setSelectedSellEquipment] =
    useState<UserEquipment | null>(null);

  // 선물함 관련 상태
  const [showGiftBox, setShowGiftBox] = useState(false);
  const [showSendEquipment, setShowSendEquipment] = useState(false);
  const [showAdminGold, setShowAdminGold] = useState(false);
  const [showAdminTicket, setShowAdminTicket] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [condolenceTarget, setCondolenceTarget] = useState<{
    userId: string;
    username: string;
    historyId: string;
  } | null>(null);

  // 관리자 여부 확인
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      setIsAdmin(data?.is_admin || false);
    };

    checkAdmin();
  }, [user]);

  // 잠재옵션 훅
  const potentialSystem = usePotential({
    onUpdatePotentials: equipmentSystem.updatePotentials,
  });

  // 가챠 훅
  const gachaSystem = useGacha({
    onAcquireEquipment: equipmentSystem.acquireEquipment,
    onUpdateGold: userData.updateGold,
  });

  // 장비 강화 훅
  const equipmentStarForce = useEquipmentStarForce({
    onSuccess: async (equipment, newLevel) => {
      await equipmentSystem.updateEquipment(equipment.id, {
        starLevel: newLevel,
        consecutiveFails: 0,
      });
      // 강화 기록 저장
      const itemName = getEquipmentName(equipment.equipmentBase, newLevel);
      await userData.recordEquipmentEnhancement(
        itemName,
        equipment.starLevel,
        newLevel,
        "success",
        equipment.consecutiveFails >= 2, // 찬스타임 여부
        0 // 골드 비용은 별도 처리됨
      );
    },
    onMaintain: async (equipment, newFails) => {
      await equipmentSystem.updateEquipment(equipment.id, {
        consecutiveFails: newFails,
      });
      // 강화 기록 저장
      const itemName = getEquipmentName(
        equipment.equipmentBase,
        equipment.starLevel
      );
      await userData.recordEquipmentEnhancement(
        itemName,
        equipment.starLevel,
        equipment.starLevel,
        "maintain",
        false,
        0
      );
    },
    onDestroy: async (equipment) => {
      await equipmentSystem.destroyEquipment(equipment.id);
      // 강화 기록 저장
      const itemName = getEquipmentName(
        equipment.equipmentBase,
        equipment.starLevel
      );
      await userData.recordEquipmentEnhancement(
        itemName,
        equipment.starLevel,
        0,
        "destroy",
        false,
        0
      );
    },
    // Sync with inventory for list updates
    inventory: equipmentSystem.inventory,
  });

  // 강화권 훅
  const enhancementTickets = useEnhancementTickets();
  const [isUsingTicket, setIsUsingTicket] = useState(false);
  const [ticketModalData, setTicketModalData] = useState<{
    ticket: { ticketLevel: number; quantity: number } | null;
    isOpen: boolean;
  }>({ ticket: null, isOpen: false });

  // 강화권 사용 핸들러
  const handleUseEnhancementTicket = async (ticketLevel: number) => {
    const equipment = equipmentStarForce.selectedEquipment;
    if (!equipment) return;

    setIsUsingTicket(true);
    try {
      // 1. DB에서 강화권 차감
      const success = await enhancementTickets.useTicket(ticketLevel);
      if (!success) {
        alert("강화권 사용에 실패했습니다.");
        return;
      }

      // 2. 장비 스타 레벨 업데이트
      await equipmentSystem.updateEquipment(equipment.id, {
        starLevel: ticketLevel,
        consecutiveFails: 0,
      });

      // 3. 강화 기록 저장 (선택적)
      const itemName = getEquipmentName(equipment.equipmentBase, ticketLevel);
      await userData.recordEquipmentEnhancement(
        itemName,
        equipment.starLevel,
        ticketLevel,
        "success",
        false,
        0
      );

      alert(
        `${ticketLevel}성 강화권을 사용하여 장비가 ${ticketLevel}성이 되었습니다!`
      );
    } catch (error) {
      console.error("Enhancement ticket usage failed:", error);
      alert("강화권 사용 중 오류가 발생했습니다.");
    } finally {
      setIsUsingTicket(false);
    }
  };

  // 인벤토리에서 특정 장비에 강화권 사용
  const handleUseTicketOnEquipment = async (
    ticketLevel: number,
    equipment: UserEquipment
  ) => {
    setIsUsingTicket(true);
    try {
      // 1. DB에서 강화권 차감
      const success = await enhancementTickets.useTicket(ticketLevel);
      if (!success) {
        alert("강화권 사용에 실패했습니다.");
        return;
      }

      // 2. 장비 스타 레벨 업데이트
      await equipmentSystem.updateEquipment(equipment.id, {
        starLevel: ticketLevel,
        consecutiveFails: 0,
      });

      // 3. 강화 기록 저장
      const itemName = getEquipmentName(equipment.equipmentBase, ticketLevel);
      await userData.recordEquipmentEnhancement(
        itemName,
        equipment.starLevel,
        ticketLevel,
        "success",
        false,
        0
      );

      alert(
        `${ticketLevel}성 강화권을 사용하여 장비가 ${ticketLevel}성이 되었습니다!`
      );
    } catch (error) {
      console.error("Enhancement ticket usage failed:", error);
      alert("강화권 사용 중 오류가 발생했습니다.");
    } finally {
      setIsUsingTicket(false);
    }
  };

  // 무기 동기화
  useEffect(() => {
    if (userData.weapon) {
      setLocalWeapon(userData.weapon);
      setView("main");
    } else if (!userData.isLoading) {
      setLocalWeapon(null);
      setView("acquire");
    }
  }, [userData.weapon, userData.isLoading]);

  // 관리자 단축키 (Ctrl+Shift+G: 골드 지급, Ctrl+Shift+T: 강화권 지급)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "G") {
        e.preventDefault();
        setShowAdminGold((prev) => !prev);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "T") {
        e.preventDefault();
        setShowAdminTicket((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 스타포스 훅 (로컬 무기 기반)
  const starForce = useStarForce(localWeapon, {
    onSuccess: async (newLevel) => {
      if (!localWeapon) return;
      // 로컬 상태 즉시 업데이트
      setLocalWeapon((prev) =>
        prev
          ? {
              ...prev,
              starLevel: newLevel,
              totalAttack: getTotalAttack(prev.weaponType.baseAttack, newLevel),
              consecutiveFails: 0,
            }
          : null
      );
      // DB 저장
      await userData.updateWeapon({ starLevel: newLevel, consecutiveFails: 0 });
    },
    onMaintain: async () => {
      if (!localWeapon) return;
      const newFails = localWeapon.consecutiveFails + 1;
      setLocalWeapon((prev) =>
        prev ? { ...prev, consecutiveFails: newFails } : null
      );
      await userData.updateWeapon({ consecutiveFails: newFails });
    },
    onDestroy: async () => {
      setLocalWeapon((prev) => (prev ? { ...prev, isDestroyed: true } : null));
      await userData.updateWeapon({ isDestroyed: true });
      setShowDestroyEffect(true);
    },
    onChanceTimeActivated: () => {},
  });

  // 배틀용 무기 및 스탯: 기본 스탯 + 모든 장착 장비의 총 스탯
  const equipmentOnlyStats = equipmentSystem.getEquippedStats();
  const equippedStats = {
    attack: DEFAULT_CHARACTER_STATS.attack + equipmentOnlyStats.attack,
    defense: DEFAULT_CHARACTER_STATS.defense + equipmentOnlyStats.defense,
    hp: DEFAULT_CHARACTER_STATS.hp + equipmentOnlyStats.hp,
    critRate: DEFAULT_CHARACTER_STATS.critRate + equipmentOnlyStats.critRate,
    critDamage:
      DEFAULT_CHARACTER_STATS.critDamage + equipmentOnlyStats.critDamage,
    penetration:
      DEFAULT_CHARACTER_STATS.penetration + equipmentOnlyStats.penetration,
    attackSpeed:
      DEFAULT_CHARACTER_STATS.attackSpeed + equipmentOnlyStats.attackSpeed,
    evasion: DEFAULT_CHARACTER_STATS.evasion + equipmentOnlyStats.evasion,
  };

  const battleWeapon: UserWeapon | null =
    createBattleWeaponFromEquipment(equipmentSystem.equipped, equippedStats) ||
    localWeapon; // 장비가 없으면 레거시 무기 폴백

  // 배틀용 전체 스탯 (장비 스탯 포함)
  const battleSystem = useBattle(battleWeapon, equippedStats);
  const battleCards = useBattleCards();

  // 대기 중인 난이도 (카드 선택 대기)
  const [pendingDifficulty, setPendingDifficulty] =
    useState<AIDifficulty | null>(null);

  // 대결 탭 내 서브 탭 ('ai' | 'tower')
  const [battleSubTab, setBattleSubTab] = useState<"ai" | "tower">("ai");

  // 로딩 화면
  if (authLoading || userData.isLoading || equipmentSystem.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 비로그인 화면
  if (!user) {
    return <LoginScreen />;
  }

  // 골드 관련 계산
  const gold = userData.profile?.gold ?? 20000;
  // 한국 시간 기준 오늘 날짜 (useUserData와 동일한 방식)
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(Date.now() + kstOffset);
  const today = kstDate.toISOString().split("T")[0];
  // 프로필이 로드된 경우에만 일일보상 버튼 표시
  const canClaimDaily =
    userData.profile !== null && userData.profile.lastDailyClaim !== today;

  // 무기 획득
  const handleAcquireWeapon = async (): Promise<UserWeapon> => {
    setIsAcquiring(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const weapon = await userData.acquireWeapon();
    setIsAcquiring(false);
    if (weapon) {
      setLocalWeapon(weapon);
    }
    return weapon!;
  };

  // 획득 확인
  const handleConfirmAcquire = () => {
    setView("main");
    setActiveTab("enhance");
  };

  // Legacy weapon enhancement - now using equipment starforce
  // const handleEnhance = async () => { ... }
  // const handleGetNewWeapon = async () => { ... }

  // 일일 보상 수령
  const handleClaimDaily = async (): Promise<boolean> => {
    return await userData.claimDailyReward(1000);
  };

  // 대결 시작 - 카드 선택 화면 표시
  const handleStartBattle = async (difficulty: AIDifficulty) => {
    if (!dailyBattle.canBattle) return null;
    // 난이도 저장 후 카드 선택 화면 표시
    setPendingDifficulty(difficulty);
    battleCards.startCardSelection();
    return null;
  };

  // 카드 선택 후 실제 대결 시작
  const handleCardSelected = async (cardIndex: number) => {
    if (!pendingDifficulty) return;

    battleCards.selectCard(cardIndex);
    const selectedCard = battleCards.cardSlots[cardIndex]?.card ?? null;

    const battleResult = await battleSystem.startBattle(
      pendingDifficulty,
      selectedCard
    );

    // 대결 종료 즉시 기록 (승패와 관계없이 횟수 차감)
    if (battleResult) {
      const isWin = battleResult.result === "win";
      await dailyBattle.recordBattle(isWin, battleResult.goldReward);
    }

    setPendingDifficulty(null);
  };

  // 카드 선택 취소
  const handleCancelCardSelection = () => {
    battleCards.cancelSelection();
    setPendingDifficulty(null);
  };

  // 대결 보상 수령 (골드만 추가, 기록은 이미 완료)
  const handleClaimBattleReward = async (reward: number) => {
    await userData.updateGold(gold + reward);
  };

  // 대결 종료
  const handleCloseBattle = () => {
    battleSystem.resetBattle();
    battleCards.resetCards();
  };

  // Legacy weapon sell - now using equipment system
  // const handleSellWeapon = async () => { ... }
  // const handleCancelSell = () => { ... }
  // const calcSellPrice = (weapon: UserWeapon): number => { ... }

  const hasWeapon = !!localWeapon && !localWeapon.isDestroyed;
  const hasEquipment = equipmentSystem.inventory.length > 0;
  // 총 전투력 = 기본 스탯 + 장비 스탯 (equippedStats 재사용)
  const totalCombatPower = calculateCombatPower(equippedStats);

  // 착용중인 장비를 맨 위로 정렬
  const sortedInventory = [...equipmentSystem.inventory].sort((a, b) => {
    if (a.isEquipped && !b.isEquipped) return -1;
    if (!a.isEquipped && b.isEquipped) return 1;
    return 0;
  });

  // 장비 탭에서 인벤토리 슬롯 필터 열기
  const handleOpenInventory = (slot: EquipmentSlot) => {
    setInventoryFilterSlot(slot);
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-bg-base)" }}
    >
      {/* 이펙트 */}
      <DestroyEffect
        isActive={showDestroyEffect}
        onComplete={() => setShowDestroyEffect(false)}
      />
      {starForce.lastResult && (
        <EnhanceEffect
          result={starForce.lastResult}
          isEnhancing={starForce.isEnhancing}
        />
      )}

      {/* 헤더 */}
      <header className="px-4 py-3 flex flex-wrap justify-between items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated-1)]">
        <div className="flex items-center gap-3">
          {/* <h1 className="flex items-center">
            <img
              src="/images/logo-mini.png"
              alt="대장간"
              className="h-20 sm:h-12 w-auto drop-shadow-[0_0_8px_rgba(251,146,60,0.3)]"
            />
          </h1> */}
        </div>
        <div className="flex items-center gap-3">
          <GiftIcon
            unclaimedCount={giftSystem.unclaimedCount.total}
            onClick={() => setShowGiftBox(true)}
          />
          <GoldDisplay
            gold={gold}
            canClaimDaily={canClaimDaily}
            onClaimDaily={handleClaimDaily}
          />
          <UserProfile
            username={userData.profile?.username}
            battlesRemaining={dailyBattle.battlesRemaining}
            maxBattles={dailyBattle.maxBattles}
            onUpdateUsername={userData.updateUsername}
            onOpenReferral={() => setShowReferral(true)}
          />
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-6">
        {view === "acquire" ? (
          /* 무기 획득 화면 */
          <div className="flex justify-center">
            <WeaponAcquire
              onAcquire={handleAcquireWeapon}
              acquiredWeapon={localWeapon}
              isAcquiring={isAcquiring}
              onConfirm={handleConfirmAcquire}
            />
          </div>
        ) : (
          /* 메인 게임 화면 */
          <>
            {/* 탭 네비게이션 */}
            <div className="mb-6">
              <NavigationTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasWeapon={hasWeapon}
                hasEquipment={hasEquipment}
              />
            </div>

            {/* 장비 탭 */}
            {activeTab === "equipment" && (
              <div className="flex flex-col gap-6">
                {/* 상단: 슬롯 + 인벤토리 */}
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* 좌측: 장착 슬롯 */}
                  <div className="lg:w-80 flex-shrink-0">
                    <EquipmentSlots
                      equipped={equipmentSystem.equipped}
                      inventory={equipmentSystem.inventory}
                      onEquip={equipmentSystem.equipItem}
                      onUnequip={equipmentSystem.unequipItem}
                      onOpenInventory={handleOpenInventory}
                    />
                  </div>

                  {/* 인벤토리 */}
                  <div id="equipment-inventory" className="flex-1">
                    <EquipmentInventory
                      inventory={equipmentSystem.inventory}
                      onEquip={equipmentSystem.equipItem}
                      onUnequip={equipmentSystem.unequipItem}
                      onSell={async (equipmentId) => {
                        const sellPrice = await equipmentSystem.sellEquipment(
                          equipmentId
                        );
                        if (sellPrice > 0) {
                          await userData.updateGold(gold + sellPrice);
                        }
                        return sellPrice;
                      }}
                      filterSlot={inventoryFilterSlot}
                      onFilterChange={setInventoryFilterSlot}
                      tickets={enhancementTickets.tickets}
                      onUseTicket={handleUseTicketOnEquipment}
                      isUsingTicket={isUsingTicket}
                    />
                  </div>
                </div>

                {/* 하단: 스탯 패널 */}
                <StatsPanel
                  equipmentStats={equipmentSystem.getEquippedStats()}
                />

                {/* 실시간 강화 피드 */}
                <LiveFeed
                  items={liveFeed.items}
                  currentUserId={user?.id}
                  onSendCondolence={(userId, username, historyId) => {
                    setCondolenceTarget({ userId, username, historyId });
                  }}
                />
              </div>
            )}

            {/* 가챠 탭 */}
            {activeTab === "gacha" && (
              <GachaPanel
                gold={gold}
                pullCount={gachaSystem.pullCount}
                isAnimating={gachaSystem.isAnimating}
                lastResults={gachaSystem.lastResults}
                onPullSingle={gachaSystem.pullSingle}
                onPullMulti={gachaSystem.pullMulti}
                onClearResults={gachaSystem.clearResults}
              />
            )}

            {/* 잠재옵션 탭 */}
            {activeTab === "potential" && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 장비 선택 */}
                <div className="lg:w-80 flex-shrink-0">
                  <div className="card">
                    <div className="card-header">
                      <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                        <span className="text-xl">🎒</span>
                        장비 선택
                      </h2>
                    </div>
                    <div className="card-body">
                      <div className="space-y-2 max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
                        {sortedInventory.map((equip) => (
                          <button
                            key={equip.id}
                            onClick={() => setSelectedPotentialEquipment(equip)}
                            className={`
                              list-item w-full min-h-[56px]
                              ${
                                selectedPotentialEquipment?.id === equip.id
                                  ? "ring-2 ring-[var(--color-magic)] bg-[var(--color-magic)]/10"
                                  : ""
                              }
                            `}
                          >
                            <EquipmentImage equipment={equip} size="lg" />
                            <div className="list-item-content">
                              <span className="list-item-title">
                                {getEquipmentName(
                                  equip.equipmentBase,
                                  equip.starLevel
                                )}
                              </span>
                              <span className="list-item-subtitle">
                                잠재옵션{" "}
                                {
                                  equip.potentials.filter((p) => p.isUnlocked)
                                    .length
                                }
                                /3 해제
                              </span>
                            </div>
                            {equip.isEquipped && (
                              <span className="badge badge-success">장착</span>
                            )}
                          </button>
                        ))}
                        {sortedInventory.length === 0 && (
                          <div className="empty-state">
                            <span className="empty-state-icon">📦</span>
                            <span className="empty-state-text">
                              장비가 없습니다
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 잠재옵션 패널 */}
                <div className="flex-1 max-w-md">
                  {selectedPotentialEquipment ? (
                    <PotentialPanel
                      equipment={selectedPotentialEquipment}
                      gold={gold}
                      onReroll={async (equipmentId, lockedLines) => {
                        const equip = equipmentSystem.inventory.find(
                          (e) => e.id === equipmentId
                        );
                        if (!equip) return null;
                        const result = await potentialSystem.doReroll(
                          equip,
                          lockedLines
                        );
                        if (result) {
                          // Update selected equipment with new data
                          const updated = equipmentSystem.inventory.find(
                            (e) => e.id === equipmentId
                          );
                          if (updated) {
                            setSelectedPotentialEquipment({
                              ...updated,
                              potentials: result.newPotentials,
                            });
                          }
                        }
                        return result;
                      }}
                      onUnlockSlot={async (equipmentId, slotIndex) => {
                        const equip = equipmentSystem.inventory.find(
                          (e) => e.id === equipmentId
                        );
                        if (!equip) return null;
                        const result = await potentialSystem.unlockSlot(
                          equip,
                          slotIndex
                        );
                        if (result) {
                          const updated = equipmentSystem.inventory.find(
                            (e) => e.id === equipmentId
                          );
                          if (updated) {
                            setSelectedPotentialEquipment({
                              ...updated,
                              potentials: result.newPotentials,
                            });
                          }
                        }
                        return result;
                      }}
                      onUpdateGold={userData.updateGold}
                    />
                  ) : (
                    <div className="card">
                      <div className="card-body">
                        <div className="empty-state">
                          <span className="empty-state-icon">✨</span>
                          <span className="empty-state-text">
                            좌측에서 장비를 선택하세요
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 강화 탭 */}
            {activeTab === "enhance" && (
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                {/* 좌측: 장비 디스플레이 + 장비 선택 */}
                <div className="lg:w-80 flex-shrink-0 space-y-4">
                  {/* 장비 디스플레이 (선택된 장비) */}
                  {equipmentStarForce.selectedEquipment &&
                    !equipmentStarForce.isDestroyed && (
                      <EquipmentDisplay
                        equipment={equipmentStarForce.selectedEquipment}
                        isEnhancing={equipmentStarForce.isEnhancing}
                      />
                    )}
                  {!equipmentStarForce.selectedEquipment && (
                    <div className="card p-8 text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--color-bg-elevated-2)] flex items-center justify-center">
                        <GiAnvilImpact className="text-4xl text-[var(--color-text-muted)]" />
                      </div>
                      <p className="text-[var(--color-text-secondary)]">
                        아래에서 강화할 장비를 선택하세요
                      </p>
                    </div>
                  )}

                  {/* 장비 선택 리스트 */}
                  <div id="enhance-inventory" className="card">
                    <div className="card-header py-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                          인벤토리
                        </h3>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          장비 {equipmentSystem.inventory.length}개
                          {enhancementTickets.tickets.length > 0 &&
                            ` · 아이템 ${enhancementTickets.tickets.reduce(
                              (sum, t) => sum + t.quantity,
                              0
                            )}개`}
                        </span>
                      </div>
                    </div>
                    <div className="card-body py-2 space-y-3">
                      {/* 장비 목록 */}
                      <div>
                        <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1">
                          <GiSwordman className="text-sm" /> 장비
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
                          {sortedInventory.map((equip) => (
                            <button
                              key={equip.id}
                              onClick={() =>
                                equipmentStarForce.selectEquipment(equip)
                              }
                              className={`
                                flex-shrink-0 w-16 flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                                ${
                                  equipmentStarForce.selectedEquipment?.id ===
                                  equip.id
                                    ? "bg-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]"
                                    : "bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)]"
                                }
                              `}
                            >
                              <div className="relative">
                                <EquipmentImage equipment={equip} size="md" />
                                {equip.starLevel > 0 && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent)] text-black text-[8px] font-bold flex items-center justify-center">
                                    {equip.starLevel}
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] text-[var(--color-text-secondary)] truncate w-full text-center">
                                {
                                  getEquipmentName(
                                    equip.equipmentBase,
                                    equip.starLevel
                                  ).split(" ")[0]
                                }
                              </span>
                            </button>
                          ))}
                          {sortedInventory.length === 0 && (
                            <div className="flex-1 text-center py-4 text-[var(--color-text-muted)] text-sm">
                              장비가 없습니다
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 강화권 목록 */}
                      {enhancementTickets.tickets.length > 0 && (
                        <div>
                          <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1">
                            <GiTicket className="text-sm text-cyan-400" />{" "}
                            강화권
                            <span className="text-[9px] text-gray-500 ml-1">
                              (클릭하여 사용)
                            </span>
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
                            {enhancementTickets.tickets.map((ticket) => (
                              <button
                                key={ticket.ticketLevel}
                                onClick={() => {
                                  // 모달을 열어서 장비 선택
                                  setTicketModalData({ ticket, isOpen: true });
                                }}
                                disabled={isUsingTicket}
                                className="flex-shrink-0 w-16 flex flex-col items-center gap-1 p-2 rounded-lg bg-gradient-to-b from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 hover:border-cyan-400 hover:from-cyan-800/40 hover:to-blue-800/40 transition-all disabled:opacity-50"
                              >
                                <div className="relative">
                                  <img
                                    src={`/images/tickets/${ticket.ticketLevel}.png`}
                                    alt={`${ticket.ticketLevel}성 강화권`}
                                    className="w-10 h-10 object-contain"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-white text-[8px] font-bold flex items-center justify-center">
                                    {ticket.quantity}
                                  </div>
                                </div>
                                <span className="text-[9px] text-cyan-300 font-medium">
                                  {ticket.ticketLevel}성
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 강화 패널 */}
                <div className="flex-1 lg:max-w-md space-y-4">
                  <EquipmentEnhancePanel
                    equipment={equipmentStarForce.selectedEquipment}
                    isEnhancing={equipmentStarForce.isEnhancing}
                    isDestroyed={equipmentStarForce.isDestroyed}
                    lastResult={equipmentStarForce.lastResult}
                    gold={gold}
                    currentLevel={equipmentStarForce.currentLevel}
                    successRate={equipmentStarForce.successRate}
                    maintainRate={equipmentStarForce.maintainRate}
                    destroyRate={equipmentStarForce.destroyRate}
                    enhanceCost={equipmentStarForce.enhanceCost}
                    currentCombatPower={equipmentStarForce.currentCombatPower}
                    nextCombatPower={equipmentStarForce.nextCombatPower}
                    combatPowerGain={equipmentStarForce.combatPowerGain}
                    currentStats={equipmentStarForce.currentStats}
                    statChanges={equipmentStarForce.statChanges}
                    consecutiveFails={equipmentStarForce.consecutiveFails}
                    chanceTimeActive={equipmentStarForce.chanceTimeActive}
                    isMaxLevel={equipmentStarForce.isMaxLevel}
                    isNextSpecialLevel={equipmentStarForce.isNextSpecialLevel}
                    canDestroy={equipmentStarForce.canDestroy}
                    onEnhance={async () => {
                      if (gold < equipmentStarForce.enhanceCost) return null;
                      await userData.updateGold(
                        gold - equipmentStarForce.enhanceCost
                      );
                      return equipmentStarForce.enhance();
                    }}
                    onResetAfterDestroy={equipmentStarForce.resetAfterDestroy}
                    availableTickets={enhancementTickets.getAvailableTicketsForLevel(
                      equipmentStarForce.currentLevel
                    )}
                    allTickets={enhancementTickets.tickets}
                    onUseTicket={handleUseEnhancementTicket}
                    isUsingTicket={isUsingTicket}
                  />

                  {/* 파괴된 장비 복구 패널 */}
                  {equipmentSystem.destroyedEquipments.length > 0 && (
                    <EquipmentRecoveryPanel
                      destroyedEquipments={equipmentSystem.destroyedEquipments}
                      inventory={equipmentSystem.inventory}
                      gold={gold}
                      getRecoveryCost={equipmentSystem.getRecoveryCost}
                      getRecoveryMaterials={
                        equipmentSystem.getRecoveryMaterials
                      }
                      onRecover={async (destroyedId, materialIds) => {
                        const destroyed =
                          equipmentSystem.destroyedEquipments.find(
                            (d) => d.id === destroyedId
                          );
                        if (!destroyed) return;
                        const cost = equipmentSystem.getRecoveryCost(destroyed);
                        if (gold < cost) return;
                        await userData.updateGold(gold - cost);
                        await equipmentSystem.recoverEquipment(
                          destroyedId,
                          materialIds
                        );
                      }}
                      onRemove={equipmentSystem.removeFromDestroyedList}
                    />
                  )}
                </div>
              </div>
            )}

            {/* 대결 탭 (AI 대결 + 수련의 숲 통합) */}
            {activeTab === "battle" && (
              <div className="space-y-4">
                {/* 서브 탭 */}
                <div className="flex justify-center">
                  <div className="inline-flex bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
                    <button
                      onClick={() => setBattleSubTab("ai")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        battleSubTab === "ai"
                          ? "bg-blue-600 text-white shadow-lg"
                          : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                      }`}
                    >
                      <FaRobot className="inline mr-2" />
                      AI 대결
                    </button>
                    <button
                      onClick={() => setBattleSubTab("tower")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        battleSubTab === "tower"
                          ? "bg-purple-600 text-white shadow-lg"
                          : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                      }`}
                    >
                      <GiForestCamp className="inline mr-2" />
                      수련의 숲
                    </button>
                  </div>
                </div>

                {/* AI 대결 */}
                {battleSubTab === "ai" && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* 좌측: 무기 디스플레이 */}
                    <div className="lg:w-80 flex-shrink-0 space-y-4">
                      {battleWeapon && (
                        <WeaponDisplay
                          weapon={battleWeapon}
                          isEnhancing={false}
                        />
                      )}
                      {!battleWeapon && (
                        <div className="card p-6 text-center">
                          <p className="text-[var(--color-text-secondary)]">
                            무기를 장착해주세요
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 우측: 액션 패널 */}
                    <div className="flex-1">
                      {battleWeapon &&
                        (battleSystem.status === "idle" ? (
                          <BattleMatchmaking
                            playerStats={equippedStats}
                            onSelectDifficulty={handleStartBattle}
                            getExpectedReward={battleSystem.getExpectedReward}
                            battlesRemaining={dailyBattle.battlesRemaining}
                            maxBattles={dailyBattle.maxBattles}
                          />
                        ) : (
                          battleSystem.currentBattle && (
                            <BattleArena
                              battle={battleSystem.currentBattle}
                              isMatchmaking={battleSystem.isMatchmaking}
                              isFighting={battleSystem.isFighting}
                              isFinished={battleSystem.isFinished}
                              onClose={handleCloseBattle}
                              onClaimReward={handleClaimBattleReward}
                            />
                          )
                        ))}
                      {!battleWeapon && (
                        <div className="card p-6 text-center">
                          <p className="text-[var(--color-text-secondary)]">
                            장비 탭에서 무기를 장착한 후<br />
                            대결에 참여할 수 있습니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 수련의 숲 */}
                {battleSubTab === "tower" && (
                  <div className="flex justify-center">
                    <TowerArena
                      playerStats={equippedStats}
                      playerName={userData.profile?.username || "모험가"}
                      playerAvatarUrl={
                        user?.user_metadata?.avatar_url ||
                        user?.user_metadata?.picture
                      }
                      gold={gold}
                      onGoldUpdate={async (amount) => {
                        await userData.updateGold(gold + amount);
                      }}
                      onTicketsRefresh={enhancementTickets.refreshTickets}
                    />
                  </div>
                )}
              </div>
            )}

            {/* PvP 탭 (유저 대전) */}
            {activeTab === "pvp" && (
              <div className="flex justify-center">
                <PvPArena
                  playerStats={equippedStats}
                  playerName={userData.profile?.username || "모험가"}
                  playerAvatarUrl={
                    user?.user_metadata?.avatar_url ||
                    user?.user_metadata?.picture
                  }
                  combatPower={totalCombatPower}
                  equipment={equipmentSystem.equipped}
                  gold={gold}
                  onGoldUpdate={async (amount) => {
                    await userData.updateGold(gold + amount);
                  }}
                />
              </div>
            )}

            {/* 판매 탭 (장비 시스템) */}
            {activeTab === "sell" && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 장비 선택 */}
                <div className="lg:w-80 flex-shrink-0">
                  <div className="card">
                    <div className="card-header">
                      <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                        <span className="text-xl">💰</span>
                        판매할 장비
                      </h2>
                    </div>
                    <div className="card-body">
                      <div className="space-y-2 max-h-[50vh] sm:max-h-[500px] overflow-y-auto">
                        {equipmentSystem.inventory
                          .filter((e) => !e.isEquipped)
                          .map((equip) => (
                            <button
                              key={equip.id}
                              onClick={() => setSelectedSellEquipment(equip)}
                              className={`
                                list-item w-full min-h-[56px]
                                ${
                                  selectedSellEquipment?.id === equip.id
                                    ? "ring-2 ring-[var(--color-accent)] bg-[var(--color-accent)]/10"
                                    : ""
                                }
                              `}
                            >
                              <EquipmentImage equipment={equip} size="lg" />
                              <div className="list-item-content">
                                <span className="list-item-title">
                                  {getEquipmentName(
                                    equip.equipmentBase,
                                    equip.starLevel
                                  )}
                                </span>
                                <span className="list-item-subtitle text-[var(--color-accent)]">
                                  ★ {equip.starLevel}
                                </span>
                              </div>
                            </button>
                          ))}
                        {equipmentSystem.inventory.filter((e) => !e.isEquipped)
                          .length === 0 && (
                          <div className="empty-state">
                            <span className="empty-state-icon">📦</span>
                            <span className="empty-state-text">
                              판매 가능한 장비가 없습니다
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 판매 패널 */}
                <div className="flex-1 max-w-md">
                  <EquipmentSellPanel
                    equipment={selectedSellEquipment}
                    onSell={async (equip) => {
                      const sellPrice = await equipmentSystem.sellEquipment(
                        equip.id
                      );
                      if (sellPrice > 0) {
                        await userData.updateGold(gold + sellPrice);
                        setSelectedSellEquipment(null);
                      }
                    }}
                    onCancel={() => setSelectedSellEquipment(null)}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 푸터 */}
      <footer className="py-4 px-4 text-center text-[var(--color-text-muted)] text-xs border-t border-[var(--color-border)] bg-[var(--color-bg-elevated-1)]">
        <p>
          12성 이상에서 파괴 가능 | 2연속 실패 시 찬스타임 | 5, 10, 15, 20성
          100% 성공
        </p>
      </footer>

      {/* 배틀 카드 선택 */}
      {battleCards.isSelectingCards && (
        <BattleCardSelect
          cardSlots={battleCards.cardSlots}
          onReroll={battleCards.rerollCard}
          onSelect={handleCardSelected}
          onCancel={handleCancelCardSelection}
          canReroll={battleCards.canReroll}
        />
      )}

      {/* 친구 초대 패널 */}
      {showReferral && <ReferralPanel onClose={() => setShowReferral(false)} />}

      {/* 선물함 패널 */}
      {showGiftBox && (
        <GiftBoxPanel
          gifts={giftSystem.receivedGifts}
          unclaimedCount={giftSystem.unclaimedCount}
          isLoading={giftSystem.isLoading}
          onClaimCondolence={giftSystem.claimCondolence}
          onClaimEquipment={giftSystem.claimEquipment}
          onClaimGold={giftSystem.claimGold}
          onClaimTicket={giftSystem.claimTicket}
          onEquipmentClaimed={() => equipmentSystem.loadEquipment()}
          onGoldClaimed={(amount) => userData.updateGold(gold + amount)}
          onTicketClaimed={() => enhancementTickets.refreshTickets()}
          onSendEquipment={() => {
            setShowGiftBox(false);
            setShowSendEquipment(true);
          }}
          onClose={() => setShowGiftBox(false)}
          isAdmin={isAdmin}
          onAdminGold={() => {
            setShowGiftBox(false);
            setShowAdminGold(true);
          }}
          onAdminTicket={() => {
            setShowGiftBox(false);
            setShowAdminTicket(true);
          }}
        />
      )}

      {/* 묵념 전송 모달 */}
      {condolenceTarget && (
        <SendCondolenceModal
          targetUserId={condolenceTarget.userId}
          targetUsername={condolenceTarget.username}
          enhancementHistoryId={condolenceTarget.historyId}
          onSend={giftSystem.sendCondolence}
          onClose={() => setCondolenceTarget(null)}
        />
      )}

      {/* 장비 선물 모달 */}
      {showSendEquipment && (
        <SendEquipmentModal
          inventory={equipmentSystem.inventory.filter((e) => !e.isEquipped)}
          onSearch={giftSystem.searchUsers}
          onSend={async (request) => {
            const success = await giftSystem.sendEquipment(request);
            if (success) {
              await equipmentSystem.loadEquipment();
            }
            return success;
          }}
          onClose={() => setShowSendEquipment(false)}
        />
      )}

      {/* 관리자 골드 지급 패널 */}
      {showAdminGold && (
        <AdminGoldPanel
          onSearch={giftSystem.searchUsers}
          onSendGold={giftSystem.sendGold}
          onClose={() => setShowAdminGold(false)}
        />
      )}

      {/* 관리자 강화권 지급 패널 */}
      {showAdminTicket && (
        <AdminTicketPanel
          onSearch={giftSystem.searchUsers}
          onSendTicket={giftSystem.sendTicket}
          onClose={() => setShowAdminTicket(false)}
        />
      )}

      {/* 강화권 사용 모달 */}
      {ticketModalData.isOpen && ticketModalData.ticket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[var(--color-bg-elevated)] rounded-xl border border-cyan-500/30 w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <img
                  src={`/images/tickets/${ticketModalData.ticket.ticketLevel}.png`}
                  alt=""
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <h3 className="font-bold text-white">
                  {ticketModalData.ticket.ticketLevel}성 강화권 사용
                </h3>
              </div>
              <button
                onClick={() =>
                  setTicketModalData({ ticket: null, isOpen: false })
                }
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-gray-400 mb-4">
                강화할 장비를 선택하세요 ({ticketModalData.ticket.ticketLevel}성
                미만의 장비만 표시)
              </p>

              {(() => {
                const eligibleEquipments = equipmentSystem.inventory.filter(
                  (eq) => eq.starLevel < ticketModalData.ticket!.ticketLevel
                );

                if (eligibleEquipments.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <GiSwordman className="text-4xl text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {ticketModalData.ticket.ticketLevel}성 미만의 장비가
                        없습니다
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        강화권보다 낮은 레벨의 장비가 있어야 사용할 수 있습니다
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {eligibleEquipments.map((equipment) => (
                      <button
                        key={equipment.id}
                        onClick={async () => {
                          const ticketLevel =
                            ticketModalData.ticket!.ticketLevel;
                          const confirmed = window.confirm(
                            `${getEquipmentDisplayName(
                              equipment
                            )}에 ${ticketLevel}성 강화권을 사용하시겠습니까?\n\n` +
                              `현재: ${equipment.starLevel}성 → ${ticketLevel}성\n` +
                              `(파괴 없이 즉시 강화됩니다)`
                          );
                          if (confirmed) {
                            await handleUseTicketOnEquipment(
                              ticketLevel,
                              equipment
                            );
                            setTicketModalData({ ticket: null, isOpen: false });
                          }
                        }}
                        disabled={isUsingTicket}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] border border-transparent hover:border-cyan-500/50 transition-all disabled:opacity-50"
                      >
                        <div className="relative">
                          <EquipmentImage equipment={equipment} size="md" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-accent)] text-black text-[9px] font-bold flex items-center justify-center">
                            {equipment.starLevel}
                          </div>
                        </div>
                        <span className="text-[9px] text-[var(--color-text-secondary)] truncate w-full text-center">
                          {getEquipmentDisplayName(equipment).split(" ")[0]}
                        </span>
                        <span className="text-[8px] text-cyan-400">
                          → {ticketModalData.ticket!.ticketLevel}성
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <p className="text-[10px] text-gray-500 text-center">
                강화권 사용 시 파괴 없이 즉시 해당 성급으로 강화됩니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 신규 유저 환영 모달 */}
      {userData.isNewUser && userData.profile && (
        <WelcomeModal
          username={userData.profile.username}
          onComplete={() => {
            userData.clearNewUserFlag();
            // 환영 모달 완료 후 튜토리얼 시작
            tutorial.startTutorial();
          }}
        />
      )}

      {/* 튜토리얼 오버레이 */}
      <TutorialOverlay />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TutorialProvider>
        <GameContent />
      </TutorialProvider>
    </AuthProvider>
  );
}

export default App;
