import { useEffect, useState, useRef, useCallback } from 'react'
import type { EnhancementFeedItem, EnhanceResult } from '../types/starforce'
import { getLevelTier, LEVEL_COLORS } from '../types/weapon'
import { generateNickname } from '../utils/nicknameGenerator'
import { WEAPON_DATA } from '../data/weapons'
import { ALL_EQUIPMENT } from '../data/equipment'

interface LiveFeedProps {
  items: EnhancementFeedItem[]  // 실제 유저 데이터 (DB에서)
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

// 랜덤 딜레이 생성 (2초 ~ 6초)
function getRandomDelay(): number {
  return 2000 + Math.random() * 4000
}

export function LiveFeed({ items: realItems }: LiveFeedProps) {
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
    // 초기 목 데이터 생성
    const initialItems = Array.from({ length: 6 }, generateMockFeed)
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

  const getResultText = (item: EnhancementFeedItem) => {
    if (item.result === 'destroy') return '💥 파괴'
    if (item.result === 'success') {
      return item.wasChanceTime
        ? `🌟 +${item.toLevel} (찬스!)`
        : `✨ +${item.toLevel} 성공`
    }
    return `❌ 유지`
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <span className="w-2 h-2 bg-[var(--color-danger)] rounded-full animate-pulse" />
          실시간 강화
        </h3>
      </div>
      <div className="card-body p-3">
        <div className="space-y-2 overflow-y-auto max-h-64">
          {displayItems.map((item, index) => {
            const levelTier = getLevelTier(item.fromLevel)
            const levelColor = LEVEL_COLORS[levelTier]

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between text-sm p-2 rounded-lg bg-[var(--color-bg-elevated-2)] transition-all ${
                  index === 0 ? 'animate-[slideIn_0.3s_ease-out]' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--color-text-primary)] text-xs truncate">{item.username}</p>
                  <p className={`text-xs truncate ${levelColor}`}>
                    {item.weaponName}
                  </p>
                </div>
                <span className={`font-bold text-xs ${getResultColor(item.result)}`}>
                  {getResultText(item)}
                </span>
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
