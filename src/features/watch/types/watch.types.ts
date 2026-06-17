import type { ReactionType } from '@/services/postService';

export interface Reel {
  id: string;
  videoUrl: string;
  thumbnail: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
    verified?: boolean;
  };
  caption: string;
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'SPECIFIC_FRIENDS' | 'PRIVATE';
  group?: {
    id: string;
    name: string;
    icon?: string;
  };
  music?: {
    name: string;
    artist: string;
  };
  likes: number;
  comments: number;
  shares: number;
  views: number;
  duration: number;
  isLiked?: boolean;
  currentUserReactionType?: ReactionType | null;
  isSaved?: boolean;
}

export interface ReelComment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
}
