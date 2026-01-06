import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function LoginScreen() {
  const { signInWithGoogle, signInWithKakao } = useAuth()
  const [isLoading, setIsLoading] = useState<'google' | 'kakao' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setIsLoading('google')
      setError(null)
      await signInWithGoogle()
    } catch {
      setError('Google 로그인에 실패했습니다.')
      setIsLoading(null)
    }
  }

  const handleKakaoLogin = async () => {
    try {
      setIsLoading('kakao')
      setError(null)
      await signInWithKakao()
    } catch {
      setError('카카오 로그인에 실패했습니다.')
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* 불꽃 배경 효과 */}
            <div className="absolute -inset-x-8 -inset-y-4">
              {/* 바깥쪽 글로우 - 느린 펄스 */}
              <div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{
                  background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(239,68,68,0.1) 50%, transparent 70%)',
                  animation: 'flicker1 3s ease-in-out infinite',
                }}
              />
              {/* 중간 글로우 - 중간 속도 */}
              <div
                className="absolute inset-4 rounded-full blur-xl"
                style={{
                  background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(249,115,22,0.2) 50%, transparent 70%)',
                  animation: 'flicker2 2s ease-in-out infinite',
                }}
              />
              {/* 안쪽 글로우 - 빠른 펄스 */}
              <div
                className="absolute inset-8 rounded-full blur-lg"
                style={{
                  background: 'radial-gradient(circle, rgba(253,224,71,0.3) 0%, rgba(251,191,36,0.15) 50%, transparent 70%)',
                  animation: 'flicker3 1.5s ease-in-out infinite',
                }}
              />
            </div>
            {/* 로고 이미지 */}
            <img
              src="/images/logo.png"
              alt="대장간"
              className="relative w-48 h-auto mx-auto drop-shadow-[0_0_25px_rgba(251,146,60,0.5)]"
              style={{
                animation: 'logoGlow 2s ease-in-out infinite',
              }}
            />
          </div>
          {/* BLACKSMITH 텍스트 */}
          <p
            className="text-sm font-bold tracking-[0.3em] mt-2 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent"
            style={{
              animation: 'textGlow 2s ease-in-out infinite',
              textShadow: '0 0 20px rgba(251,146,60,0.5)',
            }}
          >
            BLACKSMITH
          </p>
          <p className="text-gray-400 mt-3 text-sm">
            장비를 강화하고 랭킹 1위에 도전하세요
          </p>
        </div>

        {/* 불꽃 애니메이션 스타일 */}
        <style>{`
          @keyframes flicker1 {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes flicker2 {
            0%, 100% { opacity: 0.5; transform: scale(1) translateY(0); }
            33% { opacity: 0.8; transform: scale(1.02) translateY(-2px); }
            66% { opacity: 0.6; transform: scale(0.98) translateY(1px); }
          }
          @keyframes flicker3 {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            25% { opacity: 0.7; transform: scale(1.03); }
            50% { opacity: 0.5; transform: scale(0.97); }
            75% { opacity: 0.8; transform: scale(1.02); }
          }
          @keyframes logoGlow {
            0%, 100% { filter: drop-shadow(0 0 20px rgba(251,146,60,0.4)); }
            50% { filter: drop-shadow(0 0 30px rgba(251,146,60,0.6)); }
          }
          @keyframes textGlow {
            0%, 100% { opacity: 0.9; }
            50% { opacity: 1; }
          }
        `}</style>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-6">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* 로그인 버튼들 */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading !== null}
            className="w-full py-4 px-6 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'google' ? (
              <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 시작하기
              </>
            )}
          </button>

          <button
            onClick={handleKakaoLogin}
            disabled={isLoading !== null}
            className="w-full py-4 px-6 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-bold rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'kakao' ? (
              <div className="w-6 h-6 border-2 border-[#191919]/30 border-t-[#191919] rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.89 5.31 4.72 6.72-.15.54-.97 3.48-1 3.63 0 .1.04.2.13.26.07.05.17.06.26.03.35-.07 4.04-2.65 4.69-3.1.39.05.79.08 1.2.08 5.52 0 10-3.58 10-8C22 6.58 17.52 3 12 3z"/>
                </svg>
                카카오로 시작하기
              </>
            )}
          </button>
        </div>

        {/* 안내 문구 */}
        <p className="text-gray-500 text-xs text-center mt-6">
          로그인하면 게임 데이터가 저장되며<br />
          다른 기기에서도 이어서 플레이할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
