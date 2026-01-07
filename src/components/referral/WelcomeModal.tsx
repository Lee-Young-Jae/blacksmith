import { useState } from 'react'
import { GiAnvilImpact, GiHammerNails } from 'react-icons/gi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface WelcomeModalProps {
  username: string
  onComplete: () => void
}

export function WelcomeModal({ username, onComplete }: WelcomeModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<'welcome' | 'referral' | 'complete'>('welcome')
  const [referralCode, setReferralCode] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const handleApplyCode = async () => {
    if (!user || !referralCode.trim()) return

    setIsApplying(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase
        .rpc('apply_referral_code', {
          p_referee_id: user.id,
          p_referral_code: referralCode.trim().toUpperCase(),
        })

      if (rpcError) throw rpcError

      if (data) {
        setApplied(true)
        setTimeout(() => setStep('complete'), 1000)
      } else {
        setError('유효하지 않은 초대 코드입니다')
      }
    } catch (err) {
      console.error('Failed to apply referral code:', err)
      setError('코드 적용에 실패했습니다')
    } finally {
      setIsApplying(false)
    }
  }

  const handleSkip = () => {
    setStep('complete')
  }

  const handleStart = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
      <div className="relative w-full max-w-md">
        {/* 배경 장식 */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-60 h-20 bg-red-500/10 rounded-full blur-2xl" />

        {/* 메인 카드 */}
        <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-orange-900/50 shadow-2xl overflow-hidden">
          {/* 상단 장식 */}
          <div className="h-2 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600" />

          <div className="p-8">
            {/* 환영 단계 */}
            {step === 'welcome' && (
              <div className="text-center space-y-6 animate-fadeIn">
                <div className="relative inline-block">
                  <GiAnvilImpact className="text-7xl text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.5)]" />
                  <div className="absolute -bottom-1 -right-1">
                    <GiHammerNails className="text-3xl text-yellow-400 animate-bounce" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white">
                    대장간에 오신 것을 환영합니다!
                  </h1>
                  <p className="text-orange-300 font-medium">
                    {username} 대장장이님
                  </p>
                </div>

                <div className="py-4 space-y-2 text-gray-300 text-sm">
                  <p>이곳에서 최고의 장비를 만들어보세요.</p>
                  <p>강화하고, 수집하고, 전투에서 승리하세요!</p>
                </div>

                <button
                  onClick={() => setStep('referral')}
                  className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-xl text-white font-bold text-lg shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02]"
                >
                  시작하기
                </button>
              </div>
            )}

            {/* 초대 코드 단계 */}
            {step === 'referral' && (
              <div className="text-center space-y-6 animate-fadeIn">
                <GiHammerNails className="text-5xl text-yellow-400 mx-auto" />

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">
                    혹시 소개해준 친구가 있나요?
                  </h2>
                  <p className="text-gray-400 text-sm">
                    친구의 초대 코드가 있다면 입력해주세요
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase())
                      setError(null)
                    }}
                    placeholder="초대 코드 8자리"
                    maxLength={8}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-center text-xl font-mono tracking-widest text-white placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    disabled={applied}
                  />

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}

                  {applied && (
                    <p className="text-green-400 text-sm flex items-center justify-center gap-2">
                      <span className="text-lg">✓</span>
                      초대 코드가 적용되었습니다!
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {!applied && (
                    <button
                      onClick={handleApplyCode}
                      disabled={!referralCode.trim() || isApplying}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-all"
                    >
                      {isApplying ? '적용 중...' : '코드 적용하기'}
                    </button>
                  )}

                  <button
                    onClick={handleSkip}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 font-medium transition-colors"
                  >
                    {applied ? '다음으로' : '건너뛰기'}
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  * 첫 강화를 완료하면 초대자와 함께 보상을 받을 수 있어요!
                </p>
              </div>
            )}

            {/* 완료 단계 */}
            {step === 'complete' && (
              <div className="text-center space-y-6 animate-fadeIn">
                <div className="text-6xl">🔥</div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">
                    준비 완료!
                  </h2>
                  <p className="text-gray-400">
                    이제 대장간의 불꽃을 지펴봅시다
                  </p>
                </div>

                {applied && (
                  <div className="p-4 bg-purple-900/30 border border-purple-700/50 rounded-lg">
                    <p className="text-purple-300 text-sm">
                      🎁 첫 강화를 완료하면 초대 보상이 지급됩니다!
                    </p>
                  </div>
                )}

                <button
                  onClick={handleStart}
                  className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl text-white font-bold text-lg shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02]"
                >
                  대장간 입장
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
