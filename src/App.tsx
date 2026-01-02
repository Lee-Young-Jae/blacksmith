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
// import { SellPanel } from './components/SellPanel'  // Legacy weapon sell
import { LiveFeed } from './components/LiveFeed'
import { DestroyEffect } from './components/DestroyEffect'
import { EnhanceEffect } from './components/EnhanceEffect'
import { EquipmentSlots, EquipmentInventory, EquipmentImage, EquipmentEnhancePanel, EquipmentSellPanel } from './components/equipment'
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
import { useEquipment } from './hooks/useEquipment'
import { getTotalAttack } from './utils/starforce'
import type { AIDifficulty } from './types/battle'
import type { UserWeapon } from './types/weapon'
import type { EquipmentSlot, UserEquipment } from './types/equipment'
// import { getWeaponComment } from './types/weapon'  // Legacy weapon system

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

  const battleSystem = useBattle(localWeapon)

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

  // 대결 시작
  const handleStartBattle = async (difficulty: AIDifficulty) => {
    if (!dailyBattle.canBattle) return null
    const battleResult = await battleSystem.startBattle(difficulty)

    // 대결 종료 즉시 기록 (승패와 관계없이 횟수 차감)
    if (battleResult) {
      const isWin = battleResult.result === 'win'
      await dailyBattle.recordBattle(isWin, battleResult.goldReward)
    }

    return battleResult
  }

  // 대결 보상 수령 (골드만 추가, 기록은 이미 완료)
  const handleClaimBattleReward = async (reward: number) => {
    await userData.updateGold(gold + reward)
  }

  // 대결 종료
  const handleCloseBattle = () => {
    battleSystem.resetBattle()
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
                                {equip.equipmentBase.levels[equip.starLevel]?.name || equip.equipmentBase.levels[0].name}
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
                {/* 장비 선택 - 모바일: 가로 스크롤, 데스크탑: 세로 리스트 */}
                <div className="lg:w-80 flex-shrink-0">
                  {/* 모바일: 가로 스크롤 카드 */}
                  <div className="lg:hidden">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                        <span>⬆️</span>
                        강화할 장비
                      </h2>
                      <span className="text-xs text-[var(--color-text-muted)]">{equipmentSystem.inventory.length}개</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                      {sortedInventory.map(equip => (
                        <button
                          key={equip.id}
                          onClick={() => equipmentStarForce.selectEquipment(equip)}
                          className={`
                            flex-shrink-0 w-20 flex flex-col items-center gap-1 p-2 rounded-xl snap-start
                            bg-[var(--color-bg-elevated-1)] border-2 transition-all
                            ${equipmentStarForce.selectedEquipment?.id === equip.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                              : 'border-[var(--color-border)]'
                            }
                          `}
                        >
                          <div className="relative">
                            <EquipmentImage equipment={equip} size="lg" />
                            {equip.starLevel > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-accent)] text-black text-[10px] font-bold flex items-center justify-center">
                                {equip.starLevel}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--color-text-secondary)] truncate w-full text-center">
                            {(equip.equipmentBase.levels[equip.starLevel]?.name || equip.equipmentBase.levels[0].name).split(' ')[0]}
                          </span>
                          {equip.isEquipped && (
                            <span className="text-[8px] text-[var(--color-success)] font-bold">장착중</span>
                          )}
                        </button>
                      ))}
                      {sortedInventory.length === 0 && (
                        <div className="flex-1 text-center py-4 text-[var(--color-text-muted)] text-sm">
                          장비가 없습니다
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 데스크탑: 세로 리스트 */}
                  <div className="hidden lg:block card">
                    <div className="card-header">
                      <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                        <span className="text-xl">⬆️</span>
                        강화할 장비
                      </h2>
                    </div>
                    <div className="card-body">
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {sortedInventory.map(equip => (
                          <button
                            key={equip.id}
                            onClick={() => equipmentStarForce.selectEquipment(equip)}
                            className={`
                              list-item w-full min-h-[56px]
                              ${equipmentStarForce.selectedEquipment?.id === equip.id
                                ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                : ''
                              }
                            `}
                          >
                            <EquipmentImage equipment={equip} size="lg" />
                            <div className="list-item-content">
                              <span className="list-item-title">
                                {equip.equipmentBase.levels[equip.starLevel]?.name || equip.equipmentBase.levels[0].name}
                              </span>
                              <span className="list-item-subtitle text-[var(--color-accent)]">
                                ★ {equip.starLevel}
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

            {/* 대결 탭 (기존 무기 시스템) */}
            {activeTab === 'battle' && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 좌측: 무기 + 실시간 피드 */}
                <div className="lg:w-80 flex-shrink-0 space-y-4">
                  {/* 무기 디스플레이 */}
                  {localWeapon && (
                    <WeaponDisplay
                      weapon={localWeapon}
                      isEnhancing={starForce.isEnhancing}
                    />
                  )}

                  {/* 실시간 피드 */}
                  <LiveFeed items={[]} />
                </div>

                {/* 우측: 액션 패널 */}
                <div className="flex-1 max-w-md">
                  {localWeapon && (
                    battleSystem.status === 'idle' ? (
                      <BattleMatchmaking
                        weapon={localWeapon}
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
                                ${equip.starLevel === 0 ? 'opacity-50' : ''}
                              `}
                            >
                              <EquipmentImage equipment={equip} size="lg" />
                              <div className="list-item-content">
                                <span className="list-item-title">
                                  {equip.equipmentBase.levels[equip.starLevel]?.name || equip.equipmentBase.levels[0].name}
                                </span>
                                <span className="list-item-subtitle text-[var(--color-accent)]">
                                  ★ {equip.starLevel}
                                </span>
                              </div>
                              {equip.starLevel === 0 && (
                                <span className="badge badge-muted">판매불가</span>
                              )}
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
