import type { UserWeapon } from '../types/weapon'
import { getWeaponName, getWeaponComment, CATEGORY_NAMES } from '../types/weapon'
import { WeaponDisplay } from './WeaponDisplay'

interface WeaponAcquireProps {
  onAcquire: () => Promise<UserWeapon>
  acquiredWeapon: UserWeapon | null
  isAcquiring: boolean
  onConfirm: () => void
}

export function WeaponAcquire({
  onAcquire,
  acquiredWeapon,
  isAcquiring,
  onConfirm,
}: WeaponAcquireProps) {
  const handleAcquire = async () => {
    await onAcquire()
  }

  // 획득 완료 화면
  if (acquiredWeapon) {
    const weaponName = getWeaponName(acquiredWeapon.weaponType, 0)
    const comment = getWeaponComment(acquiredWeapon.weaponType, 0)
    const categoryName = CATEGORY_NAMES[acquiredWeapon.weaponType.category]

    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <h2 className="text-2xl font-bold text-white">무기 획득!</h2>

        <div className="relative">
          {/* 획득 이펙트 */}
          <div className="absolute inset-0 animate-ping opacity-30">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-gray-400 to-gray-600" />
          </div>

          <WeaponDisplay weapon={acquiredWeapon} showStars={false} />
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-gray-300">
            [{categoryName}] {weaponName}
          </p>
          <p className="text-gray-400 mt-1">
            기본 공격력: {acquiredWeapon.weaponType.baseAttack}
          </p>
          {comment && (
            <p className="text-sm mt-2 text-amber-300 italic">
              "{comment}"
            </p>
          )}
        </div>

        <button
          onClick={onConfirm}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-transform"
        >
          강화 시작하기
        </button>
      </div>
    )
  }

  // 획득 중 화면
  if (isAcquiring) {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <h2 className="text-2xl font-bold text-white">무기 획득 중...</h2>

        <div className="w-32 h-32 relative">
          <div className="absolute inset-0 rounded-full border-4 border-gray-600 border-t-yellow-400 animate-spin" />
          <div className="absolute inset-4 rounded-full border-4 border-gray-600 border-b-purple-400 animate-spin" style={{ animationDirection: 'reverse' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl animate-bounce">🎁</span>
          </div>
        </div>

        <p className="text-gray-400">어떤 무기가 나올까요?</p>
      </div>
    )
  }

  // 획득 전 화면
  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h2 className="text-2xl font-bold text-white">대장장이</h2>
      <p className="text-gray-400 text-center">
        랜덤 무기를 획득하고<br />
        최강의 무기로 강화하세요!
      </p>

      <div className="text-center my-4">
        <p className="text-sm text-gray-500 mb-2">10종류의 무기</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">검</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">도끼</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">활</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">채찍</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">몽둥이</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">창</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">단검</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">지팡이</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">해머</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">낫</span>
        </div>
      </div>

      <button
        onClick={handleAcquire}
        className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg"
      >
        🎲 무기 획득하기
      </button>
    </div>
  )
}
