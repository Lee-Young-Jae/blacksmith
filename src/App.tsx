import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginScreen } from './components/LoginScreen'
import { UserProfile } from './components/UserProfile'
import { WeaponDisplay } from './components/WeaponDisplay'
import { WeaponAcquire } from './components/WeaponAcquire'
// import { StarForcePanel } from './components/StarForcePanel'  // Legacy weapon starforce
import { GoldDisplay } from './components/GoldDisplay'
import { NavigationTabs, type TabType } from './components/NavigationTabs'
import { BattleMatchmaking } from './components/BattleMatchmaking'
import { BattleArena } from './components/BattleArena'
import { BattleCardSelect } from './components/BattleCardSelect'
// import { SellPanel } from './components/SellPanel'  // Legacy weapon sell
import { LiveFeed } from './components/LiveFeed'
import { DestroyEffect } from './components/DestroyEffect'
import { EnhanceEffect } from './components/EnhanceEffect'
import { EquipmentSlots, EquipmentInventory, EquipmentImage, EquipmentEnhancePanel, EquipmentSellPanel, EquipmentDisplay } from './components/equipment'
import { StatsPanel } from './components/stats'
import { PotentialPanel } from './components/potential'
import { GachaPanel } from './components/gacha'
import { usePotential } from './hooks/usePotential'
import { useGacha } from './hooks/useGacha'
import { useUserData } from './hooks/useUserData'
import { useDailyBattle } from './hooks/useDailyBattle'
import { useStarForce } from './hooks/useStarForce'
import { useEquipmentStarForce } from './hooks/useEquipmentStarForce'
import { useBattle } from './hooks/useBattle'
import { useBattleCards } from './hooks/useBattleCards'
import { useEquipment } from './hooks/useEquipment'
import { getTotalAttack } from './utils/starforce'
import type { AIDifficulty } from './types/battle'
import type { UserWeapon, WeaponType, WeaponLevel } from './types/weapon'
import { getEquipmentName } from './types/equipment'
import type { EquipmentSlot, UserEquipment } from './types/equipment'
// import { getWeaponComment } from './types/weapon'  // Legacy weapon system

// 장착된 모든 장비 → 배틀용 무기 변환 (전체 스탯 기반)
function createBattleWeaponFromEquipment(
  equippedItems: Partial<Record<EquipmentSlot, UserEquipment>>,
  totalStats: { attack: number }
): UserWeapon | null {
  const equippedWeapon = equippedItems.weapon

  // 장착된 장비가 하나도 없으면 null
  const hasAnyEquipment = Object.values(equippedItems).some(e => e !== undefined)
  if (!hasAnyEquipment) return null

  // 무기가 있으면 무기 정보 사용, 없으면 기본값
  if (equippedWeapon) {
    const weaponLevels: WeaponLevel[] = equippedWeapon.equipmentBase.levels.map(level => ({
      name: level.name,
      comment: level.comment,
      image: level.image,
    }))

    const weaponType: WeaponType = {
      id: equippedWeapon.equipmentBase.id,
      category: 'hammer',
      baseAttack: equippedWeapon.equipmentBase.baseStats.attack || 0,
      sellPriceBase: 0,
      emoji: equippedWeapon.equipmentBase.emoji,
      levels: weaponLevels,
    }

    return {
      id: equippedWeapon.id,
      weaponTypeId: equippedWeapon.equipmentBaseId,
      weaponType,
      starLevel: equippedWeapon.starLevel,
      isDestroyed: false,
      consecutiveFails: equippedWeapon.consecutiveFails,
      createdAt: equippedWeapon.createdAt,
      totalAttack: totalStats.attack, // 모든 장비의 총 공격력
    }
  }

  // 무기 없이 다른 장비만 있는 경우 (맨손 전투)
  const anyEquipment = Object.values(equippedItems).find(e => e !== undefined)!
  const defaultWeaponType: WeaponType = {
    id: 'unarmed',
    category: 'club',
    baseAttack: 0,
    sellPriceBase: 0,
    emoji: '👊',
    levels: [{ name: '맨손', comment: '장비의 힘으로 싸웁니다.', image: undefined }],
  }

  return {
    id: 'equipped-stats',
    weaponTypeId: 'unarmed',
    weaponType: defaultWeaponType,
    starLevel: 0,
    isDestroyed: false,
    consecutiveFails: 0,
    createdAt: anyEquipment.createdAt,
    totalAttack: totalStats.attack, // 모든 장비의 총 공격력
  }
}

type GameView = 'acquire' | 'main'

function GameContent() {
  const { user, isLoading: authLoading } = useAuth()
  const userData = useUserData()
  const dailyBattle = useDailyBattle()
  const equipmentSystem = useEquipment()

  const [view, setView] = useState<GameView>('acquire')
  const [activeTab, setActiveTab] = useState<TabType>('equipment')
  const [showDestroyEffect, setShowDestroyEffect] = useState(false)
  const [isAcquiring, setIsAcquiring] = useState(false)
  const [localWeapon, setLocalWeapon] = useState<UserWeapon | null>(null)
  const [inventoryFilterSlot, setInventoryFilterSlot] = useState<EquipmentSlot | null>(null)
  const [selectedPotentialEquipment, setSelectedPotentialEquipment] = useState<UserEquipment | null>(null)
  const [selectedSellEquipment, setSelectedSellEquipment] = useState<UserEquipment | null>(null)

  // 잠재옵션 훅
  const potentialSystem = usePotential({
    onUpdatePotentials: equipmentSystem.updatePotentials,
  })

  // 가챠 훅
  const gachaSystem = useGacha({
    onAcquireEquipment: equipmentSystem.acquireEquipment,
    onUpdateGold: userData.updateGold,
  })

  // 장비 강화 훅
  const equipmentStarForce = useEquipmentStarForce({
    onSuccess: async (equipment, newLevel) => {
      await equipmentSystem.updateEquipment(equipment.id, {
        starLevel: newLevel,
        consecutiveFails: 0,
      })
    },
    onMaintain: async (equipment, newFails) => {
      await equipmentSystem.updateEquipment(equipment.id, {
        consecutiveFails: newFails,
      })
    },
    onDestroy: async (equipment) => {
      await equipmentSystem.sellEquipment(equipment.id)
    },
    // Sync with inventory for list updates
    inventory: equipmentSystem.inventory,
  })

  // 무기 동기화
  useEffect(() => {
    if (userData.weapon) {
      setLocalWeapon(userData.weapon)
      setView('main')
    } else if (!userData.isLoading) {
      setLocalWeapon(null)
      setView('acquire')
    }
  }, [userData.weapon, userData.isLoading])

  // 스타포스 훅 (로컬 무기 기반)
  const starForce = useStarForce(localWeapon, {
    onSuccess: async (newLevel) => {
      if (!localWeapon) return
      // 로컬 상태 즉시 업데이트
      setLocalWeapon(prev => prev ? {
        ...prev,
        starLevel: newLevel,
        totalAttack: getTotalAttack(prev.weaponType.baseAttack, newLevel),
        consecutiveFails: 0,
      } : null)
      // DB 저장
      await userData.updateWeapon({ starLevel: newLevel, consecutiveFails: 0 })
    },
    onMaintain: async () => {
      if (!localWeapon) return
      const newFails = localWeapon.consecutiveFails + 1
      setLocalWeapon(prev => prev ? { ...prev, consecutiveFails: newFails } : null)
      await userData.updateWeapon({ consecutiveFails: newFails })
    },
    onDestroy: async () => {
      setLocalWeapon(prev => prev ? { ...prev, isDestroyed: true } : null)
      await userData.updateWeapon({ isDestroyed: true })
      setShowDestroyEffect(true)
    },
    onChanceTimeActivated: () => {},
  })

  // 배틀용 무기 및 스탯: 모든 장착 장비의 총 스탯 기반
  const equippedStats = equipmentSystem.getEquippedStats()
  const battleWeapon: UserWeapon | null = createBattleWeaponFromEquipment(
    equipmentSystem.equipped,
    equippedStats
  ) || localWeapon // 장비가 없으면 레거시 무기 폴백

  // 배틀용 전체 스탯 (장비 스탯 포함)
  const battleSystem = useBattle(battleWeapon, equippedStats)
  const battleCards = useBattleCards()

  // 대기 중인 난이도 (카드 선택 대기)
  const [pendingDifficulty, setPendingDifficulty] = useState<AIDifficulty | null>(null)

  // 로딩 화면
  if (authLoading || userData.isLoading || equipmentSystem.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 비로그인 화면
  if (!user) {
    return <LoginScreen />
  }

  // 골드 관련 계산
  const gold = userData.profile?.gold ?? 10000
  const today = new Date().toISOString().split('T')[0]
  const canClaimDaily = userData.profile?.lastDailyClaim !== today

  // 무기 획득
  const handleAcquireWeapon = async (): Promise<UserWeapon> => {
    setIsAcquiring(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    const weapon = await userData.acquireWeapon()
    setIsAcquiring(false)
    if (weapon) {
      setLocalWeapon(weapon)
    }
    return weapon!
  }

  // 획득 확인
  const handleConfirmAcquire = () => {
    setView('main')
    setActiveTab('enhance')
  }

  // Legacy weapon enhancement - now using equipment starforce
  // const handleEnhance = async () => { ... }
  // const handleGetNewWeapon = async () => { ... }

  // 일일 보상 수령
  const handleClaimDaily = async () => {
    await userData.claimDailyReward(1000)
  }

  // 대결 시작 - 카드 선택 화면 표시
  const handleStartBattle = async (difficulty: AIDifficulty) => {
    if (!dailyBattle.canBattle) return null
    // 난이도 저장 후 카드 선택 화면 표시
    setPendingDifficulty(difficulty)
    battleCards.startCardSelection()
    return null
  }

  // 카드 선택 후 실제 대결 시작
  const handleCardSelected = async (cardIndex: number) => {
    if (!pendingDifficulty) return

    battleCards.selectCard(cardIndex)
    const selectedCard = battleCards.cardSlots[cardIndex]?.card ?? null

    const battleResult = await battleSystem.startBattle(pendingDifficulty, selectedCard)

    // 대결 종료 즉시 기록 (승패와 관계없이 횟수 차감)
    if (battleResult) {
      const isWin = battleResult.result === 'win'
      await dailyBattle.recordBattle(isWin, battleResult.goldReward)
    }

    setPendingDifficulty(null)
  }

  // 카드 선택 취소
  const handleCancelCardSelection = () => {
    battleCards.cancelSelection()
    setPendingDifficulty(null)
  }

  // 대결 보상 수령 (골드만 추가, 기록은 이미 완료)
  const handleClaimBattleReward = async (reward: number) => {
    await userData.updateGold(gold + reward)
  }

  // 대결 종료
  const handleCloseBattle = () => {
    battleSystem.resetBattle()
    battleCards.resetCards()
  }

  // Legacy weapon sell - now using equipment system
  // const handleSellWeapon = async () => { ... }
  // const handleCancelSell = () => { ... }
  // const calcSellPrice = (weapon: UserWeapon): number => { ... }

  const hasWeapon = !!localWeapon && !localWeapon.isDestroyed
  const hasEquipment = equipmentSystem.inventory.length > 0
  const totalCombatPower = equipmentSystem.getTotalCombatPower()

  // 착용중인 장비를 맨 위로 정렬
  const sortedInventory = [...equipmentSystem.inventory].sort((a, b) => {
    if (a.isEquipped && !b.isEquipped) return -1
    if (!a.isEquipped && b.isEquipped) return 1
    return 0
  })

  // 장비 탭에서 인벤토리 슬롯 필터 열기
  const handleOpenInventory = (slot: EquipmentSlot) => {
    setInventoryFilterSlot(slot)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
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
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span>⚒️</span>
            <span className="hidden sm:inline">대장장이</span>
          </h1>
          {totalCombatPower > 0 && (
            <div className="info-box warning py-1 px-3 flex items-center gap-2">
              <span className="text-xs text-[var(--color-accent)]">전투력</span>
              <span className="font-bold text-[var(--color-accent)]">{totalCombatPower.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <GoldDisplay
            gold={gold}
            canClaimDaily={canClaimDaily}
            onClaimDaily={handleClaimDaily}
          />
          <UserProfile
            username={userData.profile?.username}
            battlesRemaining={dailyBattle.battlesRemaining}
            onUpdateUsername={userData.updateUsername}
          />
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-6">
        {view === 'acquire' ? (
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
            {activeTab === 'equipment' && (
              <div className="flex flex-col gap-6">
                {/* 상단: 슬롯 + 인벤토리 */}
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* 좌측: 장착 슬롯 */}
                  <div className="lg:w-80 flex-shrink-0 space-y-4">
                    <EquipmentSlots
                      equipped={equipmentSystem.equipped}
                      inventory={equipmentSystem.inventory}
                      onEquip={equipmentSystem.equipItem}
                      onUnequip={equipmentSystem.unequipItem}
                      onOpenInventory={handleOpenInventory}
                    />
                  </div>

                  {/* 인벤토리 */}
                  <div className="flex-1">
                    <EquipmentInventory
                      inventory={equipmentSystem.inventory}
                      onEquip={equipmentSystem.equipItem}
                      onUnequip={equipmentSystem.unequipItem}
                      onSell={equipmentSystem.sellEquipment}
                      filterSlot={inventoryFilterSlot}
                      onFilterChange={setInventoryFilterSlot}
                    />
                  </div>
                </div>

                {/* 하단: 스탯 패널 */}
                <StatsPanel equipmentStats={equipmentSystem.getEquippedStats()} />
              </div>
            )}

            {/* 가챠 탭 */}
            {activeTab === 'gacha' && (
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
            {activeTab === 'potential' && (
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
                        {sortedInventory.map(equip => (
                          <button
                            key={equip.id}
                            onClick={() => setSelectedPotentialEquipment(equip)}
                            className={`
                              list-item w-full min-h-[56px]
                              ${selectedPotentialEquipment?.id === equip.id
                                ? 'ring-2 ring-[var(--color-magic)] bg-[var(--color-magic)]/10'
                                : ''
                              }
                            `}
                          >
                            <EquipmentImage equipment={equip} size="lg" />
                            <div className="list-item-content">
                              <span className="list-item-title">
                                {getEquipmentName(equip.equipmentBase, equip.starLevel)}
                              </span>
                              <span className="list-item-subtitle">
                                잠재옵션 {equip.potentials.filter(p => p.isUnlocked).length}/3 해제
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
                            <span className="empty-state-text">장비가 없습니다</span>
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
                        const equip = equipmentSystem.inventory.find(e => e.id === equipmentId)
                        if (!equip) return null
                        const result = await potentialSystem.doReroll(equip, lockedLines)
                        if (result) {
                          // Update selected equipment with new data
                          const updated = equipmentSystem.inventory.find(e => e.id === equipmentId)
                          if (updated) {
                            setSelectedPotentialEquipment({
                              ...updated,
                              potentials: result.newPotentials,
                            })
                          }
                        }
                        return result
                      }}
                      onUnlockSlot={async (equipmentId, slotIndex) => {
                        const equip = equipmentSystem.inventory.find(e => e.id === equipmentId)
                        if (!equip) return null
                        const result = await potentialSystem.unlockSlot(equip, slotIndex)
                        if (result) {
                          const updated = equipmentSystem.inventory.find(e => e.id === equipmentId)
                          if (updated) {
                            setSelectedPotentialEquipment({
                              ...updated,
                              potentials: result.newPotentials,
                            })
                          }
                        }
                        return result
                      }}
                      onUpdateGold={userData.updateGold}
                    />
                  ) : (
                    <div className="card">
                      <div className="card-body">
                        <div className="empty-state">
                          <span className="empty-state-icon">✨</span>
                          <span className="empty-state-text">좌측에서 장비를 선택하세요</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 강화 탭 */}
            {activeTab === 'enhance' && (
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                {/* 좌측: 장비 디스플레이 + 장비 선택 */}
                <div className="lg:w-80 flex-shrink-0 space-y-4">
                  {/* 장비 디스플레이 (선택된 장비) */}
                  {equipmentStarForce.selectedEquipment && !equipmentStarForce.isDestroyed && (
                    <EquipmentDisplay
                      equipment={equipmentStarForce.selectedEquipment}
                      isEnhancing={equipmentStarForce.isEnhancing}
                    />
                  )}
                  {!equipmentStarForce.selectedEquipment && (
                    <div className="card p-8 text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--color-bg-elevated-2)] flex items-center justify-center">
                        <span className="text-4xl">⬆️</span>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">
                        아래에서 강화할 장비를 선택하세요
                      </p>
                    </div>
                  )}

                  {/* 장비 선택 리스트 */}
                  <div className="card">
                    <div className="card-header py-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">보유 장비</h3>
                        <span className="text-xs text-[var(--color-text-muted)]">{equipmentSystem.inventory.length}개</span>
                      </div>
                    </div>
                    <div className="card-body py-2">
                      {/* 가로 스크롤 그리드 */}
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
                        {sortedInventory.map(equip => (
                          <button
                            key={equip.id}
                            onClick={() => equipmentStarForce.selectEquipment(equip)}
                            className={`
                              flex-shrink-0 w-16 flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                              ${equipmentStarForce.selectedEquipment?.id === equip.id
                                ? 'bg-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]'
                                : 'bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)]'
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
                              {getEquipmentName(equip.equipmentBase, equip.starLevel).split(' ')[0]}
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
                  </div>
                </div>

                {/* 강화 패널 */}
                <div className="flex-1 lg:max-w-md">
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
                    consecutiveFails={equipmentStarForce.consecutiveFails}
                    chanceTimeActive={equipmentStarForce.chanceTimeActive}
                    isMaxLevel={equipmentStarForce.isMaxLevel}
                    isNextSpecialLevel={equipmentStarForce.isNextSpecialLevel}
                    canDestroy={equipmentStarForce.canDestroy}
                    onEnhance={async () => {
                      if (gold < equipmentStarForce.enhanceCost) return null
                      await userData.updateGold(gold - equipmentStarForce.enhanceCost)
                      return equipmentStarForce.enhance()
                    }}
                    onResetAfterDestroy={equipmentStarForce.resetAfterDestroy}
                  />
                </div>
              </div>
            )}

            {/* 대결 탭 (장비 시스템 무기 사용) */}
            {activeTab === 'battle' && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 좌측: 무기 + 실시간 피드 */}
                <div className="lg:w-80 flex-shrink-0 space-y-4">
                  {/* 무기 디스플레이 */}
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

                  {/* 실시간 피드 */}
                  <LiveFeed items={[]} />
                </div>

                {/* 우측: 액션 패널 */}
                <div className="flex-1 max-w-md">
                  {battleWeapon && (
                    battleSystem.status === 'idle' ? (
                      <BattleMatchmaking
                        playerStats={equippedStats}
                        onSelectDifficulty={handleStartBattle}
                        getExpectedReward={battleSystem.getExpectedReward}
                        battlesRemaining={dailyBattle.battlesRemaining}
                        maxBattles={dailyBattle.maxBattles}
                      />
                    ) : battleSystem.currentBattle && (
                      <BattleArena
                        battle={battleSystem.currentBattle}
                        isMatchmaking={battleSystem.isMatchmaking}
                        isFighting={battleSystem.isFighting}
                        isFinished={battleSystem.isFinished}
                        onClose={handleCloseBattle}
                        onClaimReward={handleClaimBattleReward}
                      />
                    )
                  )}
                  {!battleWeapon && (
                    <div className="card p-6 text-center">
                      <p className="text-[var(--color-text-secondary)]">
                        장비 탭에서 무기를 장착한 후<br />대결에 참여할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 판매 탭 (장비 시스템) */}
            {activeTab === 'sell' && (
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
                          .filter(e => !e.isEquipped)
                          .map(equip => (
                            <button
                              key={equip.id}
                              onClick={() => setSelectedSellEquipment(equip)}
                              className={`
                                list-item w-full min-h-[56px]
                                ${selectedSellEquipment?.id === equip.id
                                  ? 'ring-2 ring-[var(--color-accent)] bg-[var(--color-accent)]/10'
                                  : ''
                                }
                              `}
                            >
                              <EquipmentImage equipment={equip} size="lg" />
                              <div className="list-item-content">
                                <span className="list-item-title">
                                  {getEquipmentName(equip.equipmentBase, equip.starLevel)}
                                </span>
                                <span className="list-item-subtitle text-[var(--color-accent)]">
                                  ★ {equip.starLevel}
                                </span>
                              </div>
                            </button>
                          ))}
                        {equipmentSystem.inventory.filter(e => !e.isEquipped).length === 0 && (
                          <div className="empty-state">
                            <span className="empty-state-icon">📦</span>
                            <span className="empty-state-text">판매 가능한 장비가 없습니다</span>
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
                      const sellPrice = await equipmentSystem.sellEquipment(equip.id)
                      if (sellPrice > 0) {
                        await userData.updateGold(gold + sellPrice)
                        setSelectedSellEquipment(null)
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
        <p>12성 이상에서 파괴 가능 | 2연속 실패 시 찬스타임 | 5, 10, 15, 20성 100% 성공</p>
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
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <GameContent />
    </AuthProvider>
  )
}

export default App
