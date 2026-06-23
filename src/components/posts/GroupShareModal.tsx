import { ShareModal } from '@/components/share/ShareModal';
import type { PostResponse } from '@/services/postService';

interface GroupShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  groupCoverUrl?: string | null;
  groupPrivacy?: 'PUBLIC' | 'PRIVATE';
  groupMemberCount?: number;
  onShareComplete?: (response: PostResponse) => void;
}

export function GroupShareModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  groupCoverUrl,
  groupPrivacy = 'PUBLIC',
  groupMemberCount = 0,
  onShareComplete,
}: GroupShareModalProps) {
  return (
    <ShareModal
      isOpen={isOpen}
      onClose={onClose}
      target={{
        type: 'group',
        groupId,
        name: groupName,
        coverUrl: groupCoverUrl,
        privacy: groupPrivacy,
        memberCount: groupMemberCount,
        onShareComplete,
      }}
    />
  );
}
