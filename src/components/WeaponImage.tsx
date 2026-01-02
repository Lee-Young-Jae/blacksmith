import { useState } from 'react'
import type { WeaponType } from '../types/weapon'
import { getWeaponAtLevel, getLevelTier, LEVEL_GLOW } from '../types/weapon'

interface WeaponImageProps {
  weapon: WeaponType
  level?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showGlow?: boolean
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-2xl',
  md: 'w-16 h-16 text-4xl',
  lg: 'w-24 h-24 text-6xl',
  xl: 'w-32 h-32 text-7xl',
}

const IMAGE_SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
}

export function WeaponImage({
  weapon,
  level = 0,
  size = 'md',
  className = '',
  showGlow = true,
}: WeaponImageProps) {
  const [imageError, setImageError] = useState(false)

  const levelTier = getLevelTier(level)
  const glowClass = showGlow ? LEVEL_GLOW[levelTier] : ''
  const weaponLevel = getWeaponAtLevel(weapon, level)

  // 이미지가 있고 에러가 없으면 이미지 표시
  if (weaponLevel.image && !imageError) {
    return (
      <img
        src={weaponLevel.image}
        alt={weaponLevel.name}
        className={`${IMAGE_SIZE_CLASSES[size]} object-contain ${glowClass} ${className}`}
        onError={() => setImageError(true)}
      />
    )
  }

  // 이미지가 없거나 로드 실패 시 이모지 표시
  return (
    <span className={`${SIZE_CLASSES[size]} flex items-center justify-center ${glowClass} ${className}`}>
      {weapon.emoji}
    </span>
  )
}
