import { getStarColor } from '../utils/starforce'

interface StarDisplayProps {
  level: number
  maxDisplay?: number
}

export function StarDisplay({ level, maxDisplay = 25 }: StarDisplayProps) {
  const starColor = getStarColor(level)
  const rows = Math.ceil(maxDisplay / 5)

  return (
    <div className="flex flex-col items-center gap-1">
      {Array.from({ length: rows }, (_, rowIndex) => {
        const startIdx = rowIndex * 5
        const endIdx = Math.min(startIdx + 5, maxDisplay)

        return (
          <div key={rowIndex} className="flex gap-1">
            {Array.from({ length: endIdx - startIdx }, (_, i) => {
              const starIdx = startIdx + i
              const isFilled = starIdx < level

              return (
                <span
                  key={starIdx}
                  className={`text-lg transition-all duration-300 ${
                    isFilled ? starColor : 'text-gray-600'
                  } ${isFilled && level >= 20 ? 'animate-pulse' : ''}`}
                >
                  {isFilled ? '★' : '☆'}
                </span>
              )
            })}
          </div>
        )
      })}

      {level > maxDisplay && (
        <div className={`text-sm font-bold ${starColor} mt-1`}>
          +{level - maxDisplay} 추가
        </div>
      )}
    </div>
  )
}
