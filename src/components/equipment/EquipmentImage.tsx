import { useState, useEffect, useMemo } from 'react'
import type { UserEquipment, EquipmentBase } from '../../types/equipment'

interface EquipmentImageProps {
  equipment?: UserEquipment
  equipmentBase?: EquipmentBase
  starLevel?: number
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-lg',
  md: 'w-8 h-8 text-xl',
  lg: 'w-12 h-12 text-2xl',
  xl: 'w-16 h-16 text-3xl',
  '2xl': 'w-24 h-24 text-5xl',
}

const EMOJI_SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
  '2xl': 'text-6xl',
}

export default function EquipmentImage({
  equipment,
  equipmentBase: propBase,
  starLevel: propLevel,
  size = 'md',
  className = '',
}: EquipmentImageProps) {
  // Track which image indices have failed to load
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set())

  // Get equipment base and star level from either source
  const base = equipment?.equipmentBase ?? propBase
  const rawLevel = equipment?.starLevel ?? propLevel ?? 0

  // 레벨이 배열 범위를 벗어나면 최대 레벨로 제한
  const maxLevel = base ? base.levels.length - 1 : 0
  const level = Math.min(rawLevel, maxLevel)

  const equipmentId = equipment?.id ?? base?.id ?? ''

  // Reset failed indices when equipment changes
  useEffect(() => {
    setFailedIndices(new Set())
  }, [equipmentId, base?.id])

  // Find the best available image path (current level, or fallback backwards)
  const { imagePath, currentIndex } = useMemo(() => {
    if (!base) return { imagePath: undefined, currentIndex: -1 }

    // Start from current level and go backwards to find a working image
    for (let i = level; i >= 0; i--) {
      if (base.levels[i]?.image && !failedIndices.has(i)) {
        return { imagePath: base.levels[i].image, currentIndex: i }
      }
    }

    return { imagePath: undefined, currentIndex: -1 }
  }, [base, level, failedIndices])

  // Handle image load error - mark this index as failed and try next
  const handleImageError = () => {
    if (currentIndex >= 0) {
      setFailedIndices(prev => new Set([...prev, currentIndex]))
    }
  }

  if (!base) {
    return <span className={`${EMOJI_SIZE_CLASSES[size]} ${className}`}>❓</span>
  }

  // Get the level data for display name
  const levelData = base.levels[level] ?? base.levels[0]

  // If image path exists, try to show image
  if (imagePath) {
    return (
      <img
        src={imagePath}
        alt={levelData?.name || base.levels[0].name}
        className={`${SIZE_CLASSES[size]} object-contain ${className}`}
        onError={handleImageError}
      />
    )
  }

  // Fallback to emoji
  return (
    <span className={`${EMOJI_SIZE_CLASSES[size]} ${className}`}>
      {base.emoji}
    </span>
  )
}
