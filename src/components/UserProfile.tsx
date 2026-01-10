import { useState } from 'react'
import { FiUsers, FiAward } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { NicknameEditModal } from './NicknameEditModal'
import { ProfileBorder } from './achievements/ProfileBorder'
import { AchievementModal } from './achievements/AchievementModal'
import { useAchievements } from '../hooks/useAchievements'

interface UserProfileProps {
  username?: string
  battlesRemaining: number
  maxBattles: number
  onUpdateUsername?: (newUsername: string) => Promise<boolean>
  onOpenReferral?: () => void
}

export function UserProfile({ username, battlesRemaining, maxBattles, onUpdateUsername, onOpenReferral }: UserProfileProps) {
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [showAchievementModal, setShowAchievementModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const {
    achievements,
    equippedBorderId,
    equipBorder,
    getEquippedBorder,
  } = useAchievements()

  const equippedBorder = getEquippedBorder()

  if (!user) return null

  // 프로필의 username 우선, 없으면 auth 메타데이터 사용
  const displayName = username || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '용사'
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 transition-colors"
        >
          <ProfileBorder borderClass={equippedBorder?.borderClass} size="sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white font-bold">
                {displayName[0].toUpperCase()}
              </div>
            )}
          </ProfileBorder>
          <span className="text-white text-sm hidden sm:block">{displayName}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 드롭다운 메뉴 */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-xl shadow-xl border border-gray-700 z-50 overflow-hidden">
              {/* 유저 정보 */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <ProfileBorder borderClass={equippedBorder?.borderClass} size="md">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white text-xl font-bold">
                        {displayName[0].toUpperCase()}
                      </div>
                    )}
                  </ProfileBorder>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold truncate">{displayName}</p>
                      {onUpdateUsername && (
                        <button
                          onClick={() => {
                            setShowMenu(false)
                            setShowNicknameModal(true)
                          }}
                          className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          title="닉네임 변경"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* 대결 횟수 */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">오늘 대결 횟수</span>
                  <span className={`font-bold ${battlesRemaining > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {battlesRemaining}/{maxBattles}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all"
                    style={{ width: `${(battlesRemaining / maxBattles) * 100}%` }}
                  />
                </div>
              </div>

              {/* 닉네임 변경 버튼 */}
              {onUpdateUsername && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setShowNicknameModal(true)
                  }}
                  className="w-full p-4 text-left text-blue-400 hover:bg-blue-900/20 transition-colors flex items-center gap-2 border-b border-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  닉네임 변경
                </button>
              )}

              {/* 업적 버튼 */}
              <button
                onClick={() => {
                  setShowMenu(false)
                  setShowAchievementModal(true)
                }}
                className="w-full p-4 text-left text-amber-400 hover:bg-amber-900/20 transition-colors flex items-center gap-2 border-b border-gray-700"
              >
                <FiAward className="w-5 h-5" />
                업적
              </button>

              {/* 친구 초대 버튼 */}
              {onOpenReferral && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onOpenReferral()
                  }}
                  className="w-full p-4 text-left text-purple-400 hover:bg-purple-900/20 transition-colors flex items-center gap-2 border-b border-gray-700"
                >
                  <FiUsers className="w-5 h-5" />
                  친구 초대
                </button>
              )}

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full p-4 text-left text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <div className="w-5 h-5 border-2 border-red-400/50 border-t-red-400 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>

      {/* 닉네임 변경 모달 */}
      {showNicknameModal && onUpdateUsername && (
        <NicknameEditModal
          currentNickname={displayName}
          onSave={onUpdateUsername}
          onClose={() => setShowNicknameModal(false)}
        />
      )}

      {/* 업적 모달 */}
      {showAchievementModal && (
        <AchievementModal
          achievements={achievements}
          equippedBorderId={equippedBorderId}
          onEquip={equipBorder}
          onClose={() => setShowAchievementModal(false)}
          avatarUrl={avatarUrl}
          username={displayName}
        />
      )}
    </>
  )
}
