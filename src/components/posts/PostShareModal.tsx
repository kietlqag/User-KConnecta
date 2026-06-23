import { ShareModal } from '@/components/share/ShareModal';
import type { PostShareResponse } from '@/services/postService';

interface PostShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  parentShareId?: string;
  postContent?: string;
  postImage?: string;
  postAuthorName?: string;
  isLivePost?: boolean;
  /** Dùng link `/watch?id=` thay vì `/posts/` (reels) */
  linkStyle?: 'post' | 'watch';
  onShareComplete?: (response: PostShareResponse) => void;
}

export function PostShareModal({
  isOpen,
  onClose,
  postId,
  parentShareId,
  postContent,
  postImage,
  postAuthorName,
  isLivePost = false,
  linkStyle = 'post',
  onShareComplete,
}: PostShareModalProps) {
  return (
    <ShareModal
      isOpen={isOpen}
      onClose={onClose}
      target={{
        type: 'post',
        postId,
        parentShareId,
        content: postContent,
        image: postImage,
        authorName: postAuthorName,
        isLivePost,
        linkStyle,
        onShareComplete,
      }}
    />
  );
}
