import type { ReactNode } from 'react';
import { Header } from '@/features/home/components/Header';
import { GroupsLeftSidebar } from '../GroupsLeftSidebar';
import { GroupsRightSidebar } from '../GroupsRightSidebar';
import type { Group } from '../../types/groups.types';

const LEFT_SIDEBAR_WIDTH = 'w-[300px]';
const RIGHT_SIDEBAR_WIDTH = 'w-[320px]';

interface GroupsHubLayoutProps {
  children: ReactNode;
  joinedGroups: Group[];
  managedGroups?: Group[];
  activeSectionId: 'feed' | 'discover' | 'your-groups' | 'search';
  initialSearchQuery?: string;
}

export function GroupsHubLayout({
  children,
  joinedGroups,
  managedGroups = [],
  activeSectionId,
  initialSearchQuery,
}: GroupsHubLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      <Header />

      <div className="mx-auto max-w-[1920px] overflow-x-auto">
        <div className="flex min-w-[940px] pt-14">
          <div className={`sticky top-14 z-10 h-[calc(100vh-56px)] ${LEFT_SIDEBAR_WIDTH} shrink-0`}>
            <GroupsLeftSidebar
              joinedGroups={joinedGroups}
              managedGroups={managedGroups}
              activeSectionId={activeSectionId}
              initialSearchQuery={initialSearchQuery}
              showGroupLists={false}
            />
          </div>

          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[680px] p-4">{children}</div>
          </main>

          <div className={`sticky top-14 z-10 h-[calc(100vh-56px)] ${RIGHT_SIDEBAR_WIDTH} shrink-0`}>
            <GroupsRightSidebar joinedGroups={joinedGroups} managedGroups={managedGroups} />
          </div>
        </div>
      </div>
    </div>
  );
}
