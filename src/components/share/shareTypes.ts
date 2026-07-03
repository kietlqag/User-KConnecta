import type { PostResponse, PostShareResponse } from '@/services/postService';

export type ShareTarget =
  | {
      type: 'post';
      postId: string;
      parentShareId?: string;
      alreadyShared?: boolean;
      content?: string;
      image?: string;
      authorName?: string;
      isLivePost?: boolean;
      /** Dùng `/watch?id=` thay vì `/posts/` khi chia sẻ reel */
      linkStyle?: 'post' | 'watch';
      onShareComplete?: (response: PostShareResponse) => void;
    }
  | {
      type: 'album';
      albumId: string;
      title: string;
      coverUrl?: string | null;
      mediaCount?: number;
      ownerName?: string;
      onShareComplete?: (response: PostResponse) => void;
    }
  | {
      type: 'group';
      groupId: string;
      name: string;
      coverUrl?: string | null;
      privacy?: 'PUBLIC' | 'PRIVATE';
      memberCount?: number;
      onShareComplete?: (response: PostResponse) => void;
    };
