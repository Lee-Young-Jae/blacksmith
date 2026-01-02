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
      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-5xl mb-4 opacity-50">💰</div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">장비 판매</h2>
          <p className="text-[var(--color-text-secondary)] text-sm">좌측에서 판매할 장비를 선택하세요</p>
        </div>
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
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <h2 className="text-base font-bold text-[var(--color-text-primary)] text-center">장비 판매</h2>
      </div>

      <div className="card-body space-y-4">
        {/* Equipment Info */}
        <div className="info-box flex items-center gap-4">
          <div className="relative">
            <EquipmentImage equipment={equipment} size="xl" />
            {equipment.starLevel > 0 && (
              <div className="star-badge">
                {equipment.starLevel}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-[var(--color-text-primary)] font-bold">{displayName}</h3>
            <p className="text-[var(--color-text-secondary)] text-sm">{slotName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[var(--color-accent)] text-sm">★ {equipment.starLevel}</span>
              <span className="text-[var(--color-text-muted)]">|</span>
              <span className="text-[var(--color-primary)] text-sm">전투력 {combatPower.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Price Calculation */}
        <div className="info-box space-y-2">
          <h4 className="text-[var(--color-text-secondary)] text-xs mb-2">판매 가격 계산</h4>

          <div className="stat-row">
            <span className="stat-label">기본 가격</span>
            <span className="stat-value">100 G</span>
          </div>

          {equipment.starLevel > 0 && (
            <div className="stat-row">
              <span className="stat-label">강화 보너스 (+{equipment.starLevel}성)</span>
              <span className="stat-value positive">x{levelBonus.toFixed(0)}</span>
            </div>
          )}

          {unlockedSlots > 0 && (
            <div className="stat-row">
              <span className="stat-label">잠재능력 슬롯 ({unlockedSlots}개)</span>
              <span className="stat-value magic">x{potentialBonus.toFixed(1)}</span>
            </div>
          )}

          <div className="border-t border-[var(--color-border)] pt-2 mt-2">
            <div className="stat-row">
              <span className="text-[var(--color-text-primary)] font-bold">최종 가격</span>
              <span className={`font-bold text-lg ${canSell ? 'stat-value gold' : 'text-[var(--color-text-muted)]'}`}>
                {canSell ? `${sellPrice.toLocaleString()} G` : '0 G'}
              </span>
            </div>
          </div>
        </div>

        {/* Warning or Error Messages */}
        {equipment.isEquipped && (
          <div className="info-box">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span>⚠️</span>
              <p className="text-[var(--color-text-secondary)]">장착 중인 장비는 판매할 수 없습니다</p>
            </div>
          </div>
        )}

        {!equipment.isEquipped && equipment.starLevel === 0 && (
          <div className="info-box">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span>⚠️</span>
              <p className="text-[var(--color-text-secondary)]">0성 장비는 판매할 수 없습니다</p>
            </div>
          </div>
        )}

        {canSell && (
          <div className="info-box danger">
            <p className="text-[var(--color-danger)] text-sm text-center">
              ⚠️ 판매한 장비는 되돌릴 수 없습니다
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="btn btn-ghost flex-1 py-2.5"
          >
            {canSell ? '취소' : '돌아가기'}
          </button>
          {canSell && (
            <button
              onClick={handleSell}
              className="btn btn-accent flex-1 py-2.5"
            >
              💰 판매하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
