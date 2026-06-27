import { Users, UserPlus, Cake, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type FriendsTab = 'home' | 'requests' | 'all-friends' | 'birthdays';

interface SidebarItem {
  id: FriendsTab;
  labelKey: 'home' | 'requests' | 'allFriends' | 'birthdays';
  icon: React.ReactNode;
  count?: number;
}

interface FriendsLeftSidebarProps {
  activeTab: FriendsTab;
  onTabChange: (tab: FriendsTab) => void;
  requestCount?: number;
}

export const FriendsLeftSidebar = ({ activeTab, onTabChange, requestCount }: FriendsLeftSidebarProps) => {
  const { t } = useTranslation();

  const sidebarItems: SidebarItem[] = [
    { id: 'home', labelKey: 'home', icon: <Home className="w-5 h-5" /> },
    { id: 'requests', labelKey: 'requests', icon: <UserPlus className="w-5 h-5" />, count: requestCount },
    { id: 'all-friends', labelKey: 'allFriends', icon: <Users className="w-5 h-5" /> },
    { id: 'birthdays', labelKey: 'birthdays', icon: <Cake className="w-5 h-5" /> },
  ];

  return (
    <div className="hidden h-full w-[clamp(280px,23vw,360px)] shrink-0 overflow-hidden border-r border-border bg-card md:block">
      <div className="p-4">
        <h1 className="mb-4 text-2xl font-bold text-foreground">{t('friendsPage.title')}</h1>

        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer group ${ activeTab === item.id ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-muted' }`}
            >
              <div className="flex items-center gap-3">
                <div className={activeTab === item.id ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-emerald-600 transition-colors'}>
                  {item.icon}
                </div>
                <span className={`font-medium ${activeTab === item.id ? 'text-emerald-600' : 'text-foreground'}`}>
                  {t(`friendsPage.${item.labelKey}`)}
                </span>
              </div>
              {item.count != null && item.count > 0 && (
                <span className="bg-emerald-500 text-white text-sm font-semibold px-2.5 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
