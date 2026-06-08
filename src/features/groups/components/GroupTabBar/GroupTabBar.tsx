import { GROUP_DETAIL_TABS, type GroupDetailTabId } from '../../constants/groupDetailTabs';

interface GroupTabBarProps {
  activeTab: GroupDetailTabId;
  onTabChange: (tabId: GroupDetailTabId) => void;
  memberCount?: number;
}

export function GroupTabBar({ activeTab, onTabChange, memberCount }: GroupTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Mục nhóm"
      className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory -mx-1 px-1"
    >
      {GROUP_DETAIL_TABS.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const label =
          tab.id === 'members' && memberCount != null
            ? `${tab.label} · ${memberCount}`
            : tab.label;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`group-tabpanel-${tab.id}`}
            id={`group-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`
              snap-start shrink-0 min-h-[44px] px-3 sm:px-4 py-2.5 font-semibold text-[15px] whitespace-nowrap transition-colors
              inline-flex items-center gap-1.5
              ${isActive
                ? 'text-blue-600 border-b-[3px] border-blue-600 rounded-t'
                : 'text-gray-500 hover:bg-gray-100 rounded-lg my-0.5'
              }
            `}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} aria-hidden />
            <span className="inline sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
