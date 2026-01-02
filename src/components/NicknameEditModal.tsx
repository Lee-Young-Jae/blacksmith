import { useState, useEffect } from 'react'
import { generateNicknameOptions } from '../utils/nicknameGenerator'

interface NicknameEditModalProps {
  currentNickname: string
  onSave: (newNickname: string) => Promise<boolean>
  onClose: () => void
}

export function NicknameEditModal({ currentNickname, onSave, onClose }: NicknameEditModalProps) {
  const [nickname, setNickname] = useState(currentNickname)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 추천 닉네임 생성
  useEffect(() => {
    refreshSuggestions()
  }, [])

  const refreshSuggestions = () => {
    setSuggestions(generateNicknameOptions(6))
  }

  const handleSave = async () => {
    const trimmed = nickname.trim()

    if (trimmed.length < 2) {
      setError('닉네임은 2자 이상이어야 합니다.')
      return
    }

    if (trimmed.length > 20) {
      setError('닉네임은 20자 이하여야 합니다.')
      return
    }

    if (trimmed === currentNickname) {
      onClose()
      return
    }

    setIsSaving(true)
    setError(null)

    const success = await onSave(trimmed)

    if (success) {
      onClose()
    } else {
      setError('닉네임 변경에 실패했습니다.')
      setIsSaving(false)
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setNickname(suggestion)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">닉네임 변경</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-4">
          {/* 입력 필드 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">새 닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                setError(null)
              }}
              maxLength={20}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="닉네임을 입력하세요"
            />
            <div className="flex justify-between mt-1">
              {error ? (
                <span className="text-red-400 text-xs">{error}</span>
              ) : (
                <span className="text-gray-500 text-xs">2-20자</span>
              )}
              <span className="text-gray-500 text-xs">{nickname.length}/20</span>
            </div>
          </div>

          {/* 추천 닉네임 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-400 text-sm">추천 닉네임</label>
              <button
                onClick={refreshSuggestions}
                className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    nickname === suggestion
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || nickname.trim().length < 2}
            className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
