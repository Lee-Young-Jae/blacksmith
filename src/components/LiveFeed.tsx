import { useEffect, useState } from 'react'
import type { EnhancementFeedItem, EnhanceResult } from '../types/starforce'
import { getLevelTier, LEVEL_COLORS } from '../types/weapon'
import { generateFeedNickname } from '../utils/nicknameGenerator'
import { WEAPON_DATA } from '../data/weapons'

interface LiveFeedProps {
  items: EnhancementFeedItem[]
}

function generateDemoFeed(): EnhancementFeedItem {
  const fromLevel = Math.floor(Math.random() * 20)
  const roll = Math.random()
  let result: EnhanceResult
  let toLevel = fromLevel

  if (roll < 0.4) {
    result = 'success'
    toLevel = fromLevel + 1
  } else if (roll < 0.9 || fromLevel < 12) {
    result = 'maintain'
  } else {
    result = 'destroy'
  }

  // 랜덤 무기와 해당 레벨의 이름 가져오기
  const weapon = WEAPON_DATA[Math.floor(Math.random() * WEAPON_DATA.length)]
  const safeLevel = Math.min(fromLevel, weapon.levels.length - 1)
  const weaponName = weapon.levels[safeLevel].name

  return {
    id: Math.random().toString(36).substr(2, 9),
    username: generateFeedNickname(),
    weaponName,
    fromLevel,
    toLevel,
    result,
    wasChanceTime: result === 'success' && Math.random() < 0.1,
    timestamp: new Date(),
  }
}

export function LiveFeed({ items: externalItems }: LiveFeedProps) {
  const [items, setItems] = useState<EnhancementFeedItem[]>(externalItems)

  useEffect(() => {
    if (externalItems.length > 0) {
      setItems(externalItems)
      return
    }

    // 초기 데이터
    const initialItems = Array.from({ length: 5 }, generateDemoFeed)
    setItems(initialItems)

    // 주기적으로 새 피드 추가
    const interval = setInterval(() => {
      setItems(prev => {
        const newItem = generateDemoFeed()
        return [newItem, ...prev.slice(0, 9)]
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [externalItems])

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
          {items.map((item, index) => {
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
