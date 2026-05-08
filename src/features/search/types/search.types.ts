export type SearchFilterType = 'all' | 'posts' | 'people' | 'reels' | 'marketplace' | 'pages' | 'groups' | 'events';
export type SortType = 'relevance' | 'latest';

export interface RecentSearchItem {
  id: string;
  type: 'person' | 'group' | 'page' | 'keyword';
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
}

export interface SearchResultPost {
  id: string;
  type: 'post';
  author: {
    name: string;
    avatar: string;
    type: 'person' | 'page' | 'group';
  };
  timestamp: string;
  content: string;
  image?: string;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface SearchResultReel {
  id: string;
  type: 'reel';
  author: {
    name: string;
    avatar: string;
  };
  thumbnail: string;
  duration: string;
  views: number;
  title?: string;
}

export interface SearchResultPage {
  id: string;
  type: 'page';
  name: string;
  avatar: string;
  category: string;
  followers: number;
  isFollowing: boolean;
  isVerified?: boolean;
}

export type SearchResult =
  | SearchResultPerson
  | SearchResultGroup
  | SearchResultPost
  | SearchResultReel
  | SearchResultPage;
