import { useState, useEffect, useMemo } from 'react'
import type { UserEquipment, EquipmentSlot } from '../../types/equipment'
import { getEquipmentName, EQUIPMENT_SLOT_NAMES, EQUIPMENT_SLOTS, EQUIPMENT_SLOT_EMOJIS } from '../../types/equipment'
import type { SendEquipmentRequest, UserSearchResult } from '../../types/gift'
import EquipmentImage from '../equipment/EquipmentImage'

interface SendEquipmentModalProps {
  inventory: UserEquipment[]
  onSearch: (query: string) => Promise<UserSearchResult[]>
  onSend: (request: SendEquipmentRequest) => Promise<boolean>
  onClose: () => void
}

export function SendEquipmentModal({
  inventory,
  onSearch,
  onSend,
  onClose,
}: SendEquipmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<UserEquipment | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 장비 필터링 상태
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [slotFilter, setSlotFilter] = useState<EquipmentSlot | 'all'>('all')

  // 미장착 장비만 필터링 + 검색/슬롯 필터 적용
  const giftableEquipment = useMemo(() => {
    return inventory
      .filter(eq => !eq.isEquipped)
      .filter(eq => slotFilter === 'all' || eq.equipmentBase.slot === slotFilter)
      .filter(eq => {
        if (!equipmentSearch.trim()) return true
        const name = getEquipmentName(eq.equipmentBase, eq.starLevel).toLowerCase()
        return name.includes(equipmentSearch.toLowerCase())
      })
  }, [inventory, slotFilter, equipmentSearch])

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
    if (!selectedEquipment) {
      setError('선물할 장비를 선택해주세요.')
      return
    }

    setIsSending(true)
    setError(null)

    const success = await onSend({
      receiverId: selectedUser.userId,
      equipmentId: selectedEquipment.id,
      message: message.trim() || undefined,
    })

    if (success) {
      onClose()
    } else {
      setError('장비 선물에 실패했습니다.')
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
      <div className="relative bg-[var(--color-bg-elevated-1)] rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            장비 선물하기
          </h2>
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

          {/* 장비 선택 */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              선물할 장비 ({giftableEquipment.length}개 가능)
            </label>

            {/* 검색 및 필터 */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                placeholder="장비 이름 검색"
                className="flex-1 bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
              />
              <select
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value as EquipmentSlot | 'all')}
                className="bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="all">전체</option>
                {EQUIPMENT_SLOTS.map(slot => (
                  <option key={slot} value={slot}>
                    {EQUIPMENT_SLOT_EMOJIS[slot]} {EQUIPMENT_SLOT_NAMES[slot]}
                  </option>
                ))}
              </select>
            </div>

            {inventory.filter(eq => !eq.isEquipped).length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                선물 가능한 장비가 없습니다.<br />
                <span className="text-xs">(미장착 장비만 선물 가능)</span>
              </p>
            ) : giftableEquipment.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                검색 결과가 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {giftableEquipment.map(eq => {
                  const isSelected = selectedEquipment?.id === eq.id
                  const name = getEquipmentName(eq.equipmentBase, eq.starLevel)
                  const slotName = EQUIPMENT_SLOT_NAMES[eq.equipmentBase.slot]

                  return (
                    <button
                      key={eq.id}
                      onClick={() => {
                        setSelectedEquipment(isSelected ? null : eq)
                        setError(null)
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                          : 'border-transparent bg-[var(--color-bg-elevated-2)] hover:border-[var(--color-border)]'
                      }`}
                    >
                      <EquipmentImage equipment={eq} size="lg" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {name}
                          {eq.starLevel > 0 && (
                            <span className="text-yellow-400 ml-1">+{eq.starLevel}</span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">{slotName}</p>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
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
              placeholder="선물과 함께 보낼 메시지"
              className="w-full bg-[var(--color-bg-elevated-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          {/* 경고 */}
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              선물한 장비는 되돌릴 수 없습니다. 신중하게 선택해주세요.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </div>

        {/* 버튼 */}
        <div className="p-4 border-t border-[var(--color-border)] flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-[var(--color-bg-elevated-2)] hover:bg-[var(--color-bg-elevated-3)] text-[var(--color-text-primary)] font-bold transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !selectedUser || !selectedEquipment}
            className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                전송 중...
              </>
            ) : (
              '선물하기'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
