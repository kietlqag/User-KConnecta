import type { ReactNode } from 'react';
import { Header } from '@/features/home/components/Header';
import { GroupsLeftSidebar } from '../GroupsLeftSidebar';
import { GroupsRightSidebar } from '../GroupsRightSidebar';
import type { Group } from '../../types/groups.types';

const RIGHT_SIDEBAR_WIDTH = 'w-[320px]';

interface GroupsHubLayoutProps {
  children: ReactNode;
  joinedGroups: Group[];
  managedGroups?: Group[];
  activeSectionId: 'feed' | 'discover' | 'your-groups' | 'search';
  initialSearchQuery?: string;
  /** Tailwind max-width class for the main content column. */
  contentMaxWidthClass?: string;
}

export function GroupsHubLayout({
  children,
  joinedGroups,
  managedGroups = [],
  activeSectionId,
  initialSearchQuery,
  contentMaxWidthClass = 'max-w-[680px]',
}: GroupsHubLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      <Header />

      <div className="mx-auto max-w-[1920px]">
        <div className="flex min-w-[940px] items-start pt-14">
          <GroupsLeftSidebar
            joinedGroups={joinedGroups}
            managedGroups={managedGroups}
            activeSectionId={activeSectionId}
            initialSearchQuery={initialSearchQuery}
            showGroupLists={false}
          />

          <main className="min-w-0 flex-1">
            <div className={`mx-auto w-full p-4 ${contentMaxWidthClass}`}>{children}</div>
          </main>

          <div className={`sticky top-14 z-10 h-[calc(100vh-56px)] shrink-0 self-start ${RIGHT_SIDEBAR_WIDTH}`}>
            <GroupsRightSidebar joinedGroups={joinedGroups} managedGroups={managedGroups} />
          </div>
        </div>
      </div>
    </div>
  );
}
