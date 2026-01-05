import { useState } from 'react'
import { CONDOLENCE_IMAGES, type SendCondolenceRequest } from '../../types/gift'

interface SendCondolenceModalProps {
  targetUserId: string
  targetUsername: string
  enhancementHistoryId?: string
  onSend: (request: SendCondolenceRequest) => Promise<boolean>
  onClose: () => void
}

export function SendCondolenceModal({
  targetUserId,
  targetUsername,
  enhancementHistoryId,
  onSend,
  onClose,
}: SendCondolenceModalProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!selectedImageId) {
      setError('묵념 이미지를 선택해주세요.')
      return
    }

    setIsSending(true)
    setError(null)

    const success = await onSend({
      receiverId: targetUserId,
      condolenceImageId: selectedImageId,
      message: message.trim() || undefined,
      enhancementHistoryId,
    })

    if (success) {
      onClose()
    } else {
      setError('묵념 전송에 실패했습니다.')
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-[var(--color-bg-elevated-1)] rounded-2xl w-full max-w-md shadow-2xl border border-[var(--color-border)] overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              묵념 보내기
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {targetUsername}님에게
            </p>
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
        <div className="p-4 space-y-4">
          {/* 이미지 선택 그리드 */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              묵념 이미지 선택
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CONDOLENCE_IMAGES.map(img => (
                <button
                  key={img.id}
                  onClick={() => {
                    setSelectedImageId(img.id)
                    setError(null)
                  }}
                  className={`aspect-square rounded-xl border-2 transition-all overflow-hidden ${
                    selectedImageId === img.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-transparent bg-[var(--color-bg-elevated-2)] hover:border-[var(--color-border)]'
                  }`}
                  title={img.name}
                >
                  <div className="w-full h-full flex items-center justify-center p-1">
                    <img
                      src={img.src}
                      alt={img.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.parentElement!.innerHTML = '<span class="text-2xl">🙏</span>'
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
            {selectedImageId && (
              <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
                {CONDOLENCE_IMAGES.find(img => img.id === selectedImageId)?.name}
              </p>
            )}
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
              placeholder="위로의 메시지를 남겨주세요"
              className="w-full bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-[var(--color-text-muted)]">{message.length}/100</span>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </div>

        {/* 버튼 */}
        <div className="p-4 border-t border-[var(--color-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] text-[var(--color-text-primary)] font-bold transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !selectedImageId}
            className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                전송 중...
              </>
            ) : (
              <>🙏 보내기</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
