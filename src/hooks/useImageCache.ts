/**
 * 이미지 캐시 및 프리로딩 훅
 *
 * - 한번 로드한 이미지는 메모리에 캐싱
 * - 로드 실패 시 자동 재시도 (최대 3회)
 * - 로딩 상태 관리
 * - 여러 컴포넌트에서 같은 이미지 요청 시 중복 로드 방지
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// =============================================
// 글로벌 이미지 캐시 (모듈 레벨)
// =============================================

interface CacheEntry {
  status: 'loading' | 'loaded' | 'error'
  url: string
  retryCount: number
  subscribers: Set<() => void>
  element?: HTMLImageElement
}

// 전역 캐시 맵
const imageCache = new Map<string, CacheEntry>()

// 최대 재시도 횟수
const MAX_RETRIES = 3

// 재시도 딜레이 (ms)
const RETRY_DELAY = 1000

// =============================================
// 이미지 프리로드 함수 (외부에서 호출 가능)
// =============================================

export function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 이미 캐시에 있고 로드 완료된 경우
    const cached = imageCache.get(src)
    if (cached?.status === 'loaded') {
      resolve(true)
      return
    }

    const img = new Image()
    img.onload = () => {
      imageCache.set(src, {
        status: 'loaded',
        url: src,
        retryCount: 0,
        subscribers: new Set(),
        element: img,
      })
      resolve(true)
    }
    img.onerror = () => {
      resolve(false)
    }
    img.src = src
  })
}

// 여러 이미지 프리로드
export function preloadImages(srcs: string[]): Promise<boolean[]> {
  return Promise.all(srcs.map(preloadImage))
}

// =============================================
// 이미지 캐시 훅
// =============================================

interface UseImageCacheResult {
  isLoaded: boolean
  isLoading: boolean
  hasError: boolean
  retry: () => void
}

export function useImageCache(src: string | undefined): UseImageCacheResult {
  const [state, setState] = useState<{
    isLoaded: boolean
    isLoading: boolean
    hasError: boolean
  }>(() => {
    if (!src) return { isLoaded: false, isLoading: false, hasError: false }

    const cached = imageCache.get(src)
    if (cached) {
      return {
        isLoaded: cached.status === 'loaded',
        isLoading: cached.status === 'loading',
        hasError: cached.status === 'error',
      }
    }
    return { isLoaded: false, isLoading: true, hasError: false }
  })

  const srcRef = useRef(src)
  srcRef.current = src

  // 구독 해제 함수
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // 이미지 로드 시작
  const loadImage = useCallback((imageUrl: string, isRetry = false) => {
    const cached = imageCache.get(imageUrl)

    // 이미 로드 완료
    if (cached?.status === 'loaded') {
      setState({ isLoaded: true, isLoading: false, hasError: false })
      return
    }

    // 이미 로딩 중이면 구독만 추가
    if (cached?.status === 'loading' && !isRetry) {
      const updateState = () => {
        const entry = imageCache.get(imageUrl)
        if (entry) {
          setState({
            isLoaded: entry.status === 'loaded',
            isLoading: entry.status === 'loading',
            hasError: entry.status === 'error',
          })
        }
      }
      cached.subscribers.add(updateState)
      unsubscribeRef.current = () => cached.subscribers.delete(updateState)
      return
    }

    // 새로 로딩 시작
    const entry: CacheEntry = cached || {
      status: 'loading',
      url: imageUrl,
      retryCount: 0,
      subscribers: new Set(),
    }

    if (!cached) {
      imageCache.set(imageUrl, entry)
    }
    entry.status = 'loading'

    setState({ isLoaded: false, isLoading: true, hasError: false })

    const img = new Image()

    img.onload = () => {
      if (srcRef.current !== imageUrl) return // 이미 다른 이미지로 변경됨

      entry.status = 'loaded'
      entry.element = img
      entry.retryCount = 0

      // 모든 구독자에게 알림
      entry.subscribers.forEach(cb => cb())
      entry.subscribers.clear()

      setState({ isLoaded: true, isLoading: false, hasError: false })
    }

    img.onerror = () => {
      if (srcRef.current !== imageUrl) return

      // 재시도
      if (entry.retryCount < MAX_RETRIES) {
        entry.retryCount++
        setTimeout(() => {
          if (srcRef.current === imageUrl) {
            loadImage(imageUrl, true)
          }
        }, RETRY_DELAY * entry.retryCount)
        return
      }

      // 최대 재시도 초과
      entry.status = 'error'

      // 모든 구독자에게 알림
      entry.subscribers.forEach(cb => cb())
      entry.subscribers.clear()

      setState({ isLoaded: false, isLoading: false, hasError: true })
    }

    img.src = imageUrl
  }, [])

  // src 변경 시 로드
  useEffect(() => {
    if (!src) {
      setState({ isLoaded: false, isLoading: false, hasError: false })
      return
    }

    // 이전 구독 해제
    unsubscribeRef.current?.()
    unsubscribeRef.current = null

    loadImage(src)

    return () => {
      unsubscribeRef.current?.()
    }
  }, [src, loadImage])

  // 수동 재시도
  const retry = useCallback(() => {
    if (!src) return

    const cached = imageCache.get(src)
    if (cached) {
      cached.retryCount = 0
      cached.status = 'loading'
    }

    loadImage(src, true)
  }, [src, loadImage])

  return {
    ...state,
    retry,
  }
}

// =============================================
// 캐시 유틸리티
// =============================================

// 캐시에서 이미지가 로드되었는지 확인
export function isImageCached(src: string): boolean {
  return imageCache.get(src)?.status === 'loaded'
}

// 캐시 클리어
export function clearImageCache(): void {
  imageCache.clear()
}

// 특정 이미지 캐시 제거
export function removeFromCache(src: string): void {
  imageCache.delete(src)
}

// 캐시 통계
export function getCacheStats(): { total: number; loaded: number; loading: number; error: number } {
  let loaded = 0, loading = 0, error = 0
  imageCache.forEach(entry => {
    if (entry.status === 'loaded') loaded++
    else if (entry.status === 'loading') loading++
    else error++
  })
  return { total: imageCache.size, loaded, loading, error }
}
