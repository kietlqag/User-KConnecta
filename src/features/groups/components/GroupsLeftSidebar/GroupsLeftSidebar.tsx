import { Search, Rss, Compass, Users, Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Group, GroupsSidebarSection } from '../../types/groups.types';

const sidebarSections: GroupsSidebarSection[] = [
  { id: 'feed', label: 'Bảng feed của bạn', icon: <Rss className="w-5 h-5" />, active: true },
  { id: 'discover', label: 'Khám phá', icon: <Compass className="w-5 h-5" /> },
  { id: 'your-groups', label: 'Nhóm của bạn', icon: <Users className="w-5 h-5" /> },
];

interface GroupsLeftSidebarProps {
  joinedGroups: Group[];
  managedGroups?: Group[];
  activeSectionId?: string;
}

export const GroupsLeftSidebar = ({ joinedGroups, managedGroups, activeSectionId = 'feed' }: GroupsLeftSidebarProps) => {
  const navigate = useNavigate();
  return (
    <div className="w-[360px] bg-white border-r border-gray-200 min-h-[calc(100vh-56px)] sticky top-14 overflow-y-auto sidebar-scrollbar">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Nhóm</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nhóm"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full outline-none focus:bg-gray-200 transition-colors"
          />
        </div>

        {/* Navigation Sections */}
        <div className="space-y-1 mb-4">
          {sidebarSections.map((section) => {
            const isActive = activeSectionId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => {
                  if (section.id === 'your-groups') {
                    navigate('/groups/joined');
                  } else if (section.id === 'feed') {
                    navigate('/groups');
                  } else if (section.id === 'discover') {
                    navigate('/groups/discover');
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className={isActive ? 'text-blue-600' : 'text-gray-600'}>
                  {section.icon}
                </div>
                <span className="font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* Create Group Button */}
        <button onClick={() => navigate('/groups/create')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors mb-4">
          <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center">
            <Plus className="w-5 h-5 text-gray-700" />
          </div>
          <span className="font-semibold text-gray-900">Tạo nhóm mới</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4" />

        {/* Managed Groups */}
        {managedGroups && managedGroups.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-600 text-[15px] mb-2 px-1">Nhóm do bạn quản lý</h3>
            <div className="space-y-1 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 p-1">
              {managedGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <img
                    src={group.icon}
                    alt={group.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-semibold text-gray-900 text-[15px] truncate group-hover:text-blue-600 transition-colors pt-0.5">
                      {group.name}
                    </h4>
                    {group.lastActivity && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {group.lastActivity}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-200 my-4" />
          </div>
        )}

        {/* Joined Groups */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-600 text-sm">Nhóm bạn đã tham gia</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Xem tất cả
            </button>
          </div>

          <div className="space-y-1">
            {joinedGroups.map((group) => (
              <button
                key={group.id}
                className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <img
                  src={group.icon}
                  alt={group.name}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {group.name}
                  </h4>
                  {group.lastActivity && (
                    <p className="text-xs text-gray-500 truncate">
                      {group.lastActivity}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
