import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

// 튜토리얼 스텝 정의
export interface TutorialStep {
  id: string
  targetId: string // 하이라이트할 요소의 ID
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
  action?: 'click' | 'navigate' // 완료 조건
  nextTab?: string // 다음 탭으로 이동해야 하는 경우
  allowInteraction?: boolean // true면 내부 요소 클릭 허용 (장비 장착 등)
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    targetId: 'tutorial-start',
    title: '대장간에 오신 것을 환영합니다!',
    description: '지금부터 게임 방법을 알려드릴게요. 준비되셨나요?',
    position: 'bottom',
    action: 'click',
  },
  {
    id: 'gacha-tab',
    targetId: 'nav-tab-gacha',
    title: '장비 뽑기',
    description: '먼저 가챠 탭을 눌러 장비를 획득해보세요!',
    position: 'bottom',
    action: 'click',
    nextTab: 'gacha',
  },
  {
    id: 'gacha-pull',
    targetId: 'gacha-pull-button',
    title: '장비 뽑기',
    description: '1회 뽑기 버튼을 눌러 장비를 획득하세요!',
    position: 'top',
    action: 'click',
    allowInteraction: true, // 뽑기 후 결과 확인 시간 필요
  },
  {
    id: 'equipment-tab',
    targetId: 'nav-tab-equipment',
    title: '장비 장착',
    description: '이제 장비 탭으로 이동해서 방금 뽑은 장비를 장착해보세요!',
    position: 'bottom',
    action: 'click',
    nextTab: 'equipment',
  },
  {
    id: 'equipment-slot',
    targetId: 'equipment-inventory',
    title: '장비 장착하기',
    description: '인벤토리에서 장비를 클릭해서 장착해보세요!',
    position: 'left',
    action: 'click',
    allowInteraction: true, // 내부 장비 클릭 허용
  },
  {
    id: 'enhance-tab',
    targetId: 'nav-tab-enhance',
    title: '장비 강화',
    description: '이제 강화 탭에서 장비를 더 강하게 만들어보세요!',
    position: 'bottom',
    action: 'click',
    nextTab: 'enhance',
  },
  {
    id: 'enhance-select',
    targetId: 'enhance-inventory',
    title: '강화할 장비 선택',
    description: '강화할 장비를 클릭해서 선택하세요!',
    position: 'right',
    action: 'click',
    allowInteraction: true, // 내부 장비 클릭 허용
  },
  {
    id: 'enhance-button',
    targetId: 'enhance-button',
    title: '강화하기!',
    description: '강화 버튼을 눌러 장비를 강화해보세요! 성공하면 별이 올라가요.',
    position: 'left',
    action: 'click',
  },
  {
    id: 'complete',
    targetId: 'tutorial-complete',
    title: '튜토리얼 완료!',
    description: '축하해요! 이제 자유롭게 대장간을 즐겨보세요. 더 강한 장비를 만들어 대결에서 승리하세요!',
    position: 'bottom',
    action: 'click',
  },
]

interface TutorialContextType {
  isActive: boolean
  currentStep: number
  currentStepData: TutorialStep | null
  totalSteps: number
  startTutorial: () => void
  nextStep: () => void
  skipTutorial: () => void
  completeTutorial: () => void
  isStepTarget: (elementId: string) => boolean
  hasCompletedTutorial: boolean
}

const TutorialContext = createContext<TutorialContextType | null>(null)

const TUTORIAL_STORAGE_KEY = 'blacksmith_tutorial_completed'

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true) // 기본값 true로 시작

  // 로컬 스토리지에서 튜토리얼 완료 여부 확인
  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    setHasCompletedTutorial(completed === 'true')
  }, [])

  // 개발/테스트용: 콘솔에서 튜토리얼 제어 가능
  useEffect(() => {
    const tutorialControls = {
      start: () => {
        setCurrentStep(0)
        setIsActive(true)
        console.log('🎓 튜토리얼 시작!')
      },
      reset: () => {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY)
        setHasCompletedTutorial(false)
        setIsActive(false)
        setCurrentStep(0)
        console.log('🔄 튜토리얼 상태 초기화됨. 새로고침하면 처음부터 시작됩니다.')
      },
      skip: () => {
        setIsActive(false)
        setHasCompletedTutorial(true)
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
        console.log('⏭️ 튜토리얼 건너뜀')
      },
      status: () => {
        console.log('📊 튜토리얼 상태:', {
          isActive,
          currentStep,
          hasCompletedTutorial,
          totalSteps: TUTORIAL_STEPS.length,
        })
      },
    }

    // window 객체에 노출
    ;(window as unknown as { tutorial: typeof tutorialControls }).tutorial = tutorialControls
    console.log('💡 튜토리얼 테스트: tutorial.start() / tutorial.reset() / tutorial.skip() / tutorial.status()')

    return () => {
      delete (window as unknown as { tutorial?: typeof tutorialControls }).tutorial
    }
  }, [isActive, currentStep, hasCompletedTutorial])

  const currentStepData = isActive && currentStep < TUTORIAL_STEPS.length
    ? TUTORIAL_STEPS[currentStep]
    : null

  const startTutorial = useCallback(() => {
    // 튜토리얼 시작 시 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentStep(0)
    setIsActive(true)
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // 마지막 스텝이면 완료
      setIsActive(false)
      setHasCompletedTutorial(true)
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
    }
  }, [currentStep])

  const skipTutorial = useCallback(() => {
    setIsActive(false)
    setHasCompletedTutorial(true)
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
  }, [])

  const completeTutorial = useCallback(() => {
    setIsActive(false)
    setHasCompletedTutorial(true)
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
  }, [])

  const isStepTarget = useCallback((elementId: string) => {
    return isActive && currentStepData?.targetId === elementId
  }, [isActive, currentStepData])

  return (
    <TutorialContext.Provider value={{
      isActive,
      currentStep,
      currentStepData,
      totalSteps: TUTORIAL_STEPS.length,
      startTutorial,
      nextStep,
      skipTutorial,
      completeTutorial,
      isStepTarget,
      hasCompletedTutorial,
    }}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider')
  }
  return context
}
