import type { ReactNode } from 'react'

interface ProfileBorderProps {
  borderClass?: string | null
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

export function ProfileBorder({ borderClass, children, size = 'md' }: ProfileBorderProps) {
  const sizeClass = SIZE_CLASSES[size]

  if (!borderClass) {
    // 테두리 없음 - 기본 스타일
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`${sizeClass} rounded-full ${borderClass} overflow-hidden`}>
      {children}
    </div>
  )
}
