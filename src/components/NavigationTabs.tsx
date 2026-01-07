import {
  GiChestArmor,
  GiPerspectiveDiceSixFacesRandom,
  GiSparkles,
  GiUpgrade,
  GiCrossedSwords,
  GiTwoCoins,
} from 'react-icons/gi'
import { FaRobot } from 'react-icons/fa'
import type { IconType } from 'react-icons'

// 'tower'는 'battle' 탭 내부의 서브 탭으로 통합됨
export type TabType = 'equipment' | 'gacha' | 'potential' | 'enhance' | 'battle' | 'pvp' | 'sell'

interface NavigationTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  hasWeapon: boolean
  hasEquipment?: boolean
}

const TABS: { id: TabType; label: string; Icon: IconType; requiresWeapon?: boolean; requiresEquipment?: boolean }[] = [
  { id: 'equipment', label: '장비', Icon: GiChestArmor },
  { id: 'gacha', label: '뽑기', Icon: GiPerspectiveDiceSixFacesRandom },
  { id: 'potential', label: '잠재', Icon: GiSparkles, requiresEquipment: true },
  { id: 'enhance', label: '강화', Icon: GiUpgrade, requiresEquipment: true },
  { id: 'battle', label: '대결', Icon: FaRobot, requiresEquipment: true },
  { id: 'pvp', label: 'PvP', Icon: GiCrossedSwords, requiresEquipment: true },
  { id: 'sell', label: '판매', Icon: GiTwoCoins, requiresEquipment: true },
]

export function NavigationTabs({ activeTab, onTabChange, hasWeapon, hasEquipment }: NavigationTabsProps) {
  return (
    <nav className="tab-nav justify-center overflow-x-auto scrollbar-hide">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        const isDisabled =
          (tab.requiresWeapon && !hasWeapon) ||
          (tab.requiresEquipment && !hasEquipment)

        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className={`tab-item flex items-center gap-1 px-2.5 py-2 md:px-4 md:py-2.5 md:gap-1.5 shrink-0 ${isActive ? 'active' : ''}`}
          >
            <tab.Icon className="text-lg md:text-xl" />
            <span className="hidden md:inline text-sm">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
