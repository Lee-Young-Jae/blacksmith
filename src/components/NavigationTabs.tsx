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
  { id: 'enhance', label: '강화', emoji: '⭐', requiresWeapon: true },
  { id: 'battle', label: '대결', emoji: '⚔️', requiresWeapon: true },
  { id: 'sell', label: '판매', emoji: '💰', requiresWeapon: true },
]

export function NavigationTabs({ activeTab, onTabChange, hasWeapon, hasEquipment }: NavigationTabsProps) {
  return (
    <div className="flex justify-center gap-2 p-2 bg-gray-800 rounded-xl overflow-x-auto">
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
            className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-bold transition-all whitespace-nowrap ${
              isActive
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                : isDisabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span className="mr-1 sm:mr-2">{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
