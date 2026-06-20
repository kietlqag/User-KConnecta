import { GROUP_DETAIL_TABS, type GroupDetailTabId } from '../../constants/groupDetailTabs';

interface GroupTabBarProps {
  activeTab: GroupDetailTabId;
  onTabChange: (tabId: GroupDetailTabId) => void;
  memberCount?: number;
  pendingCount?: number;
  isAdmin?: boolean;
}

export function GroupTabBar({ activeTab, onTabChange, memberCount, pendingCount, isAdmin }: GroupTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Mục nhóm"
      className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory -mx-1 px-1"
    >
      {GROUP_DETAIL_TABS.filter(tab => tab.id !== 'requests' || isAdmin).map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        let label = tab.label as string;
        if (tab.id === 'members' && memberCount != null) {
          label = `${tab.label} · ${memberCount}`;
        } else if (tab.id === 'requests' && pendingCount != null && pendingCount > 0) {
          label = `${tab.label} · ${pendingCount}`;
        }

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
                : 'text-gray-500 dark:text-gray-400 hover:bg-muted rounded-lg my-0.5'
              }
            `}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'}`} aria-hidden />
            <span className="inline sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
