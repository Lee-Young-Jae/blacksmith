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
import { SellPanel } from './components/SellPanel'
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
import { getTotalAttack, getSellPrice } from './utils/starforce'
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

  // 무기 판매
  const handleSellWeapon = async () => {
    if (!localWeapon) return
    const sellPrice = calcSellPrice(localWeapon)
    await userData.updateGold(gold + sellPrice)
    await userData.removeWeapon()
    setLocalWeapon(null)
    setView('acquire')
  }

  // 판매 취소
  const handleCancelSell = () => {
    setActiveTab('enhance')
  }

  // 판매 가격 계산 (starforce.ts의 공식 사용)
  const calcSellPrice = (weapon: UserWeapon): number => {
    const basePrice = weapon.weaponType.sellPriceBase
    return getSellPrice(weapon.starLevel, basePrice)
  }

  const hasWeapon = !!localWeapon && !localWeapon.isDestroyed
  const hasEquipment = equipmentSystem.inventory.length > 0
  const totalCombatPower = equipmentSystem.getTotalCombatPower()

  // 장비 탭에서 인벤토리 슬롯 필터 열기
  const handleOpenInventory = (slot: EquipmentSlot) => {
    setInventoryFilterSlot(slot)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
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
      <header className="p-4 flex flex-wrap justify-between items-center gap-2 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">⚒️ 대장장이</h1>
          {totalCombatPower > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg px-3 py-1">
              <span className="text-xs text-yellow-400">전투력</span>
              <span className="ml-2 font-bold text-yellow-400">{totalCombatPower.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
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
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">🎒</span>
                      장비 선택
                    </h2>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {equipmentSystem.inventory.map(equip => (
                        <button
                          key={equip.id}
                          onClick={() => setSelectedPotentialEquipment(equip)}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-lg transition-all
                            ${selectedPotentialEquipment?.id === equip.id
                              ? 'bg-purple-600/30 border border-purple-500'
                              : 'bg-gray-700 hover:bg-gray-600'
                            }
                          `}
                        >
                          <EquipmentImage equipment={equip} size="lg" />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-white truncate">
                              {equip.equipmentBase.levels[equip.starLevel]?.name || equip.equipmentBase.levels[0].name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {equip.potentials.filter(p => p.isUnlocked).length}/3 해제
                            </div>
                          </div>
                          {equip.isEquipped && (
                            <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">장착</span>
                          )}
                        </button>
                      ))}
                      {equipmentSystem.inventory.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          장비가 없습니다
                        </div>
                      )}
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
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                      <div className="text-4xl mb-4">✨</div>
                      <div className="text-gray-400">
                        좌측에서 장비를 선택하세요
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 강화 탭 */}
            {activeTab === 'enhance' && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 장비 선택 */}
                <div className="lg:w-80 flex-shrink-0">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">⬆️</span>
                      강화할 장비
                    </h2>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {equipmentSystem.inventory.map(equip => (
                        <button
                          key={equip.id}
                          onClick={() => equipmentStarForce.selectEquipment(equip)}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-lg transition-all
                            ${equipmentStarForce.selectedEquipment?.id === equip.id
                              ? 'bg-blue-600/30 border border-blue-500'
                              : 'bg-gray-700 hover:bg-gray-600'
                            }
                          `}
                        >
                          <EquipmentImage equipment={equip} size="lg" />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-white truncate">
                              {equip.equipmentBase.levels[equip.starLevel]?.name || equip.equipmentBase.levels[0].name}
                            </div>
                            <div className="text-xs text-yellow-400">
                              ★ {equip.starLevel}
                            </div>
                          </div>
                          {equip.isEquipped && (
                            <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">장착</span>
                          )}
                        </button>
                      ))}
                      {equipmentSystem.inventory.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          장비가 없습니다
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 강화 패널 */}
                <div className="flex-1 max-w-md">
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
              <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
                {/* 실시간 피드 (데스크톱) */}
                <div className="hidden lg:block">
                  <LiveFeed items={[]} />
                </div>

                {/* 무기 디스플레이 */}
                {localWeapon && (
                  <WeaponDisplay
                    weapon={localWeapon}
                    isEnhancing={starForce.isEnhancing}
                  />
                )}

                {/* 액션 패널 */}
                <div className="w-full max-w-sm">
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
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      판매할 장비
                    </h2>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {equipmentSystem.inventory
                        .filter(e => !e.isEquipped)
                        .map(equip => (
                          <button
                            key={equip.id}
                            onClick={() => setSelectedSellEquipment(equip)}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-lg transition-all
                              ${selectedSellEquipment?.id === equip.id
                                ? 'bg-yellow-600/30 border border-yellow-500'
                                : 'bg-gray-700 hover:bg-gray-600'
                              }
                              ${equip.starLevel === 0 ? 'opacity-50' : ''}
                            `}
                          >
                            <EquipmentImage equipment={equip} size="lg" />
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium text-white truncate">
                                {equip.equipmentBase.levels[equip.starLevel]?.name || equip.equipmentBase.levels[0].name}
                              </div>
                              <div className="text-xs text-yellow-400">
                                ★ {equip.starLevel}
                              </div>
                            </div>
                            {equip.starLevel === 0 && (
                              <span className="text-xs text-gray-400">판매불가</span>
                            )}
                          </button>
                        ))}
                      {equipmentSystem.inventory.filter(e => !e.isEquipped).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          판매 가능한 장비가 없습니다
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 판매 패널 */}
                <div className="flex-1 max-w-md">
                  <EquipmentSellPanel
                    equipment={selectedSellEquipment}
                    gold={gold}
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

            {/* 실시간 피드 (모바일) */}
            <div className="mt-8 lg:hidden flex justify-center">
              <LiveFeed items={[]} />
            </div>
          </>
        )}
      </main>

      {/* 푸터 */}
      <footer className="p-4 text-center text-gray-500 text-sm border-t border-gray-800">
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
