/**
 * 캐싱 기능이 있는 이미지 컴포넌트
 *
 * - 이미지 캐싱 및 자동 재시도
 * - 로딩 상태 표시
 * - 에러 시 fallback 표시
 */

import { useImageCache } from '../../hooks/useImageCache'

interface CachedImageProps {
  src: string | undefined
  alt: string
  className?: string
  fallback?: React.ReactNode
  showLoading?: boolean
  loadingClassName?: string
  onLoad?: () => void
  onError?: () => void
}

export function CachedImage({
  src,
  alt,
  className = '',
  fallback,
  showLoading = true,
  loadingClassName = '',
  onLoad,
  onError,
}: CachedImageProps) {
  const { isLoaded, isLoading, hasError, retry } = useImageCache(src)

  // 로딩 콜백
  if (isLoaded && onLoad) {
    onLoad()
  }

  // 에러 콜백
  if (hasError && onError) {
    onError()
  }

  // src가 없으면 fallback 표시
  if (!src) {
    return <>{fallback}</>
  }

  // 로딩 중
  if (isLoading && showLoading) {
    return (
      <div className={`flex items-center justify-center ${loadingClassName || className}`}>
        <div className="w-1/3 h-1/3 min-w-[12px] min-h-[12px] border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
      </div>
    )
  }

  // 로드 성공
  if (isLoaded) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
      />
    )
  }

  // 에러 - fallback 또는 재시도 버튼
  if (hasError) {
    if (fallback) {
      return (
        <div onClick={retry} style={{ cursor: 'pointer' }} title="클릭하여 다시 로드">
          {fallback}
        </div>
      )
    }
    return (
      <div
        className={`flex items-center justify-center bg-gray-700/50 ${className}`}
        onClick={retry}
        style={{ cursor: 'pointer' }}
        title="클릭하여 다시 로드"
      >
        <span className="text-gray-400 text-xs">!</span>
      </div>
    )
  }

  // 기본 fallback
  return <>{fallback}</>
}

export default CachedImage
