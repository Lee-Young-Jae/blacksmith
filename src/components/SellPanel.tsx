import type { UserWeapon } from '../types/weapon'
import { getWeaponName, getLevelTier, LEVEL_COLORS, LEVEL_TIER_NAMES } from '../types/weapon'
import { WeaponImage } from './WeaponImage'

interface SellPanelProps {
  weapon: UserWeapon
  sellPrice: number
  onSell: () => void
  onCancel: () => void
}

export function SellPanel({ weapon, sellPrice, onSell, onCancel }: SellPanelProps) {
  const { weaponType, starLevel, totalAttack } = weapon
  const levelTier = getLevelTier(starLevel)
  const levelColor = LEVEL_COLORS[levelTier]
  const weaponName = getWeaponName(weaponType, starLevel)

  // 레벨 보너스 계산 (1 + level * 5 + level²)
  const levelBonus = 1 + starLevel * 5 + Math.pow(starLevel, 2)

  // 0성은 판매 불가
  const canSell = starLevel > 0

  return (
    <div className="bg-gray-800/90 backdrop-blur rounded-2xl p-6 w-full max-w-sm border border-gray-700/50 shadow-xl">
      <h3 className="text-xl font-bold text-white text-center mb-6">무기 판매</h3>

      {/* 무기 정보 */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <WeaponImage
            weapon={weaponType}
            level={starLevel}
            size="lg"
            showGlow={true}
          />
        </div>
        <h4 className={`text-xl font-bold mt-3 ${levelColor}`}>
          {weaponName}
        </h4>
        <p className={`text-sm ${levelColor}`}>
          [{LEVEL_TIER_NAMES[levelTier]}]
        </p>
        <p className="text-gray-400 mt-2">
          공격력: <span className="text-white font-bold">{totalAttack}</span>
        </p>
      </div>

      {/* 판매 가격 계산 */}
      <div className="bg-gray-700/30 rounded-xl p-4 mb-6 border border-gray-600/30">
        <h4 className="text-gray-400 text-sm mb-3">판매 가격 계산</h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">기본 가격</span>
            <span className="text-white">🪙 {weaponType.sellPriceBase.toLocaleString()}</span>
          </div>
          {starLevel > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">강화 보너스 (+{starLevel})</span>
              <span className="text-green-400">x{levelBonus.toFixed(0)}</span>
            </div>
          )}
          <div className="border-t border-gray-600/50 pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">최종 가격</span>
              <span className={canSell ? 'text-yellow-400' : 'text-gray-500'}>
                🪙 {canSell ? sellPrice.toLocaleString() : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 경고 메시지 */}
      {canSell ? (
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-3 mb-6">
          <p className="text-red-400 text-sm text-center">
            ⚠️ 판매한 무기는 되돌릴 수 없습니다
          </p>
        </div>
      ) : (
        <div className="bg-gray-700/30 border border-gray-600/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl">🚫</span>
            <p className="text-gray-300 font-bold">판매 불가</p>
          </div>
          <p className="text-gray-400 text-sm text-center">
            0성 무기는 판매할 수 없습니다.<br />
            최소 1성 이상 강화 후 판매해주세요.
          </p>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl transition-colors"
        >
          {canSell ? '취소' : '돌아가기'}
        </button>
        {canSell && (
          <button
            onClick={onSell}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all hover:scale-105"
          >
            판매하기
          </button>
        )}
      </div>
    </div>
  )
}
