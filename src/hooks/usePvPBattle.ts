/**
 * PvP Battle Hook
 *
 * PvP 배틀 상태 관리 및 배틀 실행을 담당합니다.
 * - 상대 검색 (매칭)
 * - 공격덱 선택
 * - 배틀 실행 및 결과 처리
 * - 배틀 기록 조회
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CharacterStats } from '../types/stats'
import type { BattleCard, BattleCardTier, BattleCardEffectType } from '../types/battleCard'
import {
  TIER_AVAILABLE_EFFECTS_AI,
  TIER_EFFECT_VALUES,
  EFFECT_TYPE_INFO,
  CARD_NAMES,
  formatCardDescription,
} from '../types/battleCard'
import type {
  PvPBattleStatus,
  PvPOpponent,
  PvPBattle,
  PvPBattleLog,
  BattleSnapshot,
} from '../types/pvpBattle'
import type { OwnedCard, CardSlots } from '../types/cardDeck'
import { ownedCardToBattleCard } from '../types/cardDeck'
import { calculatePvPBattle, calculateTotalGoldBonus } from '../utils/pvpBattle'
import { calculateRatingChange, getTierFromRating, calculateBattleRewards } from '../types/league'

// =============================================
// 타입 정의
// =============================================

interface UsePvPBattleReturn {
  // 상태
  status: PvPBattleStatus
  opponent: PvPOpponent | null
  attackDeck: BattleCard[]
  currentBattle: PvPBattle | null
  battleLogs: PvPBattleLog[]
  unreadDefenseBattles: number
  error: string | null
  isLoading: boolean

  // 액션
  searchOpponent: (combatPower: number) => Promise<boolean>
  selectAttackDeck: (cards: CardSlots) => void
  startBattle: (
    attackerSnapshot: BattleSnapshot,
    attackerCards: BattleCard[],
    defenderCards: BattleCard[]
  ) => Promise<PvPBattle | null>
  cancelSearch: () => void
  resetBattle: () => void

  // 기록 조회
  loadBattleLogs: (limit?: number) => Promise<void>
  loadUnreadDefenseBattles: () => Promise<void>
  markDefenseBattlesRead: () => Promise<void>

  // 복수전
  startRevengeBattle: (opponentId: string) => Promise<boolean>
}

interface OpponentRow {
  user_id: string
  username: string
  rating: number
  tier: string
  combat_power: number
  total_stats: Record<string, number>
  card_count: number
}

interface DefenseDeckRow {
  user_id: string
  equipment_snapshot: Record<string, unknown>
  total_stats: Record<string, number>
  card_slot_1: string | null
  card_slot_2: string | null
  card_slot_3: string | null
  ai_strategy: string
  combat_power: number
}

// =============================================
// AI 상대 생성 (폴백용)
// =============================================

const AI_NAMES = [
  '수련생 고블린', '뜨내기 모험가', '떠돌이 기사', '숲의 정령',
  '광산 드워프', '달빛 요정', '철벽 골렘', '야생의 늑대',
  '그림자 도적', '숙련된 사냥꾼', '마법 수습생', '검은 기사',
]

// AI 카드 생성 (골드 보너스 제외)
function generateAICard(tier: BattleCardTier): BattleCard {
  const availableEffects = TIER_AVAILABLE_EFFECTS_AI[tier]
  const effectType = availableEffects[Math.floor(Math.random() * availableEffects.length)]
  const info = EFFECT_TYPE_INFO[effectType]
  const value = TIER_EFFECT_VALUES[tier][effectType]

  // value가 0이면 다른 효과 선택
  if (value === 0) {
    return generateAICard(tier)
  }

  const effect = {
    type: effectType,
    value,
    isPercentage: !['first_strike', 'gold_bonus'].includes(effectType),
  }

  const name = CARD_NAMES[effectType]?.[tier] || info.name

  return {
    id: `ai_card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    description: formatCardDescription(effect),
    tier,
    effect,
    emoji: info.emoji,
    activationType: info.activationType,
    cooldown: info.cooldown,
    duration: info.duration,
  }
}

// AI 카드 덱 생성 (0~3장)
function generateAICards(cardCount: number): BattleCard[] {
  const cards: BattleCard[] = []

  for (let i = 0; i < cardCount; i++) {
    // 티어 랜덤 결정 (common 50%, rare 30%, epic 15%, legendary 5%)
    const roll = Math.random()
    let tier: BattleCardTier
    if (roll < 0.5) tier = 'common'
    else if (roll < 0.8) tier = 'rare'
    else if (roll < 0.95) tier = 'epic'
    else tier = 'legendary'

    cards.push(generateAICard(tier))
  }

  return cards
}

// 티어 순서 (낮은 것부터 높은 것 순)
const TIER_ORDER: BattleCardTier[] = ['common', 'rare', 'epic', 'legendary']

// 플레이어 카드 등급에 맞춰 AI 카드 생성
// 30%: 더 높은 등급, 60%: 비슷한 등급, 10%: 더 낮은 등급
export function generateAICardsMatchingPlayer(playerCards: BattleCard[]): BattleCard[] {
  // 플레이어가 카드를 선택하지 않은 경우, 랜덤 생성
  if (playerCards.length === 0) {
    const cardCount = 1 + Math.floor(Math.random() * 3)
    return generateAICards(cardCount)
  }

  // 플레이어 카드의 평균 티어 계산
  const playerTierSum = playerCards.reduce((sum, card) => {
    return sum + TIER_ORDER.indexOf(card.tier)
  }, 0)
  const avgTierIndex = playerTierSum / playerCards.length

  const aiCards: BattleCard[] = []

  // 플레이어와 같은 카드 수로 생성
  for (let i = 0; i < playerCards.length; i++) {
    const roll = Math.random()
    let targetTierIndex: number

    if (roll < 0.30) {
      // 30%: 더 높은 등급 (+1)
      targetTierIndex = Math.min(3, Math.round(avgTierIndex) + 1)
    } else if (roll < 0.90) {
      // 60%: 비슷한 등급 (±0)
      targetTierIndex = Math.round(avgTierIndex)
    } else {
      // 10%: 더 낮은 등급 (-1)
      targetTierIndex = Math.max(0, Math.round(avgTierIndex) - 1)
    }

    const targetTier = TIER_ORDER[targetTierIndex]
    aiCards.push(generateAICard(targetTier))
  }

  return aiCards
}

function generateAIOpponent(playerCombatPower: number): PvPOpponent {
  // 전투력 기반 AI 생성 (90%~110% 범위)
  const variance = 0.10
  const minPower = Math.max(500, Math.floor(playerCombatPower * (1 - variance)))
  const maxPower = Math.floor(playerCombatPower * (1 + variance))
  const targetCombatPower = Math.floor(Math.random() * (maxPower - minPower + 1)) + minPower

  // 플레이어 스탯 기반으로 비슷한 수준의 AI 생성
  // 전투력이 높을수록 스탯도 비례해서 증가
  const powerRatio = targetCombatPower / Math.max(500, playerCombatPower)

  // 기본 스탯 (플레이어 평균 수준)
  const baseAttack = 50 + Math.floor(targetCombatPower * 0.05)
  const baseDefense = 30 + Math.floor(targetCombatPower * 0.03)
  const baseHp = 500 + Math.floor(targetCombatPower * 0.5)

  // 랜덤 변동 (-20% ~ +20%)
  const randomFactor = () => 0.8 + Math.random() * 0.4

  const stats: CharacterStats = {
    attack: Math.floor(baseAttack * randomFactor()),
    defense: Math.floor(baseDefense * randomFactor()),
    hp: Math.floor(baseHp * randomFactor()),
    critRate: Math.min(80, Math.floor((15 + Math.random() * 20) * powerRatio)),
    critDamage: Math.floor(150 + Math.random() * 50 * powerRatio),
    penetration: Math.min(50, Math.floor(Math.random() * 20 * powerRatio)),
    attackSpeed: Math.floor(100 + Math.random() * 30 * powerRatio),
  }

  // 실제 계산된 전투력 확인
  const actualPower = Math.floor(
    stats.attack * 1.0 +
    stats.defense * 0.8 +
    stats.hp * 0.1 +
    stats.critRate * 5.0 +
    stats.critDamage * 0.5 +
    stats.penetration * 3.0 +
    stats.attackSpeed * 2.0
  )

  // 레이팅은 전투력 기반 추정
  const baseRating = 800 + Math.floor(playerCombatPower / 10)
  const rating = Math.max(100, baseRating + Math.floor((Math.random() - 0.5) * 200))

  // AI 카드 생성 (1~3장)
  const cardCount = 1 + Math.floor(Math.random() * 3)
  const aiCards = generateAICards(cardCount)

  return {
    userId: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)],
    rating,
    tier: getTierFromRating(rating),
    combatPower: actualPower,
    stats,
    cardCount,
    isAI: true,
    aiCards,
  }
}

// =============================================
// Hook 구현
// =============================================

export function usePvPBattle(): UsePvPBattleReturn {
  const { user } = useAuth()

  const [status, setStatus] = useState<PvPBattleStatus>('idle')
  const [opponent, setOpponent] = useState<PvPOpponent | null>(null)
  const [attackDeck, setAttackDeck] = useState<BattleCard[]>([])
  const [currentBattle, setCurrentBattle] = useState<PvPBattle | null>(null)
  const [battleLogs, setBattleLogs] = useState<PvPBattleLog[]>([])
  const [unreadDefenseBattles, setUnreadDefenseBattles] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // =============================================
  // 상대 검색
  // =============================================

  const searchOpponent = useCallback(async (combatPower: number): Promise<boolean> => {
    if (!user) {
      setError('로그인이 필요합니다.')
      return false
    }

    setStatus('searching')
    setError(null)
    setIsLoading(true)

    try {
      // RPC 함수로 상대 검색
      const { data, error: searchError } = await supabase
        .rpc('get_pvp_opponents_v2', {
          p_user_id: user.id,
          p_combat_power: combatPower,
          p_range: 300,
          p_limit: 5,
        })

      if (searchError) throw searchError

      const opponents = data as OpponentRow[]

      if (!opponents || opponents.length === 0) {
        // AI 상대로 폴백
        const aiOpponent = generateAIOpponent(combatPower)
        setOpponent(aiOpponent)
        setStatus('preparing')
        return true
      }

      // 랜덤하게 한 명 선택
      const selected = opponents[Math.floor(Math.random() * opponents.length)]

      // 상대의 방어덱 카드 가져오기 (RPC 함수 사용 - RLS 우회)
      let defenseCards: BattleCard[] = []
      try {
        console.log('🔍 Fetching defense cards for:', selected.user_id)
        const { data: cardsData, error: cardsError } = await supabase
          .rpc('get_opponent_defense_cards', { p_user_id: selected.user_id })

        console.log('🔍 RPC result:', { cardsData, cardsError })

        if (cardsError) {
          console.error('🔍 RPC error:', cardsError)
        } else if (cardsData && cardsData.length > 0) {
          console.log('🔍 Cards received:', cardsData)
          defenseCards = cardsData.map((card: { id: string; card_type: string; tier: string; value: number; is_percentage: boolean }) => {
            const ownedCard: OwnedCard = {
              id: card.id,
              oderId: selected.user_id,
              cardType: card.card_type as BattleCardEffectType,
              tier: card.tier as BattleCardTier,
              value: card.value,
              isPercentage: card.is_percentage,
              createdAt: new Date(),
            }
            return ownedCardToBattleCard(ownedCard)
          })
          console.log('🔍 Converted defenseCards:', defenseCards)
        } else {
          console.log('🔍 No cards returned from RPC')
        }
      } catch (err) {
        console.error('Failed to fetch defense cards:', err)
      }

      setOpponent({
        userId: selected.user_id,
        username: selected.username,
        rating: selected.rating,
        tier: selected.tier,
        combatPower: selected.combat_power,
        stats: selected.total_stats as unknown as CharacterStats,
        cardCount: selected.card_count,
        isAI: false,
        defenseCards,
      })

      setStatus('preparing')
      return true
    } catch (err) {
      console.error('Failed to search opponent:', err)
      setError('상대 검색에 실패했습니다.')
      setStatus('idle')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // =============================================
  // 공격덱 선택
  // =============================================

  const selectAttackDeck = useCallback((cards: CardSlots) => {
    const battleCards = cards
      .filter((card): card is OwnedCard => card !== null)
      .map(ownedCardToBattleCard)

    setAttackDeck(battleCards)
    setStatus('ready')
  }, [])

  // =============================================
  // 배틀 시작
  // =============================================

  const startBattle = useCallback(async (
    attackerSnapshot: BattleSnapshot,
    attackerCards: BattleCard[],
    defenderCards: BattleCard[]
  ): Promise<PvPBattle | null> => {
    if (!user || !opponent) {
      setError('배틀을 시작할 수 없습니다.')
      return null
    }

    setStatus('fighting')
    setError(null)
    setAttackDeck(attackerCards) // 상태도 업데이트

    try {
      // 배틀 시뮬레이션
      const battle = calculatePvPBattle({
        attackerId: user.id,
        defenderId: opponent.userId,
        attackerName: attackerSnapshot.username,
        defenderName: opponent.username,
        attackerStats: attackerSnapshot.stats,
        defenderStats: opponent.stats,
        attackerCards, // 직접 전달받은 카드 사용
        defenderCards,
        isRevenge: false,
      })

      // 레이팅 변경 계산
      const attackerRating = attackerSnapshot.rating
      const defenderRating = opponent.rating

      let ratingChanges: { winnerChange: number; loserChange: number }
      if (battle.result === 'draw') {
        ratingChanges = calculateRatingChange(attackerRating, defenderRating, true)
        battle.attackerRatingChange = ratingChanges.winnerChange
        battle.defenderRatingChange = ratingChanges.loserChange
      } else if (battle.result === 'attacker_win') {
        ratingChanges = calculateRatingChange(attackerRating, defenderRating, false)
        battle.attackerRatingChange = ratingChanges.winnerChange
        battle.defenderRatingChange = ratingChanges.loserChange
      } else {
        ratingChanges = calculateRatingChange(defenderRating, attackerRating, false)
        battle.attackerRatingChange = ratingChanges.loserChange
        battle.defenderRatingChange = ratingChanges.winnerChange
      }

      // 보상 계산
      const attackerTier = getTierFromRating(attackerRating)
      const myResult = battle.result === 'attacker_win' ? 'win'
        : battle.result === 'defender_win' ? 'lose' : 'draw'
      const rewards = calculateBattleRewards(
        myResult,
        attackerTier,
        battle.attackerRatingChange,
        false
      )

      // 골드 보너스 카드 효과 적용
      const goldBonusPercent = calculateTotalGoldBonus(attackerCards)
      const baseGold = rewards.gold
      battle.attackerReward = Math.floor(baseGold * (1 + goldBonusPercent / 100))

      // 방어자 보상
      const defenderTier = getTierFromRating(defenderRating)
      const defenderResult = battle.result === 'defender_win' ? 'win'
        : battle.result === 'attacker_win' ? 'lose' : 'draw'
      const defenderRewards = calculateBattleRewards(
        defenderResult,
        defenderTier,
        battle.defenderRatingChange,
        false
      )
      battle.defenderReward = defenderRewards.gold

      // AI 상대일 경우 레이팅 변경 없음, 보상 감소, 기록 안 함
      if (opponent.isAI) {
        battle.attackerRatingChange = 0
        battle.defenderRatingChange = 0
        battle.attackerReward = Math.floor(battle.attackerReward * 0.5) // AI전 보상 50%
      }

      // DB에 기록 저장 (유저 vs 유저만 기록)
      if (!opponent.isAI) {
        const { error: recordError } = await supabase.rpc('record_pvp_battle', {
          p_attacker_id: user.id,
          p_defender_id: opponent.userId,
          p_result: battle.result,
          p_attacker_rating_change: battle.attackerRatingChange,
          p_defender_rating_change: battle.defenderRatingChange,
          p_attacker_reward: battle.attackerReward,
          p_defender_reward: battle.defenderReward,
          p_battle_log: battle.rounds,
          p_total_rounds: battle.totalRounds,
          p_attacker_cards: attackDeck,
          p_defender_cards: defenderCards,
          p_attacker_snapshot: attackerSnapshot,
          p_defender_snapshot: {
            oderId: opponent.userId,
            username: opponent.username,
            stats: opponent.stats,
            combatPower: opponent.combatPower,
            tier: opponent.tier,
            rating: opponent.rating,
          },
          p_is_revenge: false,
        })

        if (recordError) {
          console.error('Failed to record battle:', recordError)
          // 기록 실패해도 배틀 결과는 보여줌
        }
      }

      // 골드 지급 (현재 골드 조회 후 증가)
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('gold')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Failed to get current gold:', profileError)
      } else if (profileData) {
        const newGold = (profileData.gold || 0) + battle.attackerReward
        const { error: goldError } = await supabase
          .from('user_profiles')
          .update({ gold: newGold })
          .eq('id', user.id)

        if (goldError) {
          console.error('Failed to update gold:', goldError)
        }
      }

      setCurrentBattle(battle)
      // status는 'fighting'으로 유지 - PvPBattleReplay 컴포넌트가 애니메이션을 관리
      // 애니메이션 완료 후 사용자가 보상 받기를 클릭하면 resetBattle()이 호출됨
      return battle
    } catch (err) {
      console.error('Failed to execute battle:', err)
      setError('배틀 실행에 실패했습니다.')
      setStatus('idle')
      return null
    }
  }, [user, opponent])

  // =============================================
  // 취소/리셋
  // =============================================

  const cancelSearch = useCallback(() => {
    setStatus('idle')
    setOpponent(null)
    setAttackDeck([])
    setError(null)
  }, [])

  const resetBattle = useCallback(() => {
    setStatus('idle')
    setOpponent(null)
    setAttackDeck([])
    setCurrentBattle(null)
    setError(null)
  }, [])

  // =============================================
  // 배틀 기록 조회
  // =============================================

  const loadBattleLogs = useCallback(async (limit: number = 20) => {
    if (!user) return

    setIsLoading(true)

    try {
      // 공격전 기록 (defender_snapshot에서 username도 가져옴)
      const { data: attackerBattles, error: attackerError } = await supabase
        .from('pvp_battles')
        .select(`
          id,
          defender_id,
          result,
          attacker_rating_change,
          attacker_reward,
          total_rounds,
          is_revenge,
          created_at,
          defender_snapshot,
          defender:user_profiles!defender_id(username)
        `)
        .eq('attacker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (attackerError) throw attackerError

      // 방어전 기록 (attacker_snapshot에서 username도 가져옴)
      const { data: defenderBattles, error: defenderError } = await supabase
        .from('pvp_battles')
        .select(`
          id,
          attacker_id,
          result,
          defender_rating_change,
          defender_reward,
          total_rounds,
          is_revenge,
          created_at,
          attacker_snapshot,
          attacker:user_profiles!attacker_id(username)
        `)
        .eq('defender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (defenderError) throw defenderError

      // 로그 변환 및 병합
      const logs: PvPBattleLog[] = []

      for (const battle of attackerBattles || []) {
        const defenderData = battle.defender as unknown as { username: string } | { username: string }[] | null
        const defenderName = Array.isArray(defenderData) ? defenderData[0]?.username : defenderData?.username
        // 스냅샷에서 username 가져오기 (대체용)
        const snapshotName = (battle.defender_snapshot as { username?: string } | null)?.username
        logs.push({
          id: battle.id,
          opponentId: battle.defender_id,
          opponentName: defenderName || snapshotName || '알 수 없음',
          opponentTier: 'bronze', // TODO: 조회 필요
          isAttacker: true,
          result: battle.result,
          myResult: battle.result === 'attacker_win' ? 'win'
            : battle.result === 'defender_win' ? 'lose' : 'draw',
          ratingChange: battle.attacker_rating_change,
          goldReward: battle.attacker_reward,
          totalRounds: battle.total_rounds,
          isRevenge: battle.is_revenge,
          canRevenge: false,
          createdAt: new Date(battle.created_at),
        })
      }

      for (const battle of defenderBattles || []) {
        const attackerData = battle.attacker as unknown as { username: string } | { username: string }[] | null
        const attackerName = Array.isArray(attackerData) ? attackerData[0]?.username : attackerData?.username
        // 스냅샷에서 username 가져오기 (대체용)
        const snapshotName = (battle.attacker_snapshot as { username?: string } | null)?.username
        logs.push({
          id: battle.id,
          opponentId: battle.attacker_id,
          opponentName: attackerName || snapshotName || '알 수 없음',
          opponentTier: 'bronze',
          isAttacker: false,
          result: battle.result,
          myResult: battle.result === 'defender_win' ? 'win'
            : battle.result === 'attacker_win' ? 'lose' : 'draw',
          ratingChange: battle.defender_rating_change,
          goldReward: battle.defender_reward,
          totalRounds: battle.total_rounds,
          isRevenge: battle.is_revenge,
          canRevenge: !battle.is_revenge && battle.result === 'attacker_win',
          createdAt: new Date(battle.created_at),
        })
      }

      // 시간순 정렬
      logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setBattleLogs(logs.slice(0, limit))
    } catch (err) {
      console.error('Failed to load battle logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // =============================================
  // 읽지 않은 방어전 조회
  // =============================================

  const loadUnreadDefenseBattles = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('pvp_battles')
        .select('id')
        .eq('defender_id', user.id)
        .eq('defender_notified', false)

      if (error) throw error

      setUnreadDefenseBattles(data?.length || 0)
    } catch (err) {
      console.error('Failed to load unread battles:', err)
    }
  }, [user])

  const markDefenseBattlesRead = useCallback(async () => {
    if (!user) return

    try {
      await supabase.rpc('mark_defense_battles_notified', {
        p_user_id: user.id,
      })

      setUnreadDefenseBattles(0)
    } catch (err) {
      console.error('Failed to mark battles as read:', err)
    }
  }, [user])

  // =============================================
  // 복수전
  // =============================================

  const startRevengeBattle = useCallback(async (opponentId: string): Promise<boolean> => {
    if (!user) return false

    setIsLoading(true)
    setError(null)

    try {
      // 상대 프로필 조회 (없을 수 있음)
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', opponentId)
        .maybeSingle()

      if (!profileData) {
        setError('상대 정보를 찾을 수 없습니다.')
        return false
      }

      // 상대 방어덱 정보 조회 (없을 수 있음)
      const { data: defenseData } = await supabase
        .from('user_defense_deck')
        .select('*')
        .eq('user_id', opponentId)
        .maybeSingle()

      // 상대 랭킹 조회
      const { data: rankingData } = await supabase
        .from('pvp_rankings')
        .select('rating, tier')
        .eq('user_id', opponentId)
        .maybeSingle()

      // 방어덱 카드 가져오기 (RPC 함수 사용 - RLS 우회)
      let defenseCards: BattleCard[] = []
      try {
        const { data: cardsData, error: cardsError } = await supabase
          .rpc('get_opponent_defense_cards', { p_user_id: opponentId })

        if (!cardsError && cardsData && cardsData.length > 0) {
          defenseCards = cardsData.map((card: { id: string; card_type: string; tier: string; value: number; is_percentage: boolean }) => {
            const ownedCard: OwnedCard = {
              id: card.id,
              oderId: opponentId,
              cardType: card.card_type as BattleCardEffectType,
              tier: card.tier as BattleCardTier,
              value: card.value,
              isPercentage: card.is_percentage,
              createdAt: new Date(),
            }
            return ownedCardToBattleCard(ownedCard)
          })
        }
      } catch (err) {
        console.error('Failed to fetch revenge defense cards:', err)
      }

      // 방어덱이 없으면 기본 스탯으로 AI 상대 생성
      if (!defenseData) {
        const aiOpponent = generateAIOpponent(1000) // 기본 전투력
        setOpponent({
          ...aiOpponent,
          userId: opponentId,
          username: profileData.username,
          rating: rankingData?.rating || 1000,
          tier: rankingData?.tier || 'bronze',
          isAI: false, // 실제 유저이므로 false
          defenseCards: [],
        })
      } else {
        const defense = defenseData as DefenseDeckRow
        setOpponent({
          userId: opponentId,
          username: profileData.username,
          rating: rankingData?.rating || 1000,
          tier: rankingData?.tier || 'bronze',
          combatPower: defense.combat_power,
          stats: defense.total_stats as unknown as CharacterStats,
          cardCount: [defense.card_slot_1, defense.card_slot_2, defense.card_slot_3]
            .filter(Boolean).length,
          defenseCards,
        })
      }

      setStatus('preparing')
      return true
    } catch (err) {
      console.error('Failed to start revenge battle:', err)
      setError('복수전을 시작할 수 없습니다.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // =============================================
  // 초기 로드
  // =============================================

  useEffect(() => {
    if (user) {
      loadUnreadDefenseBattles()
    }
  }, [user, loadUnreadDefenseBattles])

  return {
    status,
    opponent,
    attackDeck,
    currentBattle,
    battleLogs,
    unreadDefenseBattles,
    error,
    isLoading,
    searchOpponent,
    selectAttackDeck,
    startBattle,
    cancelSearch,
    resetBattle,
    loadBattleLogs,
    loadUnreadDefenseBattles,
    markDefenseBattlesRead,
    startRevengeBattle,
  }
}
