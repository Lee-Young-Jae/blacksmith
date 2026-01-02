import { useEffect, useState } from 'react'
import type { EnhanceResult } from '../types/starforce'

interface EnhanceEffectProps {
  result: EnhanceResult | null
  isEnhancing: boolean
}

export function EnhanceEffect({ result, isEnhancing }: EnhanceEffectProps) {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; delay: number }[]>([])

  useEffect(() => {
    if (result === 'success') {
      // 성공 시 반짝임 효과
      const newSparkles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 60,
        y: 40 + (Math.random() - 0.5) * 40,
        delay: Math.random() * 0.3,
      }))
      setSparkles(newSparkles)
      setTimeout(() => setSparkles([]), 1000)
    }
  }, [result])

  return (
    <>
      {/* 강화 중 오라 효과 */}
      {isEnhancing && (
        <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
          <div className="w-64 h-64 rounded-full bg-gradient-radial from-yellow-500/30 via-transparent to-transparent animate-pulse" />
          <div className="absolute w-48 h-48 rounded-full border-2 border-yellow-400/50 animate-ping" />
        </div>
      )}

      {/* 성공 반짝임 */}
      {sparkles.map(s => (
        <div
          key={s.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animation: `sparkle 0.6s ease-out forwards`,
            animationDelay: `${s.delay}s`,
          }}
        >
          <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12,0 14,10 24,12 14,14 12,24 10,14 0,12 10,10" />
          </svg>
        </div>
      ))}

      {/* 결과 오버레이 */}
      {result === 'success' && (
        <div className="fixed inset-0 pointer-events-none z-30 bg-green-500/10 animate-[fadeOut_0.5s_ease-out_forwards]" />
      )}
      {result === 'maintain' && (
        <div className="fixed inset-0 pointer-events-none z-30 bg-gray-500/20 animate-[fadeOut_0.5s_ease-out_forwards]" />
      )}
      {result === 'destroy' && (
        <div className="fixed inset-0 pointer-events-none z-30 bg-red-500/20 animate-[fadeOut_0.8s_ease-out_forwards]" />
      )}

      <style>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}
