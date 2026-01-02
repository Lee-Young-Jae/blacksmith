export type TabType = 'equipment' | 'gacha' | 'potential' | 'enhance' | 'battle' | 'sell'

interface NavigationTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  hasWeapon: boolean
  hasEquipment?: boolean
}

const TABS: { id: TabType; label: string; emoji: string; requiresWeapon?: boolean; requiresEquipment?: boolean }[] = [
  { id: 'equipment', label: '장비', emoji: '🛡️' },
  { id: 'gacha', label: '뽑기', emoji: '🎰' },
  { id: 'potential', label: '잠재', emoji: '✨', requiresEquipment: true },
  { id: 'enhance', label: '강화', emoji: '⭐', requiresEquipment: true },
  { id: 'battle', label: '대결', emoji: '⚔️', requiresWeapon: true },
  { id: 'sell', label: '판매', emoji: '💰', requiresEquipment: true },
]

export function NavigationTabs({ activeTab, onTabChange, hasWeapon, hasEquipment }: NavigationTabsProps) {
  return (
    <nav className="tab-nav justify-center overflow-x-auto">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        const isDisabled =
          (tab.requiresWeapon && !hasWeapon) ||
          (tab.requiresEquipment && !hasEquipment)

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className={`tab-item flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 ${isActive ? 'active' : ''}`}
          >
            <span className="text-base sm:text-lg">{tab.emoji}</span>
            <span className="hidden sm:inline text-sm">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
