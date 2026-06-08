import { useEffect, useRef, useState } from 'react';
import { Search, Rss, Compass, Users, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Group, GroupsSidebarSection } from '../../types/groups.types';
import { GroupSearchDropdown } from '../GroupSearchDropdown/GroupSearchDropdown';
import {
  useGroupSearchSuggestions,
  useMergedLocalGroups,
} from '../../hooks/useGroupSearch';
import { searchHistoryService } from '@/services/searchHistoryService';

const sidebarSections: GroupsSidebarSection[] = [
  { id: 'feed', label: 'Bảng feed của bạn', icon: <Rss className="w-5 h-5" /> },
  { id: 'discover', label: 'Khám phá', icon: <Compass className="w-5 h-5" /> },
  { id: 'your-groups', label: 'Nhóm của bạn', icon: <Users className="w-5 h-5" /> },
];

interface GroupsLeftSidebarProps {
  joinedGroups: Group[];
  managedGroups?: Group[];
  activeSectionId?: string;
  initialSearchQuery?: string;
}

export const GroupsLeftSidebar = ({
  joinedGroups,
  managedGroups = [],
  activeSectionId = 'feed',
  initialSearchQuery = '',
}: GroupsLeftSidebarProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = searchQuery.trim();
  const localMatches = useMergedLocalGroups(joinedGroups, managedGroups, trimmedQuery);
  const { groups: suggestedGroups, loading: suggestionsLoading } = useGroupSearchSuggestions(
    trimmedQuery,
    showSearchPanel && trimmedQuery.length > 0,
  );

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSearchPanel(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const goToSearchResults = (q: string) => {
    const text = q.trim();
    if (!text) return;
    searchHistoryService.add({ type: 'keyword', text });
    navigate(`/groups/search?q=${encodeURIComponent(text)}`);
    setShowSearchPanel(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      goToSearchResults(searchQuery);
    }
    if (e.key === 'Escape') {
      setShowSearchPanel(false);
    }
  };

  return (
    <div className="w-[360px] bg-white border-r border-gray-200 min-h-[calc(100vh-56px)] sticky top-14 overflow-y-auto sidebar-scrollbar">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Nhóm</h1>

        <div className="relative mb-4" ref={searchWrapRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchPanel(true);
            }}
            onFocus={() => setShowSearchPanel(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Tìm kiếm nhóm"
            className="w-full pl-10 pr-9 py-2 bg-gray-100 rounded-full outline-none focus:bg-gray-200 focus:ring-2 focus:ring-blue-500/30 transition-colors text-[15px]"
            aria-label="Tìm kiếm nhóm"
            aria-expanded={showSearchPanel}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSearchPanel(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 text-gray-500"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showSearchPanel && trimmedQuery.length > 0 && (
            <GroupSearchDropdown
              query={trimmedQuery}
              loading={suggestionsLoading}
              localGroups={localMatches}
              suggestedGroups={suggestedGroups}
              onSelectLocal={group => {
                navigate(`/groups/${group.id}`);
                setShowSearchPanel(false);
              }}
              onSelectSuggested={group => {
                navigate(`/groups/${group.id}`);
                setShowSearchPanel(false);
              }}
              onViewAll={() => goToSearchResults(trimmedQuery)}
            />
          )}
        </div>

        <div className="space-y-1 mb-4">
          {sidebarSections.map(section => {
            const isActive = activeSectionId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  if (section.id === 'your-groups') navigate('/groups/joined');
                  else if (section.id === 'feed') navigate('/groups');
                  else if (section.id === 'discover') navigate('/groups/discover');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className={isActive ? 'text-blue-600' : 'text-gray-600'}>{section.icon}</div>
                <span className="font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => navigate('/groups/create')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors mb-4"
        >
          <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center">
            <Plus className="w-5 h-5 text-gray-700" />
          </div>
          <span className="font-semibold text-gray-900">Tạo nhóm mới</span>
        </button>

        <div className="border-t border-gray-200 my-4" />

        {managedGroups.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-600 text-[15px] mb-2 px-1">Nhóm do bạn quản lý</h3>
            <div className="space-y-1 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 p-1">
              {managedGroups.map(group => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  {group.icon ? (
                    <img src={group.icon} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                      {group.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-semibold text-gray-900 text-[15px] truncate group-hover:text-blue-600 transition-colors pt-0.5">
                      {group.name}
                    </h4>
                    {group.lastActivity && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{group.lastActivity}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-200 my-4" />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-600 text-sm">Nhóm bạn đã tham gia</h3>
            <button
              type="button"
              onClick={() => navigate('/groups/joined')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Xem tất cả
            </button>
          </div>

          <div className="space-y-1">
            {joinedGroups.length === 0 ? (
              <p className="text-sm text-gray-400 px-1 py-2">Chưa tham gia nhóm nào.</p>
            ) : (
              joinedGroups.slice(0, 8).map(group => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  {group.icon ? (
                    <img src={group.icon} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm shrink-0">
                      {group.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {group.name}
                    </h4>
                    {group.lastActivity && (
                      <p className="text-xs text-gray-500 truncate">{group.lastActivity}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
