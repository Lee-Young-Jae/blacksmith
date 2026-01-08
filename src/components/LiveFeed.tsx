import { useEffect, useState, useRef, useCallback } from 'react'
import { GiExplosiveMaterials, GiStarFormation, GiSparkles, GiCancel, GiAnvilImpact } from 'react-icons/gi'
import { FaPray, FaFire } from 'react-icons/fa'
import type { EnhancementFeedItem, EnhanceResult } from '../types/starforce'
import { getLevelTier, LEVEL_COLORS } from '../types/weapon'
import { generateNickname } from '../utils/nicknameGenerator'
import { WEAPON_DATA } from '../data/weapons'
import { ALL_EQUIPMENT } from '../data/equipment'

interface LiveFeedProps {
  items: EnhancementFeedItem[]  // 실제 유저 데이터 (DB에서)
  currentUserId?: string  // 현재 로그인한 유저 ID
  onSendCondolence?: (userId: string, username: string, historyId: string) => void
}

// 목 데이터 생성
function generateMockFeed(): EnhancementFeedItem {
  const fromLevel = Math.floor(Math.random() * 20)
  const roll = Math.random()
  let result: EnhanceResult
  let toLevel = fromLevel

  if (roll < 0.45) {
    result = 'success'
    toLevel = fromLevel + 1
  } else if (roll < 0.92 || fromLevel < 12) {
    result = 'maintain'
  } else {
    result = 'destroy'
  }

  // 장비 위주로 생성 (90% 장비, 10% 무기)
  let itemName: string
  if (ALL_EQUIPMENT.length > 0 && Math.random() < 0.9) {
    const equipment = ALL_EQUIPMENT[Math.floor(Math.random() * ALL_EQUIPMENT.length)]
    const safeLevel = Math.min(fromLevel, equipment.levels.length - 1)
    itemName = equipment.levels[safeLevel].name
  } else if (WEAPON_DATA.length > 0) {
    const weapon = WEAPON_DATA[Math.floor(Math.random() * WEAPON_DATA.length)]
    const safeLevel = Math.min(fromLevel, weapon.levels.length - 1)
    itemName = weapon.levels[safeLevel].name
  } else {
    itemName = '알 수 없는 장비'
  }

  return {
    id: 'mock_' + Math.random().toString(36).substr(2, 9),
    username: generateNickname(),
    weaponName: itemName,
    fromLevel,
    toLevel,
    result,
    wasChanceTime: result === 'success' && Math.random() < 0.15,
    timestamp: new Date(),
  }
}

// 랜덤 딜레이 생성 (10초 ~ 30초)
function getRandomDelay(): number {
  return 10000 + Math.random() * 20000
}

export function LiveFeed({ items: realItems, currentUserId, onSendCondolence }: LiveFeedProps) {
  const [displayItems, setDisplayItems] = useState<EnhancementFeedItem[]>([])
  const lastRealItemIdRef = useRef<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  // 목 데이터 추가 함수
  const addMockItem = useCallback(() => {
    const newItem = generateMockFeed()
    setDisplayItems(prev => [newItem, ...prev.slice(0, 9)])

    // 다음 목 데이터 스케줄
    timeoutRef.current = window.setTimeout(addMockItem, getRandomDelay())
  }, [])

  // 초기화 및 목 데이터 자동 생성 시작
  useEffect(() => {
    // 초기 목 데이터 생성 (3개만)
    const initialItems = Array.from({ length: 3 }, generateMockFeed)
    setDisplayItems(initialItems)

    // 첫 목 데이터 추가 스케줄 (랜덤 딜레이)
    timeoutRef.current = window.setTimeout(addMockItem, getRandomDelay())

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [addMockItem])

  // 실제 유저 데이터가 들어오면 목록 상단에 추가
  useEffect(() => {
    if (realItems.length > 0) {
      const latestRealItem = realItems[0]

      // 새로운 실제 데이터인지 확인
      if (latestRealItem.id !== lastRealItemIdRef.current) {
        lastRealItemIdRef.current = latestRealItem.id

        // 실제 데이터를 상단에 추가 (중복 제거)
        setDisplayItems(prev => {
          const filtered = prev.filter(item => item.id !== latestRealItem.id)
          return [latestRealItem, ...filtered.slice(0, 9)]
        })
      }
    }
  }, [realItems])

  const getResultColor = (result: EnhanceResult) => {
    if (result === 'destroy') return 'text-[var(--color-danger)]'
    if (result === 'success') return 'text-[var(--color-success)]'
    return 'text-[var(--color-text-muted)]'
  }

  const getResultIcon = (item: EnhancementFeedItem) => {
    if (item.result === 'destroy') {
      return <GiExplosiveMaterials className="w-4 h-4" />
    }
    if (item.result === 'success') {
      return item.wasChanceTime
        ? <GiStarFormation className="w-4 h-4" />
        : <GiSparkles className="w-4 h-4" />
    }
    return <GiCancel className="w-4 h-4" />
  }

  const getResultText = (item: EnhancementFeedItem) => {
    if (item.result === 'destroy') return '파괴'
    if (item.result === 'success') {
      return item.wasChanceTime
        ? `+${item.toLevel} (찬스!)`
        : `+${item.toLevel} 성공`
    }
    return '유지'
  }

  return (
    <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-900 to-stone-800 overflow-hidden">
      <div className="p-4 border-b border-amber-700/30 bg-gradient-to-r from-amber-900/20 to-transparent">
        <h3 className="text-sm font-bold text-amber-100 flex items-center gap-2">
          <GiAnvilImpact className="text-lg text-amber-400" />
          실시간 강화
          <FaFire className="w-3 h-3 text-orange-500 animate-pulse" />
        </h3>
      </div>
      <div className="p-3">
        <div className="space-y-2 overflow-y-auto max-h-64">
          {displayItems.map((item, index) => {
            const levelTier = getLevelTier(item.fromLevel)
            const levelColor = LEVEL_COLORS[levelTier]
            const canSendCondolence = item.result === 'destroy' &&
              item.userId &&
              currentUserId &&
              item.userId !== currentUserId &&
              onSendCondolence

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between text-sm p-2 rounded-lg bg-stone-800/50 border border-stone-700/50 transition-all ${
                  index === 0 ? 'animate-[slideIn_0.3s_ease-out]' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-amber-100 text-xs truncate">{item.username}</p>
                  <p className={`text-xs truncate ${levelColor}`}>
                    {item.weaponName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-xs flex items-center gap-1 ${getResultColor(item.result)}`}>
                    {getResultIcon(item)}
                    {getResultText(item)}
                  </span>
                  {canSendCondolence && (
                    <button
                      onClick={() => onSendCondolence(item.userId!, item.username, item.id)}
                      className="p-1 rounded hover:bg-stone-700 transition-colors text-stone-500 hover:text-amber-400"
                      title="묵념 보내기"
                    >
                      <FaPray className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
