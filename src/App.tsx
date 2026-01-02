import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginScreen } from './components/LoginScreen'
import { UserProfile } from './components/UserProfile'
import { WeaponDisplay } from './components/WeaponDisplay'
import { WeaponAcquire } from './components/WeaponAcquire'
import { StarForcePanel } from './components/StarForcePanel'
import { GoldDisplay } from './components/GoldDisplay'
import { NavigationTabs, type TabType } from './components/NavigationTabs'
import { BattleMatchmaking } from './components/BattleMatchmaking'
import { BattleArena } from './components/BattleArena'
import { SellPanel } from './components/SellPanel'
import { LiveFeed } from './components/LiveFeed'
import { DestroyEffect } from './components/DestroyEffect'
import { EnhanceEffect } from './components/EnhanceEffect'
import { useUserData } from './hooks/useUserData'
import { useDailyBattle } from './hooks/useDailyBattle'
import { useStarForce } from './hooks/useStarForce'
import { useBattle } from './hooks/useBattle'
import { getTotalAttack, getSellPrice } from './utils/starforce'
import type { AIDifficulty } from './types/battle'
import type { UserWeapon } from './types/weapon'
import { getWeaponComment } from './types/weapon'

type GameView = 'acquire' | 'main'

function GameContent() {
  const { user, isLoading: authLoading } = useAuth()
  const userData = useUserData()
  const dailyBattle = useDailyBattle()

  const [view, setView] = useState<GameView>('acquire')
  const [activeTab, setActiveTab] = useState<TabType>('enhance')
  const [showDestroyEffect, setShowDestroyEffect] = useState(false)
  const [isAcquiring, setIsAcquiring] = useState(false)
  const [localWeapon, setLocalWeapon] = useState<UserWeapon | null>(null)

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
  if (authLoading || userData.isLoading) {
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

  // 강화 실행
  const handleEnhance = async () => {
    if (!starForce.enhanceCost || !localWeapon) return
    if (gold < starForce.enhanceCost) return

    const newGold = gold - starForce.enhanceCost
    await userData.updateGold(newGold)

    const result = await starForce.enhance()

    // 강화 기록 저장
    if (result) {
      await userData.recordEnhancement(
        localWeapon.starLevel,
        result === 'success' ? localWeapon.starLevel + 1 : localWeapon.starLevel,
        result,
        starForce.chanceTimeActive,
        starForce.enhanceCost
      )
    }
  }

  // 새 무기 획득 (파괴 후)
  const handleGetNewWeapon = async () => {
    await userData.removeWeapon()
    setLocalWeapon(null)
    setShowDestroyEffect(false)
    setView('acquire')
  }

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
      <header className="p-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white">⚒️ 대장장이</h1>
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
              />
            </div>

            {/* 탭 콘텐츠 */}
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
                {activeTab === 'enhance' && localWeapon && (
                  <StarForcePanel
                    level={starForce.currentLevel}
                    successRate={starForce.successRate}
                    maintainRate={starForce.maintainRate}
                    destroyRate={starForce.destroyRate}
                    consecutiveFails={starForce.consecutiveFails}
                    chanceTimeActive={starForce.chanceTimeActive}
                    isNextSpecialLevel={starForce.isNextSpecialLevel}
                    isEnhancing={starForce.isEnhancing}
                    isDestroyed={localWeapon.isDestroyed}
                    lastResult={starForce.lastResult}
                    gold={gold}
                    enhanceCost={starForce.enhanceCost}
                    currentAttackBonus={starForce.currentAttackBonus}
                    nextAttackBonus={starForce.nextAttackBonus}
                    canDestroy={starForce.canDestroy}
                    blacksmithComment={getWeaponComment(localWeapon.weaponType, localWeapon.starLevel)}
                    nextLevelComment={getWeaponComment(localWeapon.weaponType, localWeapon.starLevel + 1)}
                    onEnhance={handleEnhance}
                    onGetNewWeapon={handleGetNewWeapon}
                  />
                )}

                {activeTab === 'battle' && localWeapon && (
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

                {activeTab === 'sell' && localWeapon && (
                  <SellPanel
                    weapon={localWeapon}
                    sellPrice={calcSellPrice(localWeapon)}
                    onSell={handleSellWeapon}
                    onCancel={handleCancelSell}
                  />
                )}
              </div>
            </div>

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
