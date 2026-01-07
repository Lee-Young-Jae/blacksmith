import { useState, useEffect } from 'react'
import type { UserSearchResult } from '../../types/gift'

interface AdminTicketPanelProps {
  onSearch: (query: string) => Promise<UserSearchResult[]>
  onSendTicket: (receiverId: string, ticketLevel: number, ticketCount: number, message?: string) => Promise<boolean>
  onClose: () => void
}

// 자주 사용되는 강화권 레벨
const COMMON_TICKET_LEVELS = [10, 12, 15, 17, 20, 22, 25]

export function AdminTicketPanel({
  onSearch,
  onSendTicket,
  onClose,
}: AdminTicketPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [ticketLevel, setTicketLevel] = useState('')
  const [ticketCount, setTicketCount] = useState('1')
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

    const level = parseInt(ticketLevel, 10)
    if (isNaN(level) || level < 1 || level > 25) {
      setError('강화권 레벨은 1~25 사이여야 합니다.')
      return
    }

    const count = parseInt(ticketCount, 10)
    if (isNaN(count) || count < 1) {
      setError('개수는 1개 이상이어야 합니다.')
      return
    }

    setIsSending(true)
    setError(null)
    setSuccess(null)

    const result = await onSendTicket(
      selectedUser.userId,
      level,
      count,
      message.trim() || undefined
    )

    if (result) {
      setSuccess(`${selectedUser.username}님에게 ${level}성 강화권 x${count}을 전송했습니다.`)
      // 폼 초기화
      setSelectedUser(null)
      setTicketLevel('')
      setTicketCount('1')
      setMessage('')
      setSearchQuery('')
    } else {
      setError('강화권 전송에 실패했습니다. 관리자 권한을 확인해주세요.')
    }

    setIsSending(false)
  }

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
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-cyan-500/10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎫</span>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              강화권 지급 (관리자)
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

          {/* 강화권 레벨 선택 */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              강화권 레벨 (1~25성)
            </label>
            <input
              type="number"
              value={ticketLevel}
              onChange={(e) => {
                setTicketLevel(e.target.value)
                setError(null)
              }}
              min={1}
              max={25}
              placeholder="예: 17 (17성 강화권)"
              className="w-full bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
            />

            {/* 빠른 레벨 선택 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {COMMON_TICKET_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setTicketLevel(level.toString())}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    ticketLevel === level.toString()
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] text-cyan-400 border-[var(--color-border)]'
                  }`}
                >
                  {level}성
                </button>
              ))}
            </div>
          </div>

          {/* 개수 입력 */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              개수
            </label>
            <input
              type="number"
              value={ticketCount}
              onChange={(e) => {
                setTicketCount(e.target.value)
                setError(null)
              }}
              min={1}
              placeholder="지급할 개수"
              className="w-full bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
            />

            {/* 빠른 개수 선택 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[1, 2, 3, 5, 10].map(count => (
                <button
                  key={count}
                  onClick={() => setTicketCount(count.toString())}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    ticketCount === count.toString()
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] text-cyan-400 border-[var(--color-border)]'
                  }`}
                >
                  x{count}
                </button>
              ))}
            </div>
          </div>

          {/* 메시지 입력 */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              메시지 (선택사항)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="예: 이벤트 보상, 버그 보상 등&#10;(여러 줄 입력 가능)"
              className="w-full bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)] resize-none"
            />
          </div>

          {/* 미리보기 */}
          {ticketLevel && ticketCount && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm text-cyan-400 flex items-center gap-2">
                <img
                  src={`/images/tickets/${ticketLevel}.png`}
                  alt=""
                  className="w-6 h-6 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span className="font-bold">{ticketLevel}성 강화권</span>
                <span>x{ticketCount}</span>
                {selectedUser && (
                  <span className="text-[var(--color-text-muted)]">
                    → {selectedUser.username}
                  </span>
                )}
              </p>
            </div>
          )}

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
            disabled={isSending || !selectedUser || !ticketLevel || !ticketCount}
            className="flex-1 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                전송 중...
              </>
            ) : (
              <>
                <span>🎫</span>
                강화권 지급
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
