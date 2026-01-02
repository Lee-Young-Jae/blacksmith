import type { UserEquipment } from '../../types/equipment'
import { getEquipmentDisplayName, getEquipmentSellPrice, EQUIPMENT_SLOT_NAMES } from '../../types/equipment'
import { calculateEquipmentStats } from '../../types/equipment'
import { calculateCombatPower } from '../../types/stats'
import EquipmentImage from './EquipmentImage'

interface EquipmentSellPanelProps {
  equipment: UserEquipment | null
  onSell: (equipment: UserEquipment) => Promise<void>
  onCancel: () => void
}

export default function EquipmentSellPanel({
  equipment,
  onSell,
  onCancel,
}: EquipmentSellPanelProps) {
  if (!equipment) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">💰</div>
        <h2 className="text-xl font-bold text-white mb-2">장비 판매</h2>
        <p className="text-gray-400">인벤토리에서 판매할 장비를 선택하세요</p>
      </div>
    )
  }

  const sellPrice = getEquipmentSellPrice(equipment)
  const displayName = getEquipmentDisplayName(equipment)
  const stats = calculateEquipmentStats(equipment)
  const combatPower = calculateCombatPower(stats)
  const slotName = EQUIPMENT_SLOT_NAMES[equipment.equipmentBase.slot]

  // 0성은 판매 불가
  const canSell = equipment.starLevel > 0 && !equipment.isEquipped

  // 스타 레벨 보너스 계산
  const levelBonus = 1 + equipment.starLevel * 5 + Math.pow(equipment.starLevel, 2)

  // 해제된 잠재옵션 슬롯 개수
  const unlockedSlots = equipment.potentials.filter(p => p.isUnlocked).length
  const potentialBonus = 1 + unlockedSlots * 0.5

  const handleSell = async () => {
    if (canSell) {
      await onSell(equipment)
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-700/50 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white text-center">장비 판매</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Equipment Info */}
        <div className="flex items-center gap-4 bg-gray-700/30 rounded-lg p-4">
          <div className="relative">
            <EquipmentImage equipment={equipment} size="xl" />
            {equipment.starLevel > 0 && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {equipment.starLevel}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold">{displayName}</h3>
            <p className="text-gray-400 text-sm">{slotName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-yellow-400 text-sm">★ {equipment.starLevel}</span>
              <span className="text-gray-500">|</span>
              <span className="text-blue-400 text-sm">전투력 {combatPower.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Price Calculation */}
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-2">
          <h4 className="text-gray-400 text-sm mb-3">판매 가격 계산</h4>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">기본 가격</span>
            <span className="text-white">100 G</span>
          </div>

          {equipment.starLevel > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">강화 보너스 (+{equipment.starLevel}성)</span>
              <span className="text-green-400">x{levelBonus.toFixed(0)}</span>
            </div>
          )}

          {unlockedSlots > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">잠재능력 슬롯 ({unlockedSlots}개)</span>
              <span className="text-purple-400">x{potentialBonus.toFixed(1)}</span>
            </div>
          )}

          <div className="border-t border-gray-600/50 pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">최종 가격</span>
              <span className={canSell ? 'text-yellow-400' : 'text-gray-500'}>
                {canSell ? `${sellPrice.toLocaleString()} G` : '0 G'}
              </span>
            </div>
          </div>
        </div>

        {/* Warning or Error Messages */}
        {equipment.isEquipped && (
          <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span>⚠️</span>
              <p className="text-gray-300">장착 중인 장비는 판매할 수 없습니다</p>
            </div>
          </div>
        )}

        {!equipment.isEquipped && equipment.starLevel === 0 && (
          <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span>⚠️</span>
              <p className="text-gray-300">0성 장비는 판매할 수 없습니다</p>
            </div>
          </div>
        )}

        {canSell && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm text-center">
              ⚠️ 판매한 장비는 되돌릴 수 없습니다
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
          >
            {canSell ? '취소' : '돌아가기'}
          </button>
          {canSell && (
            <button
              onClick={handleSell}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-lg transition-all"
            >
              판매하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
