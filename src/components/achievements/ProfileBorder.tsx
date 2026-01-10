import { type ReactNode } from 'react'

// =============================================
// 타입 정의
// =============================================

interface ProfileBorderProps {
  /** 업적 ID (권장) - 자동으로 프레임 경로와 배율 적용 */
  borderId?: string | null
  /** 프레임 이미지 경로 (레거시) - borderId가 없을 때 사용 */
  frameImage?: string | null
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

interface AvatarWithBorderProps {
  avatarUrl?: string | null
  username?: string
  /** 업적 ID (권장) - 자동으로 프레임 경로와 배율 적용 */
  borderId?: string | null
  /** 프레임 이미지 경로 (레거시) - borderId가 없을 때 사용 */
  frameImage?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallbackIcon?: ReactNode
}

// =============================================
// 크기 설정
// =============================================

const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
}

const SIZE_PX = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
}

// =============================================
// 프레임 설정 (업적 ID → 설정)
// 새 프레임 추가 시 여기에만 추가하면 됨
// =============================================

interface FrameConfig {
  scale: number  // 프레임 배율 (1.0 = 아바타와 동일 크기)
}

const FRAME_CONFIGS: Record<string, FrameConfig> = {
  'star_25': { scale: 1.3 },        // 시즌 1: 개척자의 영광
  // 'star_30_tier1': { scale: 1.3 }, // 시즌 2: 불굴의 장인 (프레임 준비되면 추가)
  // 'star_35_tier2': { scale: 1.3 }, // 시즌 3: 신화의 대장장이 (프레임 준비되면 추가)
}

// =============================================
// 헬퍼 함수
// =============================================

// 해당 업적에 프레임이 있는지 확인
export function hasFrameForAchievement(achievementId: string | null | undefined): boolean {
  return !!achievementId && achievementId in FRAME_CONFIGS
}

// 업적 ID로 프레임 이미지 경로 생성
export function getFrameImagePath(achievementId: string): string {
  return `/frames/${achievementId}.png`
}

// 업적 ID로 프레임 배율 가져오기
export function getFrameScale(achievementId: string): number {
  return FRAME_CONFIGS[achievementId]?.scale ?? 1.3
}

/**
 * 업적 ID로 프레임 정보 가져오기 (통합 헬퍼)
 * 반복되는 `equippedBorder && hasFrameForAchievement(...) ? getFrameImagePath(...) : null` 패턴 대체
 */
export function getFrameForBorder(borderId: string | null | undefined): string | null {
  if (!borderId || !hasFrameForAchievement(borderId)) return null
  return getFrameImagePath(borderId)
}

// =============================================
// ProfileBorder 컴포넌트
// =============================================

export function ProfileBorder({
  borderId,
  frameImage,
  children,
  size = 'md',
}: ProfileBorderProps) {
  const sizeClass = SIZE_CLASSES[size]
  const sizePx = SIZE_PX[size]

  // borderId가 있으면 자동으로 프레임 경로와 배율 계산
  const resolvedFrameImage = borderId && hasFrameForAchievement(borderId)
    ? getFrameImagePath(borderId)
    : frameImage
  const frameScale = borderId ? getFrameScale(borderId) : 1.3

  // 프레임 이미지가 있는 경우
  if (resolvedFrameImage) {
    const frameSize = sizePx * frameScale
    const frameOffset = (frameSize - sizePx) / 2

    return (
      // 컨테이너는 항상 아바타 크기 유지 (레이아웃 일관성)
      <div
        className="relative inline-block"
        style={{ width: sizePx, height: sizePx }}
      >
        {/* 메인 콘텐츠 (프로필 이미지) */}
        <div className={`relative ${sizeClass} rounded-full overflow-hidden`}>
          {children}
        </div>

        {/* 이미지 프레임 오버레이 - 중앙에서 오버플로우 */}
        <img
          src={resolvedFrameImage}
          alt=""
          className="absolute pointer-events-none"
          style={{
            width: frameSize,
            height: frameSize,
            minWidth: frameSize,
            minHeight: frameSize,
            top: -frameOffset,
            left: -frameOffset,
            zIndex: 10,
            objectFit: 'contain',
            aspectRatio: '1 / 1',
          }}
        />
      </div>
    )
  }

  // 프레임 이미지가 없는 경우 - 테두리 없이 표시
  return (
    <div className="relative inline-block">
      <div className={`relative ${sizeClass} rounded-full overflow-hidden`}>
        {children}
      </div>
    </div>
  )
}

// =============================================
// AvatarWithBorder 컴포넌트
// =============================================

export function AvatarWithBorder({
  avatarUrl,
  username = '',
  borderId,
  frameImage,
  size = 'md',
  fallbackIcon,
}: AvatarWithBorderProps) {
  return (
    <ProfileBorder
      borderId={borderId}
      frameImage={frameImage}
      size={size}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full object-cover"
        />
      ) : fallbackIcon ? (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          {fallbackIcon}
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-gray-400">
          {username.charAt(0).toUpperCase() || '?'}
        </div>
      )}
    </ProfileBorder>
  )
}
