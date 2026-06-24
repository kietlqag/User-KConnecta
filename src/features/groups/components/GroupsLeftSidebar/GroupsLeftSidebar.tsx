import { useEffect, useRef, useState } from 'react';
import { Search, Rss, Compass, Users, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Group, GroupsSidebarSection } from '../../types/groups.types';
import { GroupSearchDropdown } from '../GroupSearchDropdown/GroupSearchDropdown';
import { GroupsListsPanel } from '../GroupsListsPanel';
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
  /** Omit or pass `null` to highlight no nav item (e.g. group detail page). */
  activeSectionId?: string | null;
  initialSearchQuery?: string;
  showGroupLists?: boolean;
}

export const GroupsLeftSidebar = ({
  joinedGroups,
  managedGroups = [],
  activeSectionId = 'feed',
  initialSearchQuery = '',
  showGroupLists = true,
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
    <div className="sidebar-scrollbar sticky top-14 z-10 hidden h-[calc(100vh-56px)] w-[300px] shrink-0 self-start overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Nhóm</h1>

        <div className="relative mb-4" ref={searchWrapRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchPanel(true);
            }}
            onFocus={() => setShowSearchPanel(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Tìm kiếm nhóm"
            className="w-full pl-10 pr-9 py-2 bg-gray-100 dark:bg-gray-900 text-foreground placeholder:text-muted-foreground rounded-full outline-none focus:bg-gray-200 dark:focus:bg-gray-700 focus:ring-2 focus:ring-emerald-500/30 transition-colors text-[15px]"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
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
            const isActive = activeSectionId != null && activeSectionId === section.id;
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
                  isActive ? 'bg-emerald-50 text-emerald-600' : 'text-gray-900 dark:text-gray-100 hover:bg-muted'
                }`}
              >
                <div className={isActive ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-400'}>{section.icon}</div>
                <span className="font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => navigate('/groups/create')}
          className="mb-4 flex w-full items-center gap-3 rounded-lg bg-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
            <Plus className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Tạo nhóm mới</span>
        </button>

        {showGroupLists && (
          <>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
            <GroupsListsPanel joinedGroups={joinedGroups} managedGroups={managedGroups} />
          </>
        )}
      </div>
    </div>
  );
};
