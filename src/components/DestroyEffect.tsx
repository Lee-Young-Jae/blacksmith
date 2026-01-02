import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  size: number
  opacity: number
}

interface DestroyEffectProps {
  isActive: boolean
  onComplete?: () => void
}

export function DestroyEffect({ isActive, onComplete }: DestroyEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (!isActive) return

    // 화면 흔들림
    setShake(true)
    setTimeout(() => setShake(false), 500)

    // 파편 생성
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: 50,
      y: 50,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30 - 10,
      rotation: Math.random() * 360,
      size: Math.random() * 20 + 10,
      opacity: 1,
    }))
    setParticles(newParticles)

    // 파편 애니메이션
    let frame = 0
    const maxFrames = 60

    const animate = () => {
      frame++
      if (frame >= maxFrames) {
        setParticles([])
        onComplete?.()
        return
      }

      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.vx * 0.5,
          y: p.y + p.vy * 0.5 + frame * 0.3, // 중력
          vy: p.vy + 0.5,
          rotation: p.rotation + 10,
          opacity: 1 - frame / maxFrames,
        }))
      )

      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [isActive, onComplete])

  if (!isActive && particles.length === 0) return null

  return (
    <>
      {/* 화면 흔들림 효과 - body에 클래스 추가 */}
      {shake && (
        <style>{`
          body {
            animation: shake 0.5s ease-in-out;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
          }
        `}</style>
      )}

      {/* 파편 효과 */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              transform: `rotate(${p.rotation}deg)`,
            }}
          >
            <svg viewBox="0 0 20 20" className="w-full h-full">
              <polygon
                points="10,0 20,7 16,20 4,20 0,7"
                fill={`hsl(${Math.random() * 30 + 15}, 80%, ${50 + Math.random() * 20}%)`}
              />
            </svg>
          </div>
        ))}

        {/* 플래시 효과 */}
        {shake && (
          <div className="absolute inset-0 bg-red-500/30 animate-pulse" />
        )}
      </div>
    </>
  )
}
