interface ChanceTimeIndicatorProps {
  consecutiveFails: number
  isActive: boolean
}

export function ChanceTimeIndicator({ consecutiveFails, isActive }: ChanceTimeIndicatorProps) {
  if (consecutiveFails === 0 && !isActive) return null

  return (
    <div
      className={`p-4 rounded-xl text-center transition-all border ${
        isActive
          ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
          : 'bg-gray-700/30 border-gray-600/30'
      }`}
    >
      {isActive ? (
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl animate-bounce">🌟</span>
          <div>
            <p className="font-bold text-lg text-yellow-400">찬스타임!</p>
            <p className="text-sm text-yellow-300">다음 강화 100% 성공</p>
          </div>
          <span className="text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>🌟</span>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-lg">🔥</span>
            <p className="text-gray-300 text-sm font-medium">연속 실패 카운트</p>
          </div>
          <div className="flex justify-center gap-3 my-3">
            {[0, 1].map(i => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  i < consecutiveFails
                    ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/30'
                    : 'bg-gray-600/50 border border-gray-500/30'
                }`}
              >
                {i < consecutiveFails && <span className="text-white text-xs font-bold">✗</span>}
              </div>
            ))}
          </div>
          <p className="text-orange-400 text-sm font-medium">
            {2 - consecutiveFails}회 더 실패 시 찬스타임!
          </p>
        </div>
      )}
    </div>
  )
}
