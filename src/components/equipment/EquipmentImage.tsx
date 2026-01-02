import { useState } from 'react'
import type { UserEquipment, EquipmentBase } from '../../types/equipment'

interface EquipmentImageProps {
  equipment?: UserEquipment
  equipmentBase?: EquipmentBase
  starLevel?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-lg',
  md: 'w-8 h-8 text-xl',
  lg: 'w-12 h-12 text-2xl',
  xl: 'w-16 h-16 text-3xl',
}

const EMOJI_SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
}

export default function EquipmentImage({
  equipment,
  equipmentBase: propBase,
  starLevel: propLevel,
  size = 'md',
  className = '',
}: EquipmentImageProps) {
  const [imageError, setImageError] = useState(false)

  // Get equipment base and star level from either source
  const base = equipment?.equipmentBase ?? propBase
  const level = equipment?.starLevel ?? propLevel ?? 0

  if (!base) {
    return <span className={`${EMOJI_SIZE_CLASSES[size]} ${className}`}>❓</span>
  }

  // Get the image path for the current star level
  const levelData = base.levels[level] ?? base.levels[0]
  const imagePath = levelData?.image

  // If image path exists and no error, try to show image
  if (imagePath && !imageError) {
    return (
      <img
        src={imagePath}
        alt={levelData?.name || base.levels[0].name}
        className={`${SIZE_CLASSES[size]} object-contain ${className}`}
        onError={() => setImageError(true)}
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
