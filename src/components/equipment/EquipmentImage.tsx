import { useState, useEffect, useMemo } from 'react'
import type { UserEquipment, EquipmentBase } from '../../types/equipment'
import { useImageCache } from '../../hooks/useImageCache'

interface EquipmentImageProps {
  equipment?: UserEquipment
  equipmentBase?: EquipmentBase
  starLevel?: number
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  showLoading?: boolean  // 로딩 인디케이터 표시 여부
}

// 이미지와 이모지 모두 동일한 컨테이너 크기 사용
const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-24 h-24',
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
  showLoading = true,
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

  // 이미지 캐시 훅 사용
  const { isLoaded, isLoading, hasError, retry } = useImageCache(imagePath)

  // 이미지 로드 실패 시 다음 레벨로 fallback
  useEffect(() => {
    if (hasError && currentIndex >= 0) {
      setFailedIndices(prev => new Set([...prev, currentIndex]))
    }
  }, [hasError, currentIndex])

  if (!base) {
    return (
      <span className={`${SIZE_CLASSES[size]} ${EMOJI_SIZE_CLASSES[size]} flex items-center justify-center ${className}`}>
        ❓
      </span>
    )
  }

  // Get the level data for display name
  const levelData = base.levels[level] ?? base.levels[0]

  // 로딩 중일 때
  if (imagePath && isLoading && showLoading) {
    return (
      <div className={`${SIZE_CLASSES[size]} flex items-center justify-center flex-shrink-0 ${className}`}>
        <div className="w-1/2 h-1/2 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  // 이미지가 성공적으로 로드된 경우
  if (imagePath && isLoaded) {
    return (
      <img
        src={imagePath}
        alt={levelData?.name || base.levels[0].name}
        className={`${SIZE_CLASSES[size]} object-contain flex-shrink-0 ${className}`}
        loading="lazy"
      />
    )
  }

  // 이미지 로드 실패 또는 이미지 없음 - 이모지로 fallback
  return (
    <span
      className={`${SIZE_CLASSES[size]} ${EMOJI_SIZE_CLASSES[size]} flex items-center justify-center flex-shrink-0 ${className}`}
      onClick={hasError ? retry : undefined}
      title={hasError ? '클릭하여 다시 로드' : undefined}
      style={hasError ? { cursor: 'pointer' } : undefined}
    >
      {base.emoji}
    </span>
  )
}
