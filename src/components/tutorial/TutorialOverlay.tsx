import { useEffect, useState, useCallback } from 'react'
import { useTutorial } from '../../contexts/TutorialContext'

interface SpotlightPosition {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialOverlay() {
  const { isActive, currentStepData, currentStep, totalSteps, nextStep, skipTutorial } = useTutorial()
  const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null)
  const [interacted, setInteracted] = useState(false) // allowInteraction 스텝에서 클릭 후 상태
  const [secondaryTarget, setSecondaryTarget] = useState<SpotlightPosition | null>(null) // 클릭 후 새로운 타겟
  const [isReady, setIsReady] = useState(false) // 위치 계산 완료 후 표시

  // 타겟 요소 위치 계산 및 스크롤
  const updatePositions = useCallback(() => {
    if (!currentStepData) return

    // 환영/완료 스텝은 화면 중앙에 표시
    if (currentStepData.id === 'welcome' || currentStepData.id === 'complete') {
      setSpotlight(null)
      return
    }

    // 타겟 요소 찾기 (최대 20번 재시도)
    let retryCount = 0
    const maxRetries = 20

    const findAndPositionTarget = () => {
      const targetElement = document.getElementById(currentStepData.targetId)
      if (!targetElement) {
        retryCount++
        if (retryCount < maxRetries) {
          setTimeout(findAndPositionTarget, 150)
        } else {
          console.warn(`Tutorial target not found after ${maxRetries} retries: ${currentStepData.targetId}`)
          // 요소를 못 찾아도 일단 ready 상태로 전환 (툴팁은 표시)
          setIsReady(true)
        }
        return
      }

      const rect = targetElement.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // 이미 화면에 보이는지 확인 (nav 탭 등)
      const isInView = rect.top >= 0 && rect.bottom <= viewportHeight

      // 화면에 없으면 스크롤
      if (!isInView) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      // 스크롤 완료 대기 후 위치 계산 (스크롤 없으면 짧은 대기)
      const scrollDelay = isInView ? 100 : 500

      setTimeout(() => {
        // 스크롤 후 다시 위치 계산
        const finalRect = targetElement.getBoundingClientRect()
        const padding = 8

        setSpotlight({
          top: finalRect.top - padding,
          left: finalRect.left - padding,
          width: finalRect.width + padding * 2,
          height: finalRect.height + padding * 2,
        })
        // 스포트라이트 설정 후 표시
        setTimeout(() => setIsReady(true), 50)
      }, scrollDelay)
    }

    findAndPositionTarget()
  }, [currentStepData])

  // 스텝 변경 시 위치 업데이트 및 상태 초기화
  useEffect(() => {
    if (!isActive || !currentStepData) {
      return
    }

    setIsReady(false) // 스텝 변경 시 숨김
    setInteracted(false) // 스텝 변경 시 초기화
    setSecondaryTarget(null) // 스텝 변경 시 초기화

    // welcome/complete 스텝은 즉시 표시
    if (currentStepData.id === 'welcome' || currentStepData.id === 'complete') {
      setTimeout(() => setIsReady(true), 100)
      return
    }

    const timer = setTimeout(() => {
      updatePositions()
    }, 100)
    return () => clearTimeout(timer)
  }, [isActive, currentStepData, updatePositions])

  // allowInteraction 스텝에서 클릭 감지
  useEffect(() => {
    if (!isActive || !currentStepData?.allowInteraction || interacted) return

    const handleClick = () => {
      // 클릭 후 약간의 딜레이를 두고 interacted 상태 변경
      setTimeout(() => setInteracted(true), 100)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isActive, currentStepData, interacted])

  // interacted 후 보조 타겟 찾기 (예: gacha-result)
  useEffect(() => {
    if (!interacted || !currentStepData?.allowInteraction) return

    // 보조 타겟 ID 매핑
    const secondaryTargetIds: Record<string, string> = {
      'gacha-pull': 'gacha-result',
      'equipment-slot': 'equip-button',
    }

    const secondaryId = secondaryTargetIds[currentStepData.id]
    if (!secondaryId) return

    // 보조 타겟이 나타날 때까지 폴링
    const pollInterval = setInterval(() => {
      const element = document.getElementById(secondaryId)
      if (element) {
        const rect = element.getBoundingClientRect()
        // 전체 화면을 스포트라이트로 (결과 화면 전체)
        setSecondaryTarget({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
        clearInterval(pollInterval)
      }
    }, 100)

    // 3초 후 폴링 중단
    const timeout = setTimeout(() => clearInterval(pollInterval), 3000)

    return () => {
      clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }, [interacted, currentStepData])

  // 스크롤 방지
  useEffect(() => {
    if (!isActive) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isActive])

  // 스포트라이트 영역 클릭 처리 (allowInteraction이 아닐 때만)
  const handleSpotlightClick = useCallback(() => {
    if (!currentStepData || currentStepData.allowInteraction) return

    if (currentStepData.id !== 'welcome' && currentStepData.id !== 'complete') {
      const targetElement = document.getElementById(currentStepData.targetId)
      if (targetElement) {
        targetElement.click()
      }
      setTimeout(() => nextStep(), 100)
    }
  }, [currentStepData, nextStep])

  if (!isActive || !currentStepData) return null

  const isSpecialStep = currentStepData.id === 'welcome' || currentStepData.id === 'complete'
  const showNextButton = isSpecialStep || currentStepData.allowInteraction

  // allowInteraction에서 클릭 후: 보조 타겟이 있으면 그걸 표시, 없으면 미니모드
  const hasSecondaryTarget = currentStepData.allowInteraction && interacted && secondaryTarget
  const showMiniMode = currentStepData.allowInteraction && interacted && !secondaryTarget

  // 툴팁 위치 계산 (스포트라이트를 가리지 않도록)
  const getTooltipStyle = (): React.CSSProperties => {
    // 중앙 배치: 특수 스텝(welcome/complete)
    if (isSpecialStep) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    // 클릭 후 상태 (미니 모드): 상단에 배치
    if (showMiniMode) {
      return {
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
      }
    }

    // 보조 타겟 있을 때: 상단에 배치 (결과 화면 위)
    if (hasSecondaryTarget) {
      return {
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
      }
    }

    // 스포트라이트 없을 때: 하단에 배치
    if (!spotlight) {
      return {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
      }
    }

    const tooltipWidth = 260
    const tooltipHeight = 140
    const margin = 16
    const safeGap = 24 // 스포트라이트와 툴팁 사이 최소 간격

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 스포트라이트 중심 위치
    const spotlightCenterY = spotlight.top + spotlight.height / 2

    let top = 0
    let left = spotlight.left + spotlight.width / 2 - tooltipWidth / 2

    // 스포트라이트가 화면 상단 40%에 있으면 툴팁을 아래에, 아니면 위에 배치
    if (spotlightCenterY < viewportHeight * 0.4) {
      // 스포트라이트가 상단에 있음 → 툴팁을 아래에 배치
      top = spotlight.top + spotlight.height + safeGap
    } else {
      // 스포트라이트가 하단에 있음 → 툴팁을 위에 배치
      top = spotlight.top - tooltipHeight - safeGap
    }

    // 화면 경계 체크 및 보정
    if (top < margin) {
      top = spotlight.top + spotlight.height + safeGap
    }
    if (top + tooltipHeight > viewportHeight - margin) {
      top = spotlight.top - tooltipHeight - safeGap
    }

    // 그래도 안되면 화면 중앙 하단에 고정
    if (top < margin || top + tooltipHeight > viewportHeight - margin) {
      top = viewportHeight - tooltipHeight - margin - 60
    }

    left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin))

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
    }
  }

  return (
    <>
      {/* 오버레이 - 미니모드가 아닐 때만 표시 */}
      {!showMiniMode && (
        <div
          className="fixed inset-0 z-[200]"
          style={{
            pointerEvents: (currentStepData.allowInteraction && !hasSecondaryTarget) ? 'none' : 'auto',
            opacity: isReady ? 1 : 0,
            transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {/* 보조 타겟이 있으면 그것을, 없으면 기본 스포트라이트 */}
                {hasSecondaryTarget && secondaryTarget && (
                  <rect
                    x={secondaryTarget.left}
                    y={secondaryTarget.top}
                    width={secondaryTarget.width}
                    height={secondaryTarget.height}
                    rx="8"
                    fill="black"
                  />
                )}
                {!hasSecondaryTarget && spotlight && (
                  <rect
                    x={spotlight.left}
                    y={spotlight.top}
                    width={spotlight.width}
                    height={spotlight.height}
                    rx="8"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.8)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* 스포트라이트 테두리 - 보조 타겟 */}
          {hasSecondaryTarget && secondaryTarget && (
            <div
              className="absolute rounded-lg border-2 border-yellow-400"
              style={{
                top: secondaryTarget.top,
                left: secondaryTarget.left,
                width: secondaryTarget.width,
                height: secondaryTarget.height,
                boxShadow: '0 0 0 4px rgba(250, 204, 21, 0.3)',
                cursor: 'pointer',
                transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={() => {
                // 아래 요소 클릭도 트리거 (보조 타겟 ID에 따라)
                const targetIds = ['gacha-result', 'equip-button']
                for (const id of targetIds) {
                  const element = document.getElementById(id)
                  if (element) {
                    element.click()
                    // 비동기 작업(장착, 모달 닫기 등) 완료 대기 후 다음 스텝
                    // equip-button은 모달 닫히는 시간 필요하므로 더 긴 딜레이
                    const delay = id === 'equip-button' ? 800 : 300
                    setTimeout(() => nextStep(), delay)
                    return
                  }
                }
                nextStep()
              }}
            />
          )}

          {/* 스포트라이트 테두리 - 기본 */}
          {!hasSecondaryTarget && spotlight && (
            <div
              className="absolute rounded-lg border-2 border-yellow-400"
              style={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
                pointerEvents: currentStepData.allowInteraction ? 'none' : 'auto',
                cursor: currentStepData.allowInteraction ? 'default' : 'pointer',
                transition: 'top 400ms cubic-bezier(0.4, 0, 0.2, 1), left 400ms cubic-bezier(0.4, 0, 0.2, 1), width 400ms cubic-bezier(0.4, 0, 0.2, 1), height 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }}
              onClick={handleSpotlightClick}
            />
          )}
        </div>
      )}

      {/* 툴팁 - 별도 레이어 */}
      <div
        className="z-[201]"
        style={{
          ...getTooltipStyle(),
          opacity: isReady ? 1 : 0,
          transform: `${getTooltipStyle().transform || ''} ${isReady ? 'scale(1)' : 'scale(0.95)'}`.trim(),
          transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 미니 모드: 클릭 후 상단에 작게 표시 */}
        {(showMiniMode || hasSecondaryTarget) ? (
          <div className="flex items-center gap-3 bg-gray-900/95 backdrop-blur-sm rounded-full border border-yellow-500/50 shadow-lg px-4 py-2">
            <span className="text-xs text-gray-400">
              {currentStep + 1}/{totalSteps}
            </span>
            <span className="text-sm text-yellow-400 font-medium">
              {hasSecondaryTarget ? '👆 터치하여 다음으로' : '확인 후 다음으로'}
            </span>
            {!hasSecondaryTarget && (
              <button
                onClick={nextStep}
                className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-full text-black font-bold text-xs transition-all hover:scale-105"
              >
                다음
              </button>
            )}
          </div>
        ) : (
          /* 일반 모드 */
          <div className="max-w-[260px]">
            {/* 메인 카드 */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/20 p-3">
              {/* 진행 표시 + 제목 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 shrink-0">
                  {currentStep + 1}/{totalSteps}
                </span>
                <h3 className="text-sm font-bold text-yellow-400 truncate">
                  {currentStepData.title}
                </h3>
              </div>

              {/* 설명 */}
              <p className="text-gray-300 text-xs leading-relaxed">
                {currentStepData.description}
              </p>

              {/* 다음 버튼 (showNextButton일 때만) */}
              {showNextButton && (
                <button
                  onClick={nextStep}
                  className="mt-3 w-full px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-lg text-black font-bold text-xs transition-all hover:scale-[1.02]"
                >
                  {currentStepData.id === 'complete' ? '시작하기!' : '다음'}
                </button>
              )}
            </div>

            {/* 카드 외부: 건너뛰기 */}
            <div className="mt-2 px-1">
              <button
                onClick={skipTutorial}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                건너뛰기
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
