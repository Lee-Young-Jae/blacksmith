import { useState, useEffect } from 'react'
import type { UserSearchResult } from '../../types/gift'

interface AdminGoldPanelProps {
  onSearch: (query: string) => Promise<UserSearchResult[]>
  onSendGold: (receiverId: string, amount: number, message?: string) => Promise<boolean>
  onClose: () => void
}

export function AdminGoldPanel({
  onSearch,
  onSendGold,
  onClose,
}: AdminGoldPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [goldAmount, setGoldAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 유저 검색
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await onSearch(searchQuery)
      setSearchResults(results)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, onSearch])

  const handleSend = async () => {
    if (!selectedUser) {
      setError('받는 사람을 선택해주세요.')
      return
    }

    const amount = parseInt(goldAmount, 10)
    if (isNaN(amount) || amount <= 0) {
      setError('올바른 골드 금액을 입력해주세요.')
      return
    }

    setIsSending(true)
    setError(null)
    setSuccess(null)

    const result = await onSendGold(
      selectedUser.userId,
      amount,
      message.trim() || undefined
    )

    if (result) {
      setSuccess(`${selectedUser.username}님에게 ${amount.toLocaleString()} 골드를 전송했습니다.`)
      // 폼 초기화
      setSelectedUser(null)
      setGoldAmount('')
      setMessage('')
      setSearchQuery('')
    } else {
      setError('골드 전송에 실패했습니다. 관리자 권한을 확인해주세요.')
    }

    setIsSending(false)
  }

  // 빠른 금액 버튼
  const quickAmounts = [1000, 5000, 10000, 50000, 100000]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-[var(--color-bg-elevated-1)] rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-amber-500/10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪙</span>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              골드 지급 (관리자)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-elevated-2)] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 받는 사람 검색 */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              받는 사람
            </label>
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 bg-[var(--color-bg-elevated-2)] rounded-lg">
                <span className="text-[var(--color-text-primary)] font-medium">
                  {selectedUser.username}
                </span>
                <button
                  onClick={() => {
                    setSelectedUser(null)
                    setSearchQuery('')
                    setSuccess(null)
                  }}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  변경
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="닉네임으로 검색 (2자 이상)"
                  className="w-full bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* 검색 결과 */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {searchResults.map(user => (
                      <button
                        key={user.userId}
                        onClick={() => {
                          setSelectedUser(user)
                          setSearchQuery('')
                          setSearchResults([])
                          setSuccess(null)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[var(--color-bg-elevated-3)] text-[var(--color-text-primary)]"
                      >
                        {user.username}
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    검색 결과가 없습니다
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 골드 금액 입력 */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              골드 금액
            </label>
            <input
              type="number"
              value={goldAmount}
              onChange={(e) => {
                setGoldAmount(e.target.value)
                setError(null)
              }}
              min={1}
              placeholder="지급할 골드 금액"
              className="w-full bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
            />

            {/* 빠른 금액 선택 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setGoldAmount(amount.toString())}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] text-[var(--color-accent)] border border-[var(--color-border)] transition-colors"
                >
                  +{amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* 메시지 입력 */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              메시지 (선택사항)
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={100}
              placeholder="예: 이벤트 보상, 버그 보상 등"
              className="w-full bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          {/* 성공 메시지 */}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400">{success}</p>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="p-4 border-t border-[var(--color-border)] flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] text-[var(--color-text-primary)] font-bold transition-colors"
          >
            닫기
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !selectedUser || !goldAmount}
            className="flex-1 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                전송 중...
              </>
            ) : (
              <>
                <span>🪙</span>
                골드 지급
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
