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
import { calculateTotalGoldBonus } from '../utils/pvpBattle'
import { calculateRatingChange, getTierFromRating, calculateBattleRewards } from '../types/league'

// =============================================
// 타입 정의
// =============================================

// PvPRealtimeBattle에서 반환하는 결과 타입
export interface RealtimeBattleResult {
  winner: 'player' | 'opponent' | 'draw'
  playerFinalHp: number
  opponentFinalHp: number
  battleDuration: number
}

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
  searchOpponent: (rating: number, combatPower: number) => Promise<boolean>
  selectAttackDeck: (cards: CardSlots) => void
  startBattle: (
    attackerSnapshot: BattleSnapshot,
    attackerCards: BattleCard[]
  ) => void
  recordBattleResult: (
    result: RealtimeBattleResult,
    attackerCards: BattleCard[],
    defenderCards: BattleCard[]
  ) => Promise<void>
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
  avatar_url?: string
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

  // 침묵/스턴 카드를 앞으로 배치 (초반 사용)
  return sortAICardsForBattle(cards)
}

// 티어 순서 (낮은 것부터 높은 것 순)
const TIER_ORDER: BattleCardTier[] = ['common', 'rare', 'epic', 'legendary']

// AI 카드 전략적 정렬: 침묵/스턴 계열을 앞으로 배치
// 플레이어가 초반에 버프를 사용하는 경향이 있으므로 AI도 침묵을 초반에 사용
function sortAICardsForBattle(cards: BattleCard[]): BattleCard[] {
  // 우선순위가 높은 효과 (초반에 사용해야 효과적인 것들)
  const PRIORITY_EFFECTS = ['silence', 'stun', 'anti_heal'] as const

  return [...cards].sort((a, b) => {
    const aPriority = PRIORITY_EFFECTS.indexOf(a.effect.type as typeof PRIORITY_EFFECTS[number])
    const bPriority = PRIORITY_EFFECTS.indexOf(b.effect.type as typeof PRIORITY_EFFECTS[number])

    // 우선순위 효과가 있으면 앞으로
    const aHasPriority = aPriority !== -1
    const bHasPriority = bPriority !== -1

    if (aHasPriority && !bHasPriority) return -1
    if (!aHasPriority && bHasPriority) return 1
    if (aHasPriority && bHasPriority) return aPriority - bPriority

    return 0
  })
}

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

  // 침묵/스턴 카드를 앞으로 배치 (초반 사용)
  return sortAICardsForBattle(aiCards)
}

function generateAIOpponent(playerCombatPower: number): PvPOpponent {
  // 전투력 기반 AI 생성 (85%~120% 범위 - 가끔 더 강한 AI)
  const variance = 0.15
  const minPower = Math.max(500, Math.floor(playerCombatPower * (1 - variance)))
  const maxPower = Math.floor(playerCombatPower * (1 + variance + 0.05))  // 최대 120%
  const targetCombatPower = Math.floor(Math.random() * (maxPower - minPower + 1)) + minPower

  // 플레이어 스탯 기반으로 비슷한 수준의 AI 생성
  // 전투력이 높을수록 스탯도 비례해서 증가
  const powerRatio = targetCombatPower / Math.max(500, playerCombatPower)

  // 기본 스탯 (강화된 공식)
  const baseAttack = 80 + Math.floor(targetCombatPower * 0.08)
  const baseDefense = 50 + Math.floor(targetCombatPower * 0.05)
  const baseHp = 800 + Math.floor(targetCombatPower * 0.8)

  // 랜덤 변동 (-15% ~ +25%)
  const randomFactor = () => 0.85 + Math.random() * 0.4

  const stats: CharacterStats = {
    attack: Math.floor(baseAttack * randomFactor()),
    defense: Math.floor(baseDefense * randomFactor()),
    hp: Math.floor(baseHp * randomFactor()),
    critRate: Math.min(80, Math.floor((20 + Math.random() * 25) * powerRatio)),
    critDamage: Math.floor(160 + Math.random() * 60 * powerRatio),
    penetration: Math.min(50, Math.floor((5 + Math.random() * 25) * powerRatio)),
    attackSpeed: Math.floor(105 + Math.random() * 35 * powerRatio),
    evasion: Math.min(35, Math.floor((5 + Math.random() * 20) * powerRatio)),  // AI 회피율 (최대 35%)
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
  // 배틀 결과 기록용 스냅샷 저장
  const [savedAttackerSnapshot, setSavedAttackerSnapshot] = useState<BattleSnapshot | null>(null)

  // =============================================
  // 상대 검색 (레이팅 기반)
  // =============================================

  const searchOpponent = useCallback(async (rating: number, combatPower: number): Promise<boolean> => {
    if (!user) {
      setError('로그인이 필요합니다.')
      return false
    }

    setStatus('searching')
    setError(null)
    setIsLoading(true)

    try {
      // 10% 확률로 AI 매칭
      const AI_MATCH_CHANCE = 0.1
      if (Math.random() < AI_MATCH_CHANCE) {
        const aiOpponent = generateAIOpponent(combatPower)
        setOpponent(aiOpponent)
        setStatus('preparing')
        setIsLoading(false)
        return true
      }

      // 레이팅 기반 매칭 (최근 상대 자동 제외)
      const { data, error: searchError } = await supabase
        .rpc('find_pvp_opponent_by_rating', {
          p_user_id: user.id,
          p_rating: rating,
        })

      if (searchError) {
        // 새 함수가 없으면 기존 함수로 폴백
        console.warn('Rating-based matching failed, falling back to combat power:', searchError)
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_pvp_opponents_v2', {
            p_user_id: user.id,
            p_combat_power: combatPower,
            p_range: 300,
            p_limit: 5,
          })

        if (fallbackError) throw fallbackError

        const opponents = fallbackData as OpponentRow[]

        if (!opponents || opponents.length === 0) {
          const aiOpponent = generateAIOpponent(combatPower)
          setOpponent(aiOpponent)
          setStatus('preparing')
          return true
        }

        const selected = opponents[Math.floor(Math.random() * opponents.length)]

        // 상대의 방어덱 카드 및 장비 스냅샷 가져오기
        let defenseCards: BattleCard[] = []
        let equipmentSnapshot: Record<string, unknown> | undefined

        try {
          const { data: cardsData, error: cardsError } = await supabase
            .rpc('get_opponent_defense_cards', { p_user_id: selected.user_id })

          if (!cardsError && cardsData && cardsData.length > 0) {
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
          }

          const { data: defenseData } = await supabase
            .from('user_defense_deck')
            .select('equipment_snapshot')
            .eq('user_id', selected.user_id)
            .maybeSingle()

          if (defenseData?.equipment_snapshot) {
            equipmentSnapshot = defenseData.equipment_snapshot as Record<string, unknown>
          }
        } catch (err) {
          console.error('Failed to fetch defense data:', err)
        }

        setOpponent({
          userId: selected.user_id,
          username: selected.username,
          rating: selected.rating,
          tier: selected.tier,
          combatPower: selected.combat_power,
          stats: selected.total_stats as unknown as CharacterStats,
          cardCount: selected.card_count,
          avatarUrl: selected.avatar_url,
          isAI: false,
          defenseCards,
          equipmentSnapshot: equipmentSnapshot as PvPOpponent['equipmentSnapshot'],
        })

        setStatus('preparing')
        return true
      }

      const opponents = data as OpponentRow[]

      if (!opponents || opponents.length === 0) {
        // AI 상대로 폴백
        const aiOpponent = generateAIOpponent(combatPower)
        setOpponent(aiOpponent)
        setStatus('preparing')
        return true
      }

      // 첫 번째 상대 선택 (이미 레이팅 차이가 적은 순으로 정렬됨)
      const selected = opponents[0]

      // 상대의 방어덱 카드 및 장비 스냅샷 가져오기
      let defenseCards: BattleCard[] = []
      let equipmentSnapshot: Record<string, unknown> | undefined

      try {
        // 카드 가져오기 (RPC 함수 사용 - RLS 우회)
        const { data: cardsData, error: cardsError } = await supabase
          .rpc('get_opponent_defense_cards', { p_user_id: selected.user_id })

        if (!cardsError && cardsData && cardsData.length > 0) {
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
        }

        // 장비 스냅샷 가져오기
        const { data: defenseData } = await supabase
          .from('user_defense_deck')
          .select('equipment_snapshot')
          .eq('user_id', selected.user_id)
          .maybeSingle()

        if (defenseData?.equipment_snapshot) {
          equipmentSnapshot = defenseData.equipment_snapshot as Record<string, unknown>
        }
      } catch (err) {
        console.error('Failed to fetch defense data:', err)
      }

      setOpponent({
        userId: selected.user_id,
        username: selected.username,
        rating: selected.rating,
        tier: selected.tier,
        combatPower: selected.combat_power,
        stats: selected.total_stats as unknown as CharacterStats,
        cardCount: selected.card_count,
        avatarUrl: selected.avatar_url,
        isAI: false,
        defenseCards,
        equipmentSnapshot: equipmentSnapshot as PvPOpponent['equipmentSnapshot'],
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
  // 배틀 시작 (상태만 변경, 실제 결과는 PvPRealtimeBattle에서 계산)
  // =============================================

  const startBattle = useCallback((
    attackerSnapshot: BattleSnapshot,
    attackerCards: BattleCard[]
  ): void => {
    if (!user || !opponent) {
      setError('배틀을 시작할 수 없습니다.')
      return
    }

    setStatus('fighting')
    setError(null)
    setAttackDeck(attackerCards)
    setSavedAttackerSnapshot(attackerSnapshot)
    // 실제 배틀은 PvPRealtimeBattle 컴포넌트에서 진행
    // 결과는 recordBattleResult()로 기록
  }, [user, opponent])

  // =============================================
  // 배틀 결과 기록 (PvPRealtimeBattle 종료 후 호출)
  // =============================================

  const recordBattleResult = useCallback(async (
    result: RealtimeBattleResult,
    attackerCards: BattleCard[],
    defenderCards: BattleCard[]
  ): Promise<void> => {
    if (!user || !opponent || !savedAttackerSnapshot) {
      console.error('Cannot record battle: missing data')
      return
    }

    try {
      // 결과 변환
      const battleResult = result.winner === 'player' ? 'attacker_win'
        : result.winner === 'opponent' ? 'defender_win'
        : 'draw'

      // 레이팅 변경 계산
      const attackerRating = savedAttackerSnapshot.rating
      const defenderRating = opponent.rating

      let attackerRatingChange: number
      let defenderRatingChange: number

      if (battleResult === 'draw') {
        const ratingChanges = calculateRatingChange(attackerRating, defenderRating, true)
        attackerRatingChange = ratingChanges.winnerChange
        defenderRatingChange = ratingChanges.loserChange
      } else if (battleResult === 'attacker_win') {
        const ratingChanges = calculateRatingChange(attackerRating, defenderRating, false)
        attackerRatingChange = ratingChanges.winnerChange
        defenderRatingChange = ratingChanges.loserChange
      } else {
        const ratingChanges = calculateRatingChange(defenderRating, attackerRating, false)
        attackerRatingChange = ratingChanges.loserChange
        defenderRatingChange = ratingChanges.winnerChange
      }

      // 보상 계산
      const attackerTier = getTierFromRating(attackerRating)
      const myResult = battleResult === 'attacker_win' ? 'win'
        : battleResult === 'defender_win' ? 'lose' : 'draw'
      const rewards = calculateBattleRewards(
        myResult,
        attackerTier,
        attackerRatingChange,
        false
      )

      // 골드 보너스 카드 효과 적용
      const goldBonusPercent = calculateTotalGoldBonus(attackerCards)
      const baseGold = rewards.gold
      let attackerReward = Math.floor(baseGold * (1 + goldBonusPercent / 100))

      // 방어자 보상
      const defenderTier = getTierFromRating(defenderRating)
      const defenderResult = battleResult === 'defender_win' ? 'win'
        : battleResult === 'attacker_win' ? 'lose' : 'draw'
      const defenderRewards = calculateBattleRewards(
        defenderResult,
        defenderTier,
        defenderRatingChange,
        false
      )
      const defenderReward = defenderRewards.gold

      // AI 상대일 경우 레이팅 변경 없음, 보상 감소, 기록 안 함
      if (opponent.isAI) {
        attackerRatingChange = 0
        defenderRatingChange = 0
        attackerReward = Math.floor(attackerReward * 0.5) // AI전 보상 50%
      }

      // DB에 기록 저장 (유저 vs 유저만 기록)
      if (!opponent.isAI) {
        const { error: recordError } = await supabase.rpc('record_pvp_battle', {
          p_attacker_id: user.id,
          p_defender_id: opponent.userId,
          p_result: battleResult,
          p_attacker_rating_change: attackerRatingChange,
          p_defender_rating_change: defenderRatingChange,
          p_attacker_reward: attackerReward,
          p_defender_reward: defenderReward,
          p_battle_log: [],
          p_total_rounds: Math.ceil(result.battleDuration / 1000),
          p_attacker_cards: attackerCards,
          p_defender_cards: defenderCards,
          p_attacker_snapshot: savedAttackerSnapshot,
          p_defender_snapshot: {
            oderId: opponent.userId,
            username: opponent.username,
            stats: opponent.stats,
            combatPower: opponent.combatPower,
            equipment: opponent.equipmentSnapshot || {},
            cards: defenderCards,
            tier: opponent.tier,
            rating: opponent.rating,
          },
          p_is_revenge: false,
        })

        if (recordError) {
          console.error('Failed to record battle:', recordError)
        }
      }

      // 골드는 PvPMatchmaking의 onBattleEnd에서 onGoldUpdate로 처리됨
      // DB 동기화만 수행
      if (!opponent.isAI) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('gold')
          .eq('id', user.id)
          .single()

        if (!profileError && profileData) {
          const newGold = (profileData.gold || 0) + attackerReward
          await supabase
            .from('user_profiles')
            .update({ gold: newGold })
            .eq('id', user.id)
        }
      }

    } catch (err) {
      console.error('Failed to record battle result:', err)
    }
  }, [user, opponent, savedAttackerSnapshot])

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
    setSavedAttackerSnapshot(null)
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
        const snapshot = battle.defender_snapshot as BattleSnapshot | null
        const snapshotName = snapshot?.username
        logs.push({
          id: battle.id,
          opponentId: battle.defender_id,
          opponentName: defenderName || snapshotName || '알 수 없음',
          opponentTier: snapshot?.tier || 'bronze',
          isAttacker: true,
          result: battle.result,
          myResult: battle.result === 'attacker_win' ? 'win'
            : battle.result === 'defender_win' ? 'lose' : 'draw',
          ratingChange: battle.attacker_rating_change,
          goldReward: battle.attacker_reward,
          totalRounds: battle.total_rounds,
          isRevenge: battle.is_revenge,
          canRevenge: false,
          opponentSnapshot: snapshot || undefined,
          createdAt: new Date(battle.created_at),
        })
      }

      for (const battle of defenderBattles || []) {
        const attackerData = battle.attacker as unknown as { username: string } | { username: string }[] | null
        const attackerName = Array.isArray(attackerData) ? attackerData[0]?.username : attackerData?.username
        // 스냅샷에서 username 가져오기 (대체용)
        const snapshot = battle.attacker_snapshot as BattleSnapshot | null
        const snapshotName = snapshot?.username
        logs.push({
          id: battle.id,
          opponentId: battle.attacker_id,
          opponentName: attackerName || snapshotName || '알 수 없음',
          opponentTier: snapshot?.tier || 'bronze',
          isAttacker: false,
          result: battle.result,
          myResult: battle.result === 'defender_win' ? 'win'
            : battle.result === 'attacker_win' ? 'lose' : 'draw',
          ratingChange: battle.defender_rating_change,
          goldReward: battle.defender_reward,
          totalRounds: battle.total_rounds,
          isRevenge: battle.is_revenge,
          canRevenge: !battle.is_revenge && battle.result === 'attacker_win',
          opponentSnapshot: snapshot || undefined,
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
          rating: rankingData?.rating || 400,
          tier: rankingData?.tier || 'bronze',
          isAI: false, // 실제 유저이므로 false
          defenseCards: [],
        })
      } else {
        const defense = defenseData as DefenseDeckRow
        setOpponent({
          userId: opponentId,
          username: profileData.username,
          rating: rankingData?.rating || 400,
          tier: rankingData?.tier || 'bronze',
          combatPower: defense.combat_power,
          stats: defense.total_stats as unknown as CharacterStats,
          cardCount: [defense.card_slot_1, defense.card_slot_2, defense.card_slot_3]
            .filter(Boolean).length,
          defenseCards,
          equipmentSnapshot: defense.equipment_snapshot as PvPOpponent['equipmentSnapshot'],
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
    recordBattleResult,
    cancelSearch,
    resetBattle,
    loadBattleLogs,
    loadUnreadDefenseBattles,
    markDefenseBattlesRead,
    startRevengeBattle,
  }
}
