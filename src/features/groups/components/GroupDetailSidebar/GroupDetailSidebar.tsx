import type { Group, GroupMember } from '../../types/groups.types';
import type { GroupSetupProgress } from '../../hooks/useGroupSetupProgress';
import type { SetupStepId } from '../../hooks/useGroupSetupProgress';
import { GroupSetupChecklist } from './GroupSetupChecklist';
import { GroupQuickActions } from './GroupQuickActions';
import { GroupAboutCard } from './GroupAboutCard';
import { GroupMembersPreview } from './GroupMembersPreview';

interface GroupDetailSidebarProps {
  group: Group;
  members: GroupMember[];
  isAdmin: boolean;
  setupProgress: GroupSetupProgress;
  showSetupChecklist: boolean;
  onDismissSetup: () => void;
  onStepAction: (stepId: SetupStepId) => void;
  onInvite: () => void;
  onCreatePost: () => void;
  onCover: () => void;
  onEditDescription: () => void;
  onViewMembers: () => void;
}

export function GroupDetailSidebar({
  group,
  members,
  isAdmin,
  setupProgress,
  showSetupChecklist,
  onDismissSetup,
  onStepAction,
  onInvite,
  onCreatePost,
  onCover,
  onEditDescription,
  onViewMembers,
}: GroupDetailSidebarProps) {
  return (
    <div className="w-full md:w-[360px] shrink-0 flex flex-col gap-4">
      {isAdmin && showSetupChecklist && (
        <GroupSetupChecklist
          progress={setupProgress}
          onDismiss={onDismissSetup}
          onStepAction={onStepAction}
        />
      )}

      {isAdmin && !setupProgress.isComplete && (
        <GroupQuickActions onInvite={onInvite} onCreatePost={onCreatePost} onCover={onCover} />
      )}

      <GroupAboutCard group={group} isAdmin={isAdmin} onEditDescription={onEditDescription} />

      {group.role && <GroupMembersPreview members={members} onViewAll={onViewMembers} />}
    </div>
  );
}
