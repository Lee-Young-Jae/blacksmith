import { useState, useEffect } from 'react'
import { FiX, FiCheck, FiLock } from 'react-icons/fi'
import { GiTrophy, GiCrossedSwords, GiAnvilImpact, GiTreasureMap } from 'react-icons/gi'
import type {
  AchievementWithProgress,
  AchievementCategory,
} from '../../types/achievement'
import {
  ACHIEVEMENT_TIER_NAMES,
  ACHIEVEMENT_TIER_COLORS,
  ACHIEVEMENT_CATEGORY_NAMES,
} from '../../types/achievement'
import { ProfileBorder } from './ProfileBorder'

interface AchievementModalProps {
  achievements: AchievementWithProgress[]
  equippedBorderId: string | null
  onEquip: (borderId: string | null) => Promise<boolean>
  onClose: () => void
  avatarUrl?: string | null
  username?: string
}

const CATEGORIES: AchievementCategory[] = ['battle', 'enhancement', 'collection']

const CATEGORY_ICONS: Record<AchievementCategory, React.ReactNode> = {
  battle: <GiCrossedSwords className="w-4 h-4" />,
  enhancement: <GiAnvilImpact className="w-4 h-4" />,
  collection: <GiTreasureMap className="w-4 h-4" />,
}

// 등급별 배경 스타일 (forge theme)
const TIER_BG_STYLES: Record<string, string> = {
  common: 'bg-stone-800/60 border-stone-600/50',
  rare: 'bg-blue-900/30 border-blue-500/40',
  epic: 'bg-purple-900/30 border-purple-500/40',
  unique: 'bg-amber-900/30 border-amber-500/40',
  legendary: 'bg-red-900/30 border-red-500/40',
}

// 등급별 아이콘 배경
const TIER_ICON_BG: Record<string, string> = {
  common: 'bg-stone-700',
  rare: 'bg-blue-900/50',
  epic: 'bg-purple-900/50',
  unique: 'bg-amber-900/50',
  legendary: 'bg-red-900/50',
}

export function AchievementModal({
  achievements,
  equippedBorderId,
  onEquip,
  onClose,
  avatarUrl,
  username,
}: AchievementModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory>('battle')
  const [isEquipping, setIsEquipping] = useState(false)
  const [previewBorderId, setPreviewBorderId] = useState<string | null>(null)

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const filteredAchievements = achievements.filter(
    a => a.unlockCondition.category === selectedCategory
  )

  const stats = {
    total: achievements.length,
    unlocked: achievements.filter(a => a.isUnlocked).length,
  }

  const handleEquip = async (borderId: string | null) => {
    setIsEquipping(true)
    try {
      await onEquip(borderId)
    } finally {
      setIsEquipping(false)
    }
  }

  const previewBorder = previewBorderId
    ? achievements.find(a => a.id === previewBorderId)
    : equippedBorderId
      ? achievements.find(a => a.id === equippedBorderId)
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-amber-700/30 bg-gradient-to-b from-stone-800 to-stone-900 shadow-2xl shadow-orange-900/20">
        {/* 헤더 - 고정 */}
        <div className="relative flex-shrink-0 border-b border-amber-700/30">
          {/* 배경 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-900/30 via-orange-900/20 to-transparent" />
          {/* 하단 글로우 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-[30px] bg-orange-500/20 blur-[25px] rounded-full" />

          <div className="relative flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 shadow-lg shadow-orange-900/30">
                <GiTrophy className="w-6 h-6 text-amber-100" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-amber-100">업적</h2>
                <p className="text-sm text-amber-200/60">
                  {stats.unlocked}/{stats.total} 달성
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-amber-200 hover:bg-stone-700/50 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 테두리 미리보기 - 고정 */}
        <div className="flex-shrink-0 p-4 bg-stone-900/50 border-b border-stone-700/50">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <ProfileBorder borderClass={previewBorder?.borderClass} size="lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-stone-600 flex items-center justify-center text-amber-100 text-xl font-bold">
                    {username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </ProfileBorder>
              <span className="text-xs text-stone-500">미리보기</span>
            </div>
            <div className="flex-1 min-w-0">
              {previewBorder ? (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${ACHIEVEMENT_TIER_COLORS[previewBorder.tier]}`}>
                      [{ACHIEVEMENT_TIER_NAMES[previewBorder.tier]}]
                    </span>
                    <span className="text-amber-100 font-bold">{previewBorder.name}</span>
                  </div>
                  <p className="text-sm text-stone-400 mt-1 line-clamp-2">{previewBorder.description}</p>
                </div>
              ) : (
                <p className="text-stone-500">테두리를 선택하세요</p>
              )}
            </div>
            {equippedBorderId && (
              <button
                onClick={() => handleEquip(null)}
                disabled={isEquipping}
                className="flex-shrink-0 px-3 py-1.5 text-sm text-stone-400 hover:text-amber-200 bg-stone-800 hover:bg-stone-700 border border-stone-600/50 rounded-lg transition-colors disabled:opacity-50"
              >
                해제
              </button>
            )}
          </div>
        </div>

        {/* 카테고리 탭 - 고정, 모바일 대응 */}
        <div className="flex-shrink-0 p-2 bg-gradient-to-b from-stone-800 to-stone-900 border-b border-stone-700/50">
          <div className="flex gap-1 p-1 rounded-xl bg-stone-900/80 border border-stone-700/50">
            {CATEGORIES.map(category => {
              const categoryAchievements = achievements.filter(
                a => a.unlockCondition.category === category
              )
              const unlockedCount = categoryAchievements.filter(a => a.isUnlocked).length
              const isActive = selectedCategory === category

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-orange-900/30 border border-amber-500/50'
                      : 'text-stone-400 hover:text-amber-200 hover:bg-stone-700/50'
                  }`}
                >
                  {CATEGORY_ICONS[category]}
                  <span className="hidden xs:inline sm:inline">{ACHIEVEMENT_CATEGORY_NAMES[category]}</span>
                  <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-stone-700'
                  }`}>
                    {unlockedCount}/{categoryAchievements.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 업적 목록 - 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2">
          {filteredAchievements.map(achievement => {
            const progress = Math.min(achievement.progress, achievement.unlockCondition.target)
            const progressPercent = (progress / achievement.unlockCondition.target) * 100
            const isEquipped = equippedBorderId === achievement.id

            return (
              <div
                key={achievement.id}
                className={`p-3 rounded-xl border transition-all ${
                  achievement.isUnlocked
                    ? `${TIER_BG_STYLES[achievement.tier]} hover:border-amber-500/50`
                    : 'bg-stone-900/50 border-stone-700/50 opacity-60'
                }`}
                onMouseEnter={() => achievement.isUnlocked && setPreviewBorderId(achievement.id)}
                onMouseLeave={() => setPreviewBorderId(null)}
              >
                <div className="flex items-center gap-3">
                  {/* 잠금/해금 아이콘 */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    achievement.isUnlocked
                      ? TIER_ICON_BG[achievement.tier]
                      : 'bg-stone-800'
                  }`}>
                    {achievement.isUnlocked ? (
                      <FiCheck className={`w-5 h-5 ${ACHIEVEMENT_TIER_COLORS[achievement.tier]}`} />
                    ) : (
                      <FiLock className="w-5 h-5 text-stone-500" />
                    )}
                  </div>

                  {/* 업적 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        achievement.isUnlocked
                          ? `${TIER_ICON_BG[achievement.tier]} ${ACHIEVEMENT_TIER_COLORS[achievement.tier]}`
                          : 'bg-stone-800 text-stone-500'
                      }`}>
                        {ACHIEVEMENT_TIER_NAMES[achievement.tier]}
                      </span>
                      <span className="text-amber-100 font-medium truncate">{achievement.name}</span>
                      {isEquipped && (
                        <span className="px-1.5 py-0.5 text-xs bg-amber-600/30 text-amber-300 rounded border border-amber-500/30">
                          장착중
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-400 truncate mt-0.5">{achievement.description}</p>

                    {/* 진행률 바 */}
                    {!achievement.isUnlocked && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                          <span>진행도</span>
                          <span>{progress.toLocaleString()}/{achievement.unlockCondition.target.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-600 to-orange-500 transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 장착 버튼 */}
                  {achievement.isUnlocked && (
                    <button
                      onClick={() => handleEquip(isEquipped ? null : achievement.id)}
                      disabled={isEquipping}
                      className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-lg font-medium transition-all disabled:opacity-50 ${
                        isEquipped
                          ? 'bg-stone-700 text-stone-300 hover:bg-stone-600 border border-stone-600/50'
                          : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-orange-900/20'
                      }`}
                    >
                      {isEquipped ? '해제' : '장착'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filteredAchievements.length === 0 && (
            <div className="text-center py-8 text-stone-500">
              이 카테고리에 업적이 없습니다
            </div>
          )}
        </div>

        {/* 하단 진행률 - 고정 */}
        <div className="flex-shrink-0 p-4 border-t border-stone-700/50 bg-stone-900/50">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-stone-400">전체 달성률</span>
            <span className="text-amber-400 font-bold">
              {stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-orange-500 transition-all"
              style={{ width: `${stats.total > 0 ? (stats.unlocked / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
