/**
 * 수련의 숲 메인 컨테이너
 *
 * 승리 시 자동으로 다음 층 진행, 패배 또는 수동 종료 시 누적 보상 지급
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { CharacterStats } from '../../types/stats'
import { BATTLE_CARD_TIER_COLORS, type BattleCard } from '../../types/battleCard'
import type { TowerEnemy, TowerLeaderboardEntry, TowerSeason, TowerSeasonRewardTier, RewardItem } from '../../types/tower'
import { TOWER_TIER_COLORS, TOWER_TIER_NAMES, formatRewardItem } from '../../types/tower'
import type { OwnedCard, CardSlots } from '../../types/cardDeck'
import { ownedCardToBattleCard, TIER_ORDER } from '../../types/cardDeck'
import { useCardDeck } from '../../hooks/useCardDeck'
import { useTower } from '../../hooks/useTower'
import { createFloorEnemy, calculateFloorReward, isFirstMilestone } from '../../utils/towerBattle'
import { TowerFloorSelect } from './TowerFloorSelect'
import { TowerBattle, type SkillCooldownState } from './TowerBattle'
import { GiForestCamp, GiTwoCoins, GiTrophy, GiCardDraw, GiPodium, GiSettingsKnobs, GiCalendar, GiPresent } from 'react-icons/gi'
import { FaDoorOpen, FaLock, FaUnlock, FaPlay, FaStop, FaPlus, FaChartLine } from 'react-icons/fa'

// =============================================
// 강화권 표시 컴포넌트
// =============================================

function EnhancementTicketDisplay({
  level,
  count,
  size = 'sm',
}: {
  level: number
  count: number
  size?: 'sm' | 'md'
}) {
  const sizeClasses = size === 'md' ? 'w-6 h-6' : 'w-4 h-4'
  const textClasses = size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <span className={`inline-flex items-center gap-1 ${textClasses} text-cyan-400 font-medium`}>
      <img
        src={`/images/tickets/${level}.png`}
        alt={`${level}성 강화권`}
        className={`${sizeClasses} object-contain`}
        onError={(e) => {
          // 이미지 로드 실패 시 숨김
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
      <span>{level}성 강화권</span>
      <span className="text-cyan-300">x{count}</span>
    </span>
  )
}

// =============================================
// 타입 정의
// =============================================

interface TowerArenaProps {
  playerStats: CharacterStats
  playerName: string
  playerAvatarUrl?: string  // 플레이어 프로필 이미지
  gold: number
  onGoldUpdate: (amount: number) => Promise<void>
  onTicketsRefresh?: () => Promise<void>  // 강화권 목록 새로고침
}

type TowerView = 'select' | 'climbing' | 'summary'

interface ClimbingSession {
  startFloor: number
  currentFloor: number
  clearedFloors: number[]
  totalGoldEarned: number
  highestReached: number
  isNewRecord: boolean
}

// 자동 진행 딜레이 (ms) - 허수아비 죽음 모션 후
const AUTO_CONTINUE_DELAY = 1000

// 남은 시간 포맷팅 헬퍼
function formatTimeRemaining(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}일 ${hours % 24}시간`
  }
  if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분`
  }
  if (minutes > 0) {
    return `${minutes}분`
  }
  return '곧 종료'
}

// =============================================
// 카드 선택 컴포넌트
// =============================================

function CardSelector({
  cards,
  selectedSlots,
  onSelect,
}: {
  cards: OwnedCard[]
  selectedSlots: CardSlots
  onSelect: (slotIndex: number, card: OwnedCard | null) => void
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null)

  // 카드를 티어순으로 정렬
  const sortedCards = [...cards].sort(
    (a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier]
  )

  // 이미 선택된 카드 ID
  const selectedIds = selectedSlots.filter(Boolean).map((c) => c!.id)

  return (
    <div className="space-y-3">
      {/* 선택된 슬롯 */}
      <div className="flex gap-2 justify-center">
        {[0, 1, 2].map((slotIndex) => {
          const card = selectedSlots[slotIndex]
          const isActive = activeSlot === slotIndex
          const battleCard = card ? ownedCardToBattleCard(card) : null

          return (
            <div
              key={slotIndex}
              onClick={() => setActiveSlot(isActive ? null : slotIndex)}
              className={`w-24 h-32 rounded-lg border-2 cursor-pointer transition-all ${
                isActive
                  ? 'border-yellow-400 bg-yellow-900/20'
                  : card
                  ? `${BATTLE_CARD_TIER_COLORS[card.tier]} border-current`
                  : 'border-gray-600 border-dashed bg-gray-700/30'
              }`}
            >
              {battleCard ? (
                <div className="h-full flex flex-col items-center justify-center p-1.5">
                  <span className="text-2xl mb-1">
                    {battleCard.emoji}
                  </span>
                  <p className="text-[10px] text-center text-white font-medium line-clamp-1">
                    {battleCard.name}
                  </p>
                  <p className="text-[9px] text-center text-gray-400 mt-0.5 line-clamp-2">
                    {battleCard.description}
                  </p>
                  <p className="text-[8px] text-gray-500 mt-0.5">
                    {battleCard.activationType === 'passive' ? '패시브' : `CD ${battleCard.cooldown}s`}
                  </p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-gray-500 text-xs">
                    슬롯 {slotIndex + 1}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 슬롯 선택 안내 */}
      {activeSlot !== null && (
        <div className="text-center text-xs text-yellow-400">
          슬롯 {activeSlot + 1}에 넣을 카드를 선택하세요
          {selectedSlots[activeSlot] && (
            <button
              onClick={() => {
                onSelect(activeSlot, null)
                setActiveSlot(null)
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
        <div className="max-h-48 overflow-y-auto bg-gray-700/30 rounded-lg p-2">
          <div className="grid grid-cols-2 gap-2">
            {sortedCards.map((card) => {
              const isSelected = selectedIds.includes(card.id)
              const battleCard = ownedCardToBattleCard(card)

              return (
                <button
                  key={card.id}
                  onClick={() => {
                    if (!isSelected) {
                      onSelect(activeSlot, card)
                      setActiveSlot(null)
                    }
                  }}
                  disabled={isSelected}
                  className={`p-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'opacity-40 cursor-not-allowed bg-gray-600'
                      : `${BATTLE_CARD_TIER_COLORS[card.tier]} hover:scale-[1.02] cursor-pointer`
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-lg">{battleCard.emoji}</span>
                    <span className="text-xs font-medium truncate flex-1">
                      {battleCard.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300 line-clamp-1">
                    {battleCard.description}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">
                    {battleCard.activationType === 'passive' ? '패시브' : `CD ${battleCard.cooldown}s`}
                  </p>
                </button>
              )
            })}
          </div>
          {sortedCards.length === 0 && (
            <p className="text-gray-500 text-center py-3 text-sm">
              보유한 카드가 없습니다
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// 메인 컴포넌트
// =============================================

export function TowerArena({
  playerStats,
  playerName,
  playerAvatarUrl,
  gold: _gold,
  onGoldUpdate,
  onTicketsRefresh,
}: TowerArenaProps) {
  const tower = useTower()
  const cardDeck = useCardDeck()
  const [view, setView] = useState<TowerView>('select')
  const [currentEnemy, setCurrentEnemy] = useState<TowerEnemy | null>(null)
  const [session, setSession] = useState<ClimbingSession | null>(null)
  const autoProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 배틀 키 - 층이 바뀔 때마다 변경하여 TowerBattle 리마운트
  const [battleKey, setBattleKey] = useState(0)

  // 층간 유지 상태 (플레이어 HP, 스킬 쿨다운, 보호막)
  const [persistentPlayerHp, setPersistentPlayerHp] = useState<number | undefined>(undefined)
  const [persistentSkillCooldowns, setPersistentSkillCooldowns] = useState<SkillCooldownState[] | undefined>(undefined)
  const [persistentPlayerShield, setPersistentPlayerShield] = useState<number | undefined>(undefined)

  // 리더보드 상태
  const [leaderboard, setLeaderboard] = useState<TowerLeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<number>(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // 관리자 제어 상태
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')

  // 시즌 관리 상태
  const [showSeasonManager, setShowSeasonManager] = useState(false)
  const [allSeasons, setAllSeasons] = useState<TowerSeason[]>([])
  const [currentSeasonRewards, setCurrentSeasonRewards] = useState<TowerSeasonRewardTier[]>([])
  const [showSeasonRewards, setShowSeasonRewards] = useState(false)
  const [newSeasonForm, setNewSeasonForm] = useState({
    name: '',
    description: '',
    endsAt: '',
    rewards: [
      {
        rankFrom: 1, rankTo: 1,
        goldReward: 0, enhancementTicketLevel: 0, enhancementTicketCount: 0,
        rewardItems: [
          { type: 'gold', amount: 50000 },
          { type: 'enhancement_ticket', level: 21, count: 1 },
          { type: 'enhancement_ticket', level: 20, count: 1 },
        ] as RewardItem[],
      },
      {
        rankFrom: 2, rankTo: 3,
        goldReward: 0, enhancementTicketLevel: 0, enhancementTicketCount: 0,
        rewardItems: [
          { type: 'gold', amount: 30000 },
          { type: 'enhancement_ticket', level: 17, count: 1 },
        ] as RewardItem[],
      },
      {
        rankFrom: 4, rankTo: 10,
        goldReward: 0, enhancementTicketLevel: 0, enhancementTicketCount: 0,
        rewardItems: [
          { type: 'gold', amount: 15000 },
          { type: 'enhancement_ticket', level: 15, count: 1 },
        ] as RewardItem[],
      },
      {
        rankFrom: 11, rankTo: 50,
        goldReward: 0, enhancementTicketLevel: 0, enhancementTicketCount: 0,
        rewardItems: [
          { type: 'gold', amount: 5000 },
        ] as RewardItem[],
      },
    ] as TowerSeasonRewardTier[],
  })

  // 시즌 목록 로드
  useEffect(() => {
    if (showSeasonManager && tower.isAdmin) {
      tower.loadAllSeasons().then(setAllSeasons)
    }
  }, [showSeasonManager, tower.isAdmin, tower.loadAllSeasons])

  // 현재 시즌 보상 로드
  useEffect(() => {
    if (tower.activeSeason) {
      tower.loadSeasonRewardTiers(tower.activeSeason.id).then(setCurrentSeasonRewards)
    } else {
      setCurrentSeasonRewards([])
    }
  }, [tower.activeSeason, tower.loadSeasonRewardTiers])

  // 리더보드 로드
  useEffect(() => {
    const loadRankings = async () => {
      const [rankings, rank] = await Promise.all([
        tower.loadLeaderboard(),
        tower.getMyRank(),
      ])
      setLeaderboard(rankings)
      setMyRank(rank)
    }
    loadRankings()
  }, [tower.loadLeaderboard, tower.getMyRank])

  // 카드 덱 상태 (localStorage에서 복원)
  const initialLoadDone = useRef(false)
  const lastOwnedCardsLength = useRef(0)
  const [selectedCards, setSelectedCards] = useState<CardSlots>([null, null, null])

  // localStorage에서 저장된 덱 ID 가져오기
  const getSavedDeckIds = useCallback((): (string | null)[] => {
    try {
      const saved = localStorage.getItem('tower_attack_deck')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {}
    return [null, null, null]
  }, [])

  // 저장된 ID로 실제 카드 객체 찾기
  const restoreDeckFromIds = useCallback((savedIds: (string | null)[]): CardSlots => {
    return savedIds.map(id =>
      id ? cardDeck.ownedCards.find(c => c.id === id) || null : null
    ) as CardSlots
  }, [cardDeck.ownedCards])

  // 초기 로드: ownedCards가 처음 로드될 때 덱 복원
  useEffect(() => {
    if (cardDeck.ownedCards.length === 0) return

    if (!initialLoadDone.current) {
      const savedIds = getSavedDeckIds()
      const restored = restoreDeckFromIds(savedIds)
      setSelectedCards(restored)
      initialLoadDone.current = true
      lastOwnedCardsLength.current = cardDeck.ownedCards.length
      return
    }

    // 카드 수가 줄었을 때만 검증
    if (cardDeck.ownedCards.length < lastOwnedCardsLength.current) {
      setSelectedCards(prev => {
        return prev.map(card => {
          if (!card) return null
          const stillExists = cardDeck.ownedCards.some(c => c.id === card.id)
          return stillExists ? card : null
        }) as CardSlots
      })
    }
    lastOwnedCardsLength.current = cardDeck.ownedCards.length
  }, [cardDeck.ownedCards, getSavedDeckIds, restoreDeckFromIds])

  // 카드 선택 변경 시 localStorage에 저장
  useEffect(() => {
    if (!initialLoadDone.current) return
    const cardIds = selectedCards.map(c => c?.id || null)
    localStorage.setItem('tower_attack_deck', JSON.stringify(cardIds))
  }, [selectedCards])

  // 카드 선택 핸들러
  const handleCardSelect = useCallback((slotIndex: number, card: OwnedCard | null) => {
    const newSlots = [...selectedCards] as CardSlots
    newSlots[slotIndex] = card
    setSelectedCards(newSlots)
  }, [selectedCards])

  // 선택된 카드를 BattleCard 배열로 변환
  const getSelectedBattleCards = useCallback((): BattleCard[] => {
    return selectedCards
      .filter((c): c is OwnedCard => c !== null)
      .map(ownedCardToBattleCard)
  }, [selectedCards])

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (autoProgressTimerRef.current) {
        clearTimeout(autoProgressTimerRef.current)
      }
    }
  }, [])

  // 등반 시작
  const handleStartClimbing = useCallback((floor: number) => {
    const enemy = createFloorEnemy(floor)
    setCurrentEnemy(enemy)
    setSession({
      startFloor: floor,
      currentFloor: floor,
      clearedFloors: [],
      totalGoldEarned: 0,
      highestReached: floor,
      isNewRecord: false,
    })
    setView('climbing')
    // 새 등반 시작 시 유지 상태 초기화 (풀 HP, 쿨다운 없음, 보호막 없음)
    setPersistentPlayerHp(undefined)
    setPersistentSkillCooldowns(undefined)
    setPersistentPlayerShield(undefined)
    setBattleKey(prev => prev + 1)  // 배틀 리셋
  }, [])

  // 승리 시 호출 (TowerBattle에서 허수아비 사망 모션 후 호출)
  const handleVictory = useCallback(async (result: {
    timeRemaining: number
    playerDamageDealt: number
    enemyDamageDealt: number
    playerFinalHp: number
    enemyFinalHp: number
    skillCooldowns: SkillCooldownState[]
    playerShield: number
  }) => {
    if (!currentEnemy || !tower.progress || !session) return

    const floor = currentEnemy.floor
    const isFirstMilestoneFloor = isFirstMilestone(floor, tower.progress.firstClearMilestones)
    const isNewRecord = floor > tower.progress.highestFloor
    const reward = calculateFloorReward(floor, isFirstMilestoneFloor, isNewRecord)

    // 세션 업데이트
    setSession(prev => prev ? {
      ...prev,
      clearedFloors: [...prev.clearedFloors, floor],
      totalGoldEarned: prev.totalGoldEarned + reward.totalGold,
      highestReached: Math.max(prev.highestReached, floor),
      isNewRecord: isNewRecord || prev.isNewRecord,
    } : null)

    // DB 기록 (보상은 아직 지급하지 않음)
    await tower.recordBattleResult(
      floor,
      true,
      result.timeRemaining,
      result.playerDamageDealt,
      result.enemyDamageDealt,
      result.playerFinalHp,
      result.enemyFinalHp
    )

    // 층간 유지 상태 저장 (플레이어 HP, 스킬 쿨다운, 보호막)
    setPersistentPlayerHp(result.playerFinalHp)
    setPersistentSkillCooldowns(result.skillCooldowns)
    setPersistentPlayerShield(result.playerShield)

    // 자동 다음 층 진행 (허수아비 사망 모션 후 1초 대기)
    autoProgressTimerRef.current = setTimeout(() => {
      const nextFloor = floor + 1
      tower.selectFloor(nextFloor)
      const nextEnemy = createFloorEnemy(nextFloor)
      setCurrentEnemy(nextEnemy)
      setSession(prev => prev ? { ...prev, currentFloor: nextFloor } : null)
      setBattleKey(prev => prev + 1) // TowerBattle 리마운트 (이제 이전 층 상태가 전달됨)
    }, AUTO_CONTINUE_DELAY)
  }, [currentEnemy, tower, session])

  // 패배 시 호출
  const handleDefeat = useCallback(async (result: {
    timeRemaining: number
    playerDamageDealt: number
    enemyDamageDealt: number
    playerFinalHp: number
    enemyFinalHp: number
  }) => {
    if (!currentEnemy || !tower.progress || !session) return

    const floor = currentEnemy.floor

    // DB 기록
    await tower.recordBattleResult(
      floor,
      false,
      result.timeRemaining,
      result.playerDamageDealt,
      result.enemyDamageDealt,
      result.playerFinalHp,
      result.enemyFinalHp
    )

    // 누적 보상 지급
    if (session.totalGoldEarned > 0) {
      await onGoldUpdate(session.totalGoldEarned)
    }

    setView('summary')
  }, [currentEnemy, tower, session, onGoldUpdate])

  // 수동 등반 종료
  const handleEndClimbing = useCallback(async () => {
    if (autoProgressTimerRef.current) {
      clearTimeout(autoProgressTimerRef.current)
    }

    // 누적 보상 지급
    if (session && session.totalGoldEarned > 0) {
      await onGoldUpdate(session.totalGoldEarned)
    }

    setView('summary')
  }, [session, onGoldUpdate])

  // 층 선택으로 돌아가기
  const handleBackToSelect = useCallback(() => {
    setSession(null)
    setCurrentEnemy(null)
    setView('select')
  }, [])

  // 로딩 중
  if (tower.isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="bg-gray-800/50 rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 에러
  if (tower.error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-8 text-center">
          <p className="text-red-400">{tower.error}</p>
          <button
            onClick={() => tower.refreshProgress()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  // 관리자 타워 상태 변경 핸들러
  const handleToggleTower = async () => {
    if (!tower.towerStatus) return
    const newStatus = !tower.towerStatus.isOpen
    await tower.setTowerOpen(newStatus, adminMessage || undefined)
    setAdminMessage('')
    setShowAdminPanel(false)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GiForestCamp className="text-3xl text-emerald-400" />
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                수련의 숲
                {tower.towerStatus && !tower.towerStatus.isOpen && (
                  <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full">점검중</span>
                )}
              </h2>
              <p className="text-sm text-gray-400">
                최고 기록: <span className="text-yellow-400 font-bold">{tower.progress?.highestFloor || 0}층</span>
                {myRank > 0 && <span className="text-purple-400 ml-2">(#{myRank})</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 리더보드 버튼 */}
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`p-2 rounded-lg transition-all ${
                showLeaderboard
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
              title="랭킹"
            >
              <GiPodium className="text-xl" />
            </button>

            {/* 관리자 버튼 */}
            {tower.isAdmin && (
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className={`p-2 rounded-lg transition-all ${
                  showAdminPanel
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
                title="관리자 설정"
              >
                <GiSettingsKnobs className="text-xl" />
              </button>
            )}

            {view === 'climbing' && session && (
              <div className="text-right ml-2">
                <p className="text-sm text-gray-400">누적 보상</p>
                <p className="text-xl font-bold text-yellow-400">{session.totalGoldEarned.toLocaleString()} G</p>
              </div>
            )}

            {view === 'select' && tower.progress && !showLeaderboard && !showAdminPanel && (
              <div className="text-right ml-2">
                <p className="text-sm text-gray-400">현재 도전</p>
                <p className="text-2xl font-bold text-purple-400">{tower.progress.currentFloor}층</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 관리자 패널 */}
      {showAdminPanel && tower.isAdmin && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
            <GiSettingsKnobs /> 관리자 설정
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">타워 상태</span>
              <span className={tower.towerStatus?.isOpen ? 'text-green-400' : 'text-red-400'}>
                {tower.towerStatus?.isOpen ? '오픈' : '닫힘'}
              </span>
            </div>
            <input
              type="text"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="상태 메시지 (선택사항)"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            />
            <button
              onClick={handleToggleTower}
              className={`w-full py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                tower.towerStatus?.isOpen
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {tower.towerStatus?.isOpen ? (
                <>
                  <FaLock /> 타워 닫기
                </>
              ) : (
                <>
                  <FaUnlock /> 타워 열기
                </>
              )}
            </button>

            {/* 시즌 관리 토글 */}
            <div className="border-t border-red-500/30 pt-3 mt-3">
              <button
                onClick={() => setShowSeasonManager(!showSeasonManager)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                <GiCalendar /> {showSeasonManager ? '시즌 관리 닫기' : '시즌 관리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시즌 관리 패널 (관리자) */}
      {showSeasonManager && tower.isAdmin && (
        <div className="bg-purple-900/30 border border-purple-500/50 rounded-xl p-4 mb-4 space-y-4">
          <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
            <GiCalendar /> 시즌 관리
          </h3>

          {/* 현재 활성 시즌 */}
          {tower.activeSeason && (() => {
            const isExpired = new Date(tower.activeSeason.endsAt) < new Date()
            return (
              <div className={`rounded-lg p-3 ${isExpired ? 'bg-red-900/50 border-2 border-red-500' : 'bg-green-900/30 border border-green-500/50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold text-sm ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                    현재 활성 시즌
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`}>
                    {isExpired ? '⚠️ 만료됨 - 종료 필요!' : '진행중'}
                  </span>
                </div>
                <p className="text-white font-medium">{tower.activeSeason.name}</p>
                {tower.activeSeason.description && (
                  <p className="text-gray-400 text-sm mt-1">{tower.activeSeason.description}</p>
                )}
                <p className={`text-xs mt-2 ${isExpired ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                  {isExpired ? '⚠️ ' : ''}종료 예정: {new Date(tower.activeSeason.endsAt).toLocaleString('ko-KR')}
                  {isExpired && ' (이미 지남)'}
                </p>

                {isExpired && (
                  <div className="mt-2 p-2 bg-red-800/50 rounded-lg text-xs text-red-200">
                    ⚠️ 시즌이 만료되었습니다! 아래 버튼을 눌러 시즌을 종료하고 보상을 배분해주세요.
                  </div>
                )}

                {/* 현재 랭킹 미리보기 */}
                <div className="mt-3 p-2 bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                    <FaChartLine className="text-purple-400" /> 현재 랭킹 (상위 10명) - 시즌 종료 시 보상 배분 대상
                  </p>
                  {leaderboard.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {leaderboard.slice(0, 10).map((entry) => (
                        <div key={entry.userId} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">
                            #{entry.rank} {entry.username}
                          </span>
                          <span className="text-purple-400">{entry.highestFloor}층</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-red-400">
                      ⚠️ 등반 기록이 있는 유저가 없습니다. 시즌 종료 시 보상 대상자가 없을 수 있습니다.
                    </p>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (confirm('정말 시즌을 종료하시겠습니까?\n\n현재 랭킹 기준으로 보상이 배분됩니다.')) {
                      const count = await tower.endSeason(tower.activeSeason!.id)
                      if (count > 0) {
                        alert(`✅ 시즌 종료 완료!\n\n${count}명의 유저에게 보상이 배분되었습니다.\n유저들은 수련의 숲 탭에서 보상을 수령할 수 있습니다.`)
                      } else {
                        alert('⚠️ 시즌은 종료되었지만 보상 대상 유저가 없습니다.\n(등반 기록이 있는 유저가 없거나, 보상 티어에 해당하는 유저가 없습니다)')
                      }
                      tower.loadAllSeasons().then(setAllSeasons)
                    }
                  }}
                  className={`w-full mt-3 py-2 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${
                    isExpired
                      ? 'bg-red-600 hover:bg-red-500 animate-pulse'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  <FaStop /> {isExpired ? '지금 시즌 종료하기!' : '시즌 종료 및 보상 배분'}
                </button>
              </div>
            )
          })()}

          {/* 새 시즌 생성 폼 */}
          {!tower.activeSeason && (
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm text-white font-bold flex items-center gap-2">
                <FaPlus className="text-green-400" /> 새 시즌 생성
              </h4>

              {/* 기본 정보 섹션 */}
              <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">기본 정보</p>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">시즌 이름 *</label>
                  <input
                    type="text"
                    value={newSeasonForm.name}
                    onChange={(e) => setNewSeasonForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 시즌 1, 봄맞이 시즌"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">설명 (선택)</label>
                  <input
                    type="text"
                    value={newSeasonForm.description}
                    onChange={(e) => setNewSeasonForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="시즌에 대한 간단한 설명"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 기간 설정 섹션 */}
              <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">시즌 기간</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { label: '1주', days: 7 },
                    { label: '2주', days: 14 },
                    { label: '1달', days: 30 },
                    { label: '2달', days: 60 },
                  ].map(({ label, days }) => (
                    <button
                      key={days}
                      onClick={() => {
                        const endDate = new Date()
                        endDate.setDate(endDate.getDate() + days)
                        endDate.setHours(23, 59, 0, 0)
                        const formatted = endDate.toISOString().slice(0, 16)
                        setNewSeasonForm(prev => ({ ...prev, endsAt: formatted }))
                      }}
                      className="px-3 py-1.5 text-xs bg-purple-600/50 hover:bg-purple-600 text-purple-200 rounded-lg transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">종료 일시 *</label>
                  <input
                    type="datetime-local"
                    value={newSeasonForm.endsAt}
                    onChange={(e) => setNewSeasonForm(prev => ({ ...prev, endsAt: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                {newSeasonForm.endsAt && (
                  <p className="text-xs text-purple-300">
                    {new Date(newSeasonForm.endsAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })} 까지
                  </p>
                )}
              </div>

              {/* 보상 티어 섹션 */}
              <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 font-medium">순위별 보상</p>
                  <button
                    onClick={() => {
                      const lastTier = newSeasonForm.rewards[newSeasonForm.rewards.length - 1]
                      const newRankFrom = lastTier ? lastTier.rankTo + 1 : 1
                      setNewSeasonForm(prev => ({
                        ...prev,
                        rewards: [...prev.rewards, {
                          rankFrom: newRankFrom,
                          rankTo: newRankFrom + 9,
                          goldReward: 0,
                          enhancementTicketLevel: 0,
                          enhancementTicketCount: 0,
                          rewardItems: [{ type: 'gold', amount: 1000 }] as RewardItem[],
                        }],
                      }))
                    }}
                    className="text-xs px-2 py-1 bg-green-600/50 hover:bg-green-600 text-green-200 rounded transition-colors"
                  >
                    + 티어 추가
                  </button>
                </div>

                <div className="space-y-3">
                  {newSeasonForm.rewards.map((tier, tierIdx) => (
                    <div key={tierIdx} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      {/* 티어 헤더 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white font-bold bg-purple-600/50 px-2 py-0.5 rounded">
                            티어 {tierIdx + 1}
                          </span>
                          {/* 순위 범위 입력 */}
                          <div className="flex items-center gap-1 text-xs">
                            <input
                              type="number"
                              value={tier.rankFrom}
                              onChange={(e) => {
                                const newRewards = [...newSeasonForm.rewards]
                                newRewards[tierIdx] = { ...tier, rankFrom: parseInt(e.target.value) || 1 }
                                setNewSeasonForm(prev => ({ ...prev, rewards: newRewards }))
                              }}
                              min={1}
                              className="w-10 px-1 py-0.5 bg-gray-700 border border-gray-600 rounded text-white text-center text-xs"
                            />
                            <span className="text-gray-400">~</span>
                            <input
                              type="number"
                              value={tier.rankTo}
                              onChange={(e) => {
                                const newRewards = [...newSeasonForm.rewards]
                                newRewards[tierIdx] = { ...tier, rankTo: parseInt(e.target.value) || tier.rankFrom }
                                setNewSeasonForm(prev => ({ ...prev, rewards: newRewards }))
                              }}
                              min={tier.rankFrom}
                              className="w-10 px-1 py-0.5 bg-gray-700 border border-gray-600 rounded text-white text-center text-xs"
                            />
                            <span className="text-gray-400">위</span>
                          </div>
                        </div>
                        {newSeasonForm.rewards.length > 1 && (
                          <button
                            onClick={() => {
                              setNewSeasonForm(prev => ({
                                ...prev,
                                rewards: prev.rewards.filter((_, i) => i !== tierIdx),
                              }))
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            티어 삭제
                          </button>
                        )}
                      </div>

                      {/* 보상 아이템 목록 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">보상 아이템</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const newRewards = [...newSeasonForm.rewards]
                                const items = [...(tier.rewardItems || [])]
                                items.push({ type: 'gold', amount: 10000 })
                                newRewards[tierIdx] = { ...tier, rewardItems: items as RewardItem[] }
                                setNewSeasonForm(prev => ({ ...prev, rewards: newRewards }))
                              }}
                              className="text-[10px] px-1.5 py-0.5 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded transition-colors"
                            >
                              + 골드
                            </button>
                            <button
                              onClick={() => {
                                const newRewards = [...newSeasonForm.rewards]
                                const items = [...(tier.rewardItems || [])]
                                items.push({ type: 'enhancement_ticket', level: 17, count: 1 })
                                newRewards[tierIdx] = { ...tier, rewardItems: items as RewardItem[] }
                                setNewSeasonForm(prev => ({ ...prev, rewards: newRewards }))
                              }}
                              className="text-[10px] px-1.5 py-0.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded transition-colors"
                            >
                              + 강화권
                            </button>
                          </div>
                        </div>

                        {/* 보상 아이템 리스트 */}
                        {(tier.rewardItems || []).map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-2 p-2 bg-gray-900/50 rounded border border-gray-600">
                            {item.type === 'gold' ? (
                              <>
                                <span className="text-yellow-400 text-sm">💰</span>
                                <input
                                  type="number"
                                  value={(item as { type: 'gold'; amount: number }).amount}
                                  onChange={(e) => {
                                    const newRewards = [...newSeasonForm.rewards]
                                    const items = [...(tier.rewardItems || [])]
                                    items[itemIdx] = { type: 'gold', amount: parseInt(e.target.value) || 0 }
                                    newRewards[tierIdx] = { ...tier, rewardItems: items as RewardItem[] }
                                    setNewSeasonForm(prev => ({ ...prev, rewards: newRewards }))
                                  }}
                                  min={0}
                                  step={1000}
                                  className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                                />
                                <span className="text-yellow-400 text-xs">골드</span>
                              </>
                            ) : item.type === 'enhancement_ticket' ? (
                              <>
                                <span className="text-cyan-400 text-sm">🎫</span>
                                <input
                                  type="number"
                                  value={(item as { type: 'enhancement_ticket'; level: number; count: number }).level}
                                  onChange={(e) => {
                                    const newRewards = [...newSeasonForm.rewards]
                                    const items = [...(tier.rewardItems || [])]
                                    const ticketItem = item as { type: 'enhancement_ticket'; level: number; count: number }
                                    items[itemIdx] = { type: 'enhancement_ticket', level: parseInt(e.target.value) || 1, count: ticketItem.count }
                                    newRewards[tierIdx] = { ...tier, rewardItems: items as RewardItem[] }
                                    setNewSeasonForm(prev => ({ ...prev, rewards: newRewards }))
                                  }}
                                  min={1}
                                  max={25}
                                  className="w-12 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs text-center"
                                />
                                <span className="text-cyan-400 text-xs">성</span>
                                <span className="text-gray-500 text-xs">x</span>
                                <input
                                  type="number"
                                  value={(item as { type: 'enhancement_ticket'; level: number; count: number }).count}
                                  onChange={(e) => {
                                    const newRewards = [...newSeasonForm.rewards]
                                    const items = [...(tier.rewardItems || [])]
                                    const ticketItem = item as { type: 'enhancement_ticket'; level: number; count: number }
                                    items[itemIdx] = { type: 'enhancement_ticket', level: ticketItem.level, count: parseInt(e.target.value) || 1 }
                                    newRewards[tierIdx] = { ...tier, rewardItems: items as RewardItem[] }
                                    setNewSeasonForm(prev => ({ ...prev, rewards: newRewards }))
                                  }}
                                  min={1}
                                  className="w-10 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs text-center"
                                />
                                <span className="text-cyan-400 text-xs">개</span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs">알 수 없는 보상 타입</span>
                            )}
                            <button
                              onClick={() => {
                                const newRewards = [...newSeasonForm.rewards]
                                const items = [...(tier.rewardItems || [])].filter((_, i) => i !== itemIdx)
                                newRewards[tierIdx] = { ...tier, rewardItems: items as RewardItem[] }
                                setNewSeasonForm(prev => ({ ...prev, rewards: newRewards }))
                              }}
                              className="ml-auto text-xs text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {(!tier.rewardItems || tier.rewardItems.length === 0) && (
                          <p className="text-[10px] text-gray-500 text-center py-2">
                            위 버튼으로 보상을 추가하세요
                          </p>
                        )}
                      </div>

                      {/* 티어 미리보기 */}
                      {tier.rewardItems && tier.rewardItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                          <span className="text-purple-300">
                            {tier.rankFrom === tier.rankTo ? `${tier.rankFrom}위` : `${tier.rankFrom}~${tier.rankTo}위`}:
                          </span>
                          {tier.rewardItems.map((item, i) => (
                            <span key={i} className={`ml-1 ${item.type === 'gold' ? 'text-yellow-400' : 'text-cyan-400'}`}>
                              {i > 0 && ' + '}
                              {formatRewardItem(item)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-gray-500">
                  💡 각 티어에 골드, 강화권 등 여러 보상을 추가할 수 있습니다.
                </p>
              </div>

              {/* 생성 버튼 */}
              <button
                onClick={async () => {
                  if (!newSeasonForm.name || !newSeasonForm.endsAt) {
                    alert('시즌 이름과 종료 일시를 입력하세요.')
                    return
                  }
                  const seasonId = await tower.createSeason({
                    name: newSeasonForm.name,
                    description: newSeasonForm.description || undefined,
                    startsAt: new Date(),
                    endsAt: new Date(newSeasonForm.endsAt),
                    rewards: newSeasonForm.rewards,
                  })
                  if (seasonId) {
                    // 바로 활성화 (새 시즌은 기본적으로 기록 초기화)
                    const resetRecords = window.confirm(
                      '시즌을 생성하고 바로 활성화하시겠습니까?\n\n' +
                      '⚠️ 확인: 모든 유저의 타워 기록이 초기화됩니다.\n' +
                      '취소: 기록을 유지하며 시즌만 활성화됩니다.'
                    )
                    await tower.activateSeason(seasonId, resetRecords)
                    alert(resetRecords
                      ? '시즌이 생성되고 활성화되었습니다! 기록이 초기화되었습니다.'
                      : '시즌이 생성되고 활성화되었습니다! 기록은 유지됩니다.'
                    )
                    setNewSeasonForm({
                      name: '',
                      description: '',
                      endsAt: '',
                      rewards: [
                        {
                          rankFrom: 1, rankTo: 1,
                          goldReward: 0, enhancementTicketLevel: 0, enhancementTicketCount: 0,
                          rewardItems: [
                            { type: 'gold', amount: 50000 },
                            { type: 'enhancement_ticket', level: 21, count: 1 },
                            { type: 'enhancement_ticket', level: 20, count: 1 },
                          ] as RewardItem[],
                        },
                        {
                          rankFrom: 2, rankTo: 3,
                          goldReward: 0, enhancementTicketLevel: 0, enhancementTicketCount: 0,
                          rewardItems: [
                            { type: 'gold', amount: 30000 },
                            { type: 'enhancement_ticket', level: 17, count: 1 },
                          ] as RewardItem[],
                        },
                        {
                          rankFrom: 4, rankTo: 10,
                          goldReward: 0, enhancementTicketLevel: 0, enhancementTicketCount: 0,
                          rewardItems: [
                            { type: 'gold', amount: 15000 },
                            { type: 'enhancement_ticket', level: 15, count: 1 },
                          ] as RewardItem[],
                        },
                        {
                          rankFrom: 11, rankTo: 50,
                          goldReward: 0, enhancementTicketLevel: 0, enhancementTicketCount: 0,
                          rewardItems: [
                            { type: 'gold', amount: 5000 },
                          ] as RewardItem[],
                        },
                      ],
                    })
                    tower.loadAllSeasons().then(setAllSeasons)
                  }
                }}
                disabled={!newSeasonForm.name || !newSeasonForm.endsAt}
                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                <FaPlus /> 시즌 생성 및 시작
              </button>
            </div>
          )}

          {/* 과거 시즌 목록 */}
          {allSeasons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs text-gray-400">시즌 기록</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {allSeasons.map((season) => (
                  <div
                    key={season.id}
                    className={`p-2 rounded-lg text-xs ${
                      season.isActive
                        ? 'bg-green-900/30 border border-green-500/30'
                        : 'bg-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{season.name}</span>
                      <span className={season.isActive ? 'text-green-400' : season.rewardsDistributed ? 'text-gray-500' : 'text-yellow-400'}>
                        {season.isActive ? '진행중' : season.rewardsDistributed ? '종료됨' : '대기중'}
                      </span>
                    </div>
                    <p className="text-gray-500 mt-1">
                      {new Date(season.startsAt).toLocaleDateString('ko-KR')} ~ {new Date(season.endsAt).toLocaleDateString('ko-KR')}
                    </p>
                    {!season.isActive && !season.rewardsDistributed && (
                      <button
                        onClick={async () => {
                          const resetRecords = window.confirm(
                            '시즌을 활성화하시겠습니까?\n\n' +
                            '⚠️ 확인: 모든 유저의 타워 기록(최고층, 시도횟수)이 초기화됩니다.\n' +
                            '취소: 기록을 유지하며 시즌만 활성화됩니다.'
                          )
                          await tower.activateSeason(season.id, resetRecords)
                          tower.loadAllSeasons().then(setAllSeasons)
                          alert(resetRecords ? '시즌 활성화 완료! 기록이 초기화되었습니다.' : '시즌 활성화 완료! 기록은 유지됩니다.')
                        }}
                        className="mt-2 w-full py-1 bg-purple-600 hover:bg-purple-500 rounded text-white text-xs flex items-center justify-center gap-1"
                      >
                        <FaPlay /> 활성화
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 리더보드 */}
      {showLeaderboard && (
        <div className="bg-gray-800/50 border border-yellow-500/30 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
            <GiPodium /> 등반 랭킹 TOP 50
          </h3>
          {leaderboard.length > 0 ? (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    entry.rank <= 3
                      ? 'bg-gradient-to-r from-yellow-900/30 to-transparent'
                      : 'bg-gray-700/30'
                  }`}
                >
                  {/* 순위 */}
                  <div className={`w-8 text-center font-bold ${
                    entry.rank === 1 ? 'text-yellow-400 text-lg' :
                    entry.rank === 2 ? 'text-gray-300' :
                    entry.rank === 3 ? 'text-amber-600' :
                    'text-gray-500'
                  }`}>
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                  </div>

                  {/* 아바타 */}
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.username}
                      className="w-8 h-8 rounded-full object-cover border border-gray-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* 이름 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{entry.username}</p>
                    <p className={`text-xs ${TOWER_TIER_COLORS[entry.tier]}`}>
                      {TOWER_TIER_NAMES[entry.tier]} 등급
                    </p>
                  </div>

                  {/* 층수 */}
                  <div className="text-right">
                    <p className="text-purple-400 font-bold">{entry.highestFloor}층</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">아직 기록이 없습니다</p>
          )}
        </div>
      )}

      {/* 활성 시즌 배너 (사용자용) */}
      {tower.activeSeason && !showLeaderboard && !showAdminPanel && (
        <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GiTrophy className="text-xl text-purple-400" />
              <div>
                <p className="text-sm font-bold text-white">{tower.activeSeason.name}</p>
                <p className="text-xs text-gray-400">
                  종료: {new Date(tower.activeSeason.endsAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tower.activeSeason.timeRemainingMs && tower.activeSeason.timeRemainingMs > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">남은 시간</p>
                  <p className="text-sm font-bold text-purple-300">
                    {formatTimeRemaining(tower.activeSeason.timeRemainingMs)}
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowSeasonRewards(!showSeasonRewards)}
                className="ml-2 px-2 py-1 bg-purple-600/50 hover:bg-purple-500/50 rounded text-xs text-white transition-all"
              >
                {showSeasonRewards ? '접기' : '보상'}
              </button>
            </div>
          </div>

          {/* 내 현재 시즌 순위 */}
          {myRank > 0 && (
            <div className="mt-2 p-2 bg-purple-800/30 rounded-lg flex items-center justify-between">
              <span className="text-xs text-purple-200 flex items-center gap-1">
                <FaChartLine /> 내 현재 순위
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-purple-300">#{myRank}위</span>
                <span className="text-xs text-gray-400">/ {tower.progress?.highestFloor || 0}층</span>
                {/* 예상 보상 표시 */}
                {currentSeasonRewards.length > 0 && (() => {
                  const myRewardTier = currentSeasonRewards.find(
                    tier => myRank >= tier.rankFrom && myRank <= tier.rankTo
                  )
                  if (myRewardTier) {
                    const items = myRewardTier.rewardItems || []
                    return (
                      <span className="text-xs bg-yellow-900/50 px-2 py-0.5 rounded flex items-center gap-1 flex-wrap">
                        <span className="text-yellow-400">예상:</span>
                        {items.map((item, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            {i > 0 && <span className="text-gray-400">+</span>}
                            {item.type === 'gold' ? (
                              <span className="text-yellow-400">{(item as { amount: number }).amount.toLocaleString()}G</span>
                            ) : item.type === 'enhancement_ticket' ? (
                              <>
                                <img
                                  src={`/images/tickets/${(item as { level: number }).level}.png`}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <span className="text-cyan-400">{(item as { level: number }).level}성 x{(item as { count: number }).count}</span>
                              </>
                            ) : null}
                          </span>
                        ))}
                        {items.length === 0 && <span className="text-gray-400">보상 없음</span>}
                      </span>
                    )
                  }
                  return <span className="text-xs text-gray-500">보상 티어 밖</span>
                })()}
              </div>
            </div>
          )}
          {myRank === 0 && tower.progress?.highestFloor === 0 && (
            <div className="mt-2 p-2 bg-gray-800/50 rounded-lg">
              <span className="text-xs text-gray-400">아직 등반 기록이 없습니다. 탑에 도전하여 순위에 등록하세요!</span>
            </div>
          )}

          {/* 시즌 보상 목록 */}
          {showSeasonRewards && currentSeasonRewards.length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-500/30">
              <p className="text-xs text-purple-300 font-bold mb-2 flex items-center gap-1">
                <GiTrophy className="text-yellow-400" /> 시즌 종료 시 순위별 보상
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {currentSeasonRewards.map((tier, idx) => {
                  const isMyTier = myRank > 0 && myRank >= tier.rankFrom && myRank <= tier.rankTo
                  const items = tier.rewardItems || []
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                        isMyTier ? 'bg-purple-700/50 border border-purple-400' : 'bg-gray-800/50'
                      }`}
                    >
                      <span className={`font-medium ${isMyTier ? 'text-purple-200' : 'text-white'}`}>
                        {tier.rankFrom === tier.rankTo
                          ? `${tier.rankFrom}위`
                          : `${tier.rankFrom}~${tier.rankTo}위`}
                        {isMyTier && ' 👈'}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {items.map((item, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {item.type === 'gold' ? (
                              <span className="text-yellow-400">{(item as { amount: number }).amount.toLocaleString()}G</span>
                            ) : item.type === 'enhancement_ticket' ? (
                              <EnhancementTicketDisplay
                                level={(item as { level: number }).level}
                                count={(item as { count: number }).count}
                              />
                            ) : null}
                          </span>
                        ))}
                        {items.length === 0 && <span className="text-gray-400">-</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 미수령 시즌 보상 알림 - 항상 최상단에 표시 */}
      {tower.unclaimedRewards && tower.unclaimedRewards.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 border-2 border-yellow-500/70 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GiPresent className="text-2xl text-yellow-400" />
              <span className="text-base font-bold text-yellow-300">🎉 시즌 보상 수령 가능!</span>
            </div>
            <span className="text-xs bg-yellow-600 px-2 py-1 rounded-full text-white">
              {tower.unclaimedRewards.length}개
            </span>
          </div>
          <div className="space-y-2">
            {tower.unclaimedRewards.map((reward) => {
              const items = reward.rewardItems || []
              return (
                <div key={reward.id} className="bg-gray-800/70 rounded-lg p-3 border border-yellow-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">{reward.seasonName}</span>
                    <span className="text-xs text-purple-400 bg-purple-900/50 px-2 py-0.5 rounded">
                      #{reward.finalRank}위 / {reward.finalFloor}층
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      {items.map((item, i) => (
                        <span key={i}>
                          {item.type === 'gold' ? (
                            <span className="text-yellow-400 font-bold">{(item as { amount: number }).amount.toLocaleString()} G</span>
                          ) : item.type === 'enhancement_ticket' ? (
                            <EnhancementTicketDisplay
                              level={(item as { level: number }).level}
                              count={(item as { count: number }).count}
                              size="md"
                            />
                          ) : null}
                        </span>
                      ))}
                      {items.length === 0 && <span className="text-gray-400">보상 없음</span>}
                    </div>
                    <button
                      onClick={async () => {
                        const result = await tower.claimSeasonReward(reward.id)
                        if (result) {
                          // rewardItems에서 총 골드 계산
                          const totalGold = items
                            .filter(item => item.type === 'gold')
                            .reduce((sum, item) => sum + (item as { amount: number }).amount, 0)

                          // 골드 즉시 반영
                          if (totalGold > 0) {
                            await onGoldUpdate(totalGold)
                          }
                          // 강화권 목록 새로고침 (rewardItems에 강화권이 있는 경우)
                          const hasTickets = items.some(item => item.type === 'enhancement_ticket')
                          if (hasTickets && onTicketsRefresh) {
                            await onTicketsRefresh()
                          }
                          // 보상 메시지 생성
                          const rewardMessages = items.map(item => {
                            if (item.type === 'gold') {
                              return `${(item as { amount: number }).amount.toLocaleString()} G`
                            } else if (item.type === 'enhancement_ticket') {
                              return `${(item as { level: number }).level}성 강화권 x${(item as { count: number }).count}`
                            }
                            return ''
                          }).filter(Boolean).join('\n')
                          alert(`보상 수령 완료!\n${rewardMessages}`)
                        }
                      }}
                      className="px-4 py-1.5 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 rounded-lg text-sm font-bold text-white transition-all shadow-lg"
                    >
                      수령하기
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 타워 닫힘 상태 */}
      {view === 'select' && tower.towerStatus && !tower.towerStatus.isOpen && !tower.isAdmin && (
        <div className="bg-gray-800/50 border border-red-500/30 rounded-xl p-8 text-center">
          <FaLock className="text-5xl text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">수련의 숲 점검중</h3>
          <p className="text-gray-400">{tower.towerStatus.message}</p>
        </div>
      )}

      {/* 층 선택 화면 */}
      {view === 'select' && tower.progress && (tower.towerStatus?.isOpen || tower.isAdmin) && (
        <div className="space-y-4">
          {/* 공격 덱 선택 */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
              <GiCardDraw className="text-purple-400" /> 공격덱 선택
              <span className="text-xs text-gray-500">
                ({selectedCards.filter(Boolean).length}/3)
              </span>
            </h4>
            <CardSelector
              cards={cardDeck.ownedCards}
              selectedSlots={selectedCards}
              onSelect={handleCardSelect}
            />
            {cardDeck.ownedCards.length === 0 && (
              <p className="text-gray-500 text-center text-sm mt-2">
                PvP 탭에서 카드를 뽑으세요
              </p>
            )}
          </div>

          <TowerFloorSelect
            playerStats={playerStats}
            onStartBattle={() => handleStartClimbing(1)}
          />
        </div>
      )}

      {/* 등반 중 */}
      {view === 'climbing' && currentEnemy && session && (
        <div className="space-y-4">
          {/* 현재 층 표시 */}
          <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2">
            <span className="text-gray-400">현재 도전</span>
            <span className="text-xl font-bold text-purple-400">{session.currentFloor}층</span>
          </div>

          {/* 배틀 */}
          <TowerBattle
            key={battleKey}
            playerName={playerName}
            playerAvatarUrl={playerAvatarUrl}
            playerStats={playerStats}
            playerCards={getSelectedBattleCards()}
            enemy={currentEnemy}
            onVictory={handleVictory}
            onDefeat={handleDefeat}
            initialPlayerHp={persistentPlayerHp}
            initialSkillCooldowns={persistentSkillCooldowns}
            initialPlayerShield={persistentPlayerShield}
          />

          {/* 등반 종료 버튼 */}
          <button
            onClick={handleEndClimbing}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <FaDoorOpen />
            등반 종료 ({session.totalGoldEarned.toLocaleString()} G 받기)
          </button>
        </div>
      )}

      {/* 등반 결과 요약 */}
      {view === 'summary' && session && (
        <div className="space-y-4">
          {/* 결과 헤더 */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/50 rounded-xl p-6 text-center">
            <div className="text-5xl mb-4">
              {session.clearedFloors.length > 0 ? '🏔️' : '💀'}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">등반 종료</h2>
            <p className="text-gray-400">
              {session.startFloor}층에서 시작하여 {session.highestReached}층까지 도달
            </p>

            {session.isNewRecord && (
              <div className="mt-3 inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-4 py-2">
                <GiTrophy className="text-yellow-400" />
                <span className="text-yellow-300 font-bold">최고 기록 갱신!</span>
              </div>
            )}
          </div>

          {/* 통계 */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <GiForestCamp />
              수련 통계
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">클리어 층수</p>
                <p className="text-xl font-bold text-purple-400">{session.clearedFloors.length}층</p>
              </div>
              <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">최고 도달</p>
                <p className="text-xl font-bold text-cyan-400">{session.highestReached}층</p>
              </div>
            </div>
          </div>

          {/* 획득 보상 */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-xl p-4">
            <h3 className="text-sm text-yellow-400 mb-3 flex items-center gap-2">
              <GiTwoCoins />
              획득 보상
            </h3>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">
                +{session.totalGoldEarned.toLocaleString()} G
              </p>
              {session.clearedFloors.length > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  {session.clearedFloors.length}개 층 클리어 보상
                </p>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <button
            onClick={handleBackToSelect}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
          >
            <FaDoorOpen />
            처음으로
          </button>
        </div>
      )}
    </div>
  )
}
