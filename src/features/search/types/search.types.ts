export type SearchFilterType = 'all' | 'posts' | 'people' | 'reels' | 'groups';
export type SortType = 'relevance' | 'latest';

export interface RecentSearchItem {
  id: string;
  type: 'person' | 'group' | 'keyword';
  text: string;
  avatar?: string;
  badge?: string;
}

export interface SearchResultPerson {
  id: string;
  type: 'person';
  name: string;
  avatar: string;
  bio: string;
  mutualFriends?: number;
  isFollowing: boolean;
}

export interface SearchResultGroup {
  id: string;
  type: 'group';
  name: string;
  coverImage: string;
  privacy: 'public' | 'private';
  memberCount: number;
  isMember: boolean;
  isPending?: boolean;
}

export interface SearchResultPost {
  id: string;
  type: 'post';
  author: {
    id?: string;
    name: string;
    avatar: string;
    type: 'person' | 'page' | 'group';
    groupName?: string;
    groupIconUrl?: string;
  };
  timestamp: string;
  content: string;
  image?: string;
  video?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  userReactionType?: string | null;
  savedByCurrentUser?: boolean;
  groupId?: string;
  mediaItems?: { type: string; url: string }[];
}

export interface SearchResultReel {
  id: string;
  type: 'reel';
  author: {
    name: string;
    avatar: string;
  };
  thumbnail: string;
  videoUrl?: string;
  duration: string;
  views: number;
  title?: string;
  userReactionType?: string | null;
  timestamp?: string;
}

export type SearchResult =
  | SearchResultPerson
  | SearchResultGroup
  | SearchResultPost
  | SearchResultReel;
