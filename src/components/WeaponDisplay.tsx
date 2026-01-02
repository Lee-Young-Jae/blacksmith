import { StarDisplay } from './StarDisplay'
import { WeaponImage } from './WeaponImage'
import type { UserWeapon } from '../types/weapon'
import { getWeaponName, getLevelTier, LEVEL_COLORS, LEVEL_BG_COLORS, LEVEL_TIER_NAMES, CATEGORY_NAMES } from '../types/weapon'

interface WeaponDisplayProps {
  weapon: UserWeapon
  isEnhancing?: boolean
  showStars?: boolean
}

export function WeaponDisplay({ weapon, isEnhancing = false, showStars = true }: WeaponDisplayProps) {
  const { weaponType, starLevel, isDestroyed, totalAttack } = weapon
  const levelTier = getLevelTier(starLevel)
  const levelColor = LEVEL_COLORS[levelTier]
  const levelBg = LEVEL_BG_COLORS[levelTier]
  const weaponName = getWeaponName(weaponType, starLevel)
  const categoryName = CATEGORY_NAMES[weaponType.category]

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 별 레벨 표시 */}
      {showStars && !isDestroyed && (
        <StarDisplay level={starLevel} maxDisplay={25} />
      )}

      {/* 무기 이미지 영역 */}
      <div
        className={`relative transition-all duration-300 ${
          isEnhancing ? 'animate-pulse scale-110' : ''
        } ${isDestroyed ? 'grayscale opacity-50' : ''}`}
      >
        {/* 배경 글로우 */}
        {!isDestroyed && (
          <div
            className={`absolute inset-0 rounded-full blur-3xl opacity-40 bg-gradient-to-b ${levelBg}`}
            style={{ transform: 'scale(1.5)' }}
          />
        )}

        {/* 무기 이미지/이모지 */}
        <div className="relative w-44 h-44 flex items-center justify-center transition-all duration-500">
          <WeaponImage
            weapon={weaponType}
            level={starLevel}
            size="xl"
            showGlow={!isDestroyed}
            className={isDestroyed ? 'opacity-30 grayscale' : ''}
          />

          {/* 파괴 표시 */}
          {isDestroyed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-7xl">💥</span>
            </div>
          )}
        </div>

        {/* 강화 레벨 뱃지 */}
        {!isDestroyed && starLevel > 0 && (
          <div
            className={`absolute -top-1 -right-1 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl border-2 border-white/20 ${
              starLevel >= 20
                ? 'bg-gradient-to-br from-red-400 to-red-600 animate-pulse'
                : starLevel >= 15
                  ? 'bg-gradient-to-br from-purple-400 to-purple-600'
                  : starLevel >= 10
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                    : starLevel >= 5
                      ? 'bg-gradient-to-br from-green-400 to-green-600'
                      : 'bg-gradient-to-br from-yellow-400 to-yellow-600'
            }`}
          >
            +{starLevel}
          </div>
        )}
      </div>

      {/* 무기 정보 */}
      <div className="text-center">
        {/* 카테고리 태그 */}
        {!isDestroyed && (
          <div className="inline-block px-3 py-1 bg-gray-700/50 rounded-full mb-2">
            <span className="text-gray-400 text-xs">{categoryName}</span>
          </div>
        )}

        <h2
          className={`text-2xl font-bold ${
            isDestroyed ? 'text-gray-500 line-through' : levelColor
          }`}
        >
          {isDestroyed ? '파괴됨' : weaponName}
        </h2>

        {!isDestroyed && (
          <>
            {/* 공격력 */}
            <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
              <span className="text-gray-400 text-sm">공격력</span>
              <span className="text-white font-bold text-lg">{totalAttack}</span>
              {starLevel > 0 && (
                <span className="text-green-400 text-sm font-medium">
                  (+{totalAttack - weaponType.baseAttack})
                </span>
              )}
            </div>

            {/* 등급 */}
            <p className={`text-sm mt-2 ${levelColor}`}>
              {LEVEL_TIER_NAMES[levelTier]} 등급
            </p>
          </>
        )}
      </div>
    </div>
  )
}
