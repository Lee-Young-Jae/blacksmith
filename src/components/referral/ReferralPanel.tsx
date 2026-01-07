import { useState } from 'react'
import { FiCopy, FiShare2, FiUsers, FiGift, FiX, FiCheck } from 'react-icons/fi'
import { useReferral } from '../../hooks/useReferral'
import {
  REFERRAL_REWARDS,
  REFERRAL_STATUS_TEXT,
  REFERRAL_STATUS_COLOR,
} from '../../types/referral'

interface ReferralPanelProps {
  onClose: () => void
}

export function ReferralPanel({ onClose }: ReferralPanelProps) {
  const {
    myCode,
    referrals,
    myReferrer,
    isLoading,
    completedCount,
    pendingCount,
    copyCode,
    shareCode,
    generateCode,
  } = useReferral()

  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleCopyCode = async () => {
    const success = await copyCode()
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareCode = async () => {
    const result = await shareCode()
    if (result) {
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleGenerateCode = async () => {
    setIsGenerating(true)
    await generateCode()
    setIsGenerating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 패널 */}
      <div className="relative w-full max-w-lg bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <FiUsers className="text-2xl text-purple-400" />
            <h2 className="text-xl font-bold text-white">친구 초대</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* 내 초대 코드 */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  내 초대 코드
                </h3>

                {myCode ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-3 bg-gray-800 rounded-lg border border-gray-600 font-mono text-xl text-center text-purple-300 tracking-widest">
                      {myCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                      title="복사"
                    >
                      {copied ? (
                        <FiCheck className="text-xl text-green-400" />
                      ) : (
                        <FiCopy className="text-xl" />
                      )}
                    </button>
                    <button
                      onClick={handleShareCode}
                      className="p-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors"
                      title="공유"
                    >
                      {shared ? (
                        <FiCheck className="text-xl text-green-300" />
                      ) : (
                        <FiShare2 className="text-xl" />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateCode}
                    disabled={isGenerating}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                  >
                    {isGenerating ? '생성 중...' : '초대 코드 생성하기'}
                  </button>
                )}
              </section>

              {/* 보상 안내 */}
              <section className="p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-700/50">
                <h3 className="flex items-center gap-2 text-sm font-medium text-purple-300 mb-3">
                  <FiGift className="text-lg" />
                  초대 보상
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-400">초대한 사람</p>
                    <p className="text-yellow-400 font-medium">
                      {REFERRAL_REWARDS.referrer.gold.toLocaleString()}G
                    </p>
                    <p className="text-blue-400 font-medium">
                      {REFERRAL_REWARDS.referrer.ticketLevel}성 강화권 x{REFERRAL_REWARDS.referrer.ticketCount}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400">초대받은 사람</p>
                    <p className="text-yellow-400 font-medium">
                      {REFERRAL_REWARDS.referee.gold.toLocaleString()}G
                    </p>
                    <p className="text-blue-400 font-medium">
                      {REFERRAL_REWARDS.referee.ticketLevel}성 강화권 x{REFERRAL_REWARDS.referee.ticketCount}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  * 초대받은 친구가 첫 강화를 완료하면 보상이 지급됩니다
                </p>
              </section>

              {/* 나를 초대한 친구 */}
              {myReferrer && (
                <section className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">나를 초대한 친구</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{myReferrer.referrerName}</span>
                    <span className={REFERRAL_STATUS_COLOR[myReferrer.status]}>
                      {REFERRAL_STATUS_TEXT[myReferrer.status]}
                    </span>
                  </div>
                </section>
              )}

              {/* 초대 현황 */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    초대한 친구들
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-yellow-400">대기 {pendingCount}</span>
                    <span className="text-green-400">완료 {completedCount}</span>
                  </div>
                </div>

                {referrals.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <FiUsers className="mx-auto text-4xl mb-2 opacity-50" />
                    <p>아직 초대한 친구가 없어요</p>
                    <p className="text-sm">초대 코드를 공유해보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                      >
                        <div>
                          <p className="text-white font-medium">{referral.refereeName}</p>
                          <p className="text-xs text-gray-500">
                            {referral.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm ${REFERRAL_STATUS_COLOR[referral.status]}`}>
                            {REFERRAL_STATUS_TEXT[referral.status]}
                          </span>
                          {referral.referrerRewarded && (
                            <p className="text-xs text-green-400">보상 수령 완료</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
