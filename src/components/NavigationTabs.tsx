export type TabType = 'enhance' | 'battle' | 'sell'

interface NavigationTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  hasWeapon: boolean
}

const TABS: { id: TabType; label: string; emoji: string }[] = [
  { id: 'enhance', label: '강화', emoji: '⭐' },
  { id: 'battle', label: '대결', emoji: '⚔️' },
  { id: 'sell', label: '판매', emoji: '💰' },
]

export function NavigationTabs({ activeTab, onTabChange, hasWeapon }: NavigationTabsProps) {
  return (
    <div className="flex justify-center gap-2 p-2 bg-gray-800 rounded-xl">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        const isDisabled = !hasWeapon && tab.id !== 'enhance'

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                : isDisabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span className="mr-2">{tab.emoji}</span>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
