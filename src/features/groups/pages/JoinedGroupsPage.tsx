import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { GroupsLeftSidebar } from '../components';
import { MoreHorizontal } from 'lucide-react';
import { useJoinedGroups, useManagedGroups } from '../hooks/useGroups';

export const JoinedGroupsPage = () => {
  const navigate = useNavigate();
  const { data: joinedGroups = [], isLoading: loadingJoined } = useJoinedGroups();
  const { data: managedGroups = [] } = useManagedGroups();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background flex flex-col">
      <Header />

      <div className="flex flex-1 pt-14 h-full">
        {/* Left Sidebar */}
        <div className="sticky top-14 h-[calc(100vh-56px)] shrink-0 z-10 w-[360px]">
          <GroupsLeftSidebar
            joinedGroups={joinedGroups}
            managedGroups={managedGroups}
            activeSectionId="your-groups"
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full p-8 px-12">
          <div className="max-w-[1000px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">
                {loadingJoined
                  ? 'Đang tải...'
                  : `Tất cả các nhóm bạn đã tham gia (${joinedGroups.length})`}
              </h2>
              <button className="text-[15px] font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer">
                Sắp xếp
              </button>
            </div>

            {loadingJoined ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-[200px] animate-pulse" />
                ))}
              </div>
            ) : joinedGroups.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-[15px]">Bạn chưa tham gia nhóm nào.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {joinedGroups.map(group => (
                  <div
                    key={group.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[200px] hover:shadow-md transition-shadow"
                  >
                    {/* Top Section */}
                    <div className="p-4 flex-1 flex gap-3 border-b border-gray-100 dark:border-gray-800">
                      {group.icon ? (
                        <img
                          src={group.icon}
                          alt={group.name}
                          className="w-[84px] h-[84px] rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-800"
                        />
                      ) : (
                        <div className="w-[84px] h-[84px] rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center text-gray-400 text-2xl font-bold">
                          {group.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <h3 
                          onClick={() => navigate(`/groups/${group.id}`)}
                          className="font-semibold text-gray-900 dark:text-gray-100 text-[15px] leading-tight line-clamp-2 cursor-pointer hover:underline"
                        >
                          {group.name}
                        </h3>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 leading-snug">
                          {group.lastActivity}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="p-3 flex items-center gap-2 bg-white dark:bg-gray-800">
                      <button
                        onClick={() => navigate(`/groups/${group.id}`)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold py-1.5 rounded-md transition-colors text-[15px] cursor-pointer"
                      >
                        Xem nhóm
                      </button>
                      <button className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded-md transition-colors shrink-0 cursor-pointer">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
