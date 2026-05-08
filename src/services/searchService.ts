import { api } from './api';

// ── Suggestion (autocomplete) ─────────────────────────────────────────────────

export interface SearchSuggestionDto {
  id: string;
  type: 'person' | 'group';
  text: string;
  avatarUrl: string | null;
}

// ── Full search results ───────────────────────────────────────────────────────

export interface SearchPersonDto {
  id: string;
  type: 'person';
  name: string;
  avatar: string;
  bio: string;
  mutualFriends?: number;
  isFollowing: boolean;
}

export interface SearchGroupDto {
  id: string;
  type: 'group';
  name: string;
  coverImage: string;
  privacy: 'public' | 'private';
  memberCount: number;
  isMember: boolean;
}

export interface SearchPostAuthorDto {
  name: string;
  avatar: string;
  type: 'person' | 'page' | 'group';
}

export interface SearchPostDto {
  id: string;
  type: 'post';
  author: SearchPostAuthorDto;
  timestamp: string;
  content: string;
  image?: string;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface SearchApiResponse {
  people: SearchPersonDto[];
  groups: SearchGroupDto[];
  posts: SearchPostDto[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export const searchService = {
  getSuggestions: (q: string) =>
    api.get<SearchSuggestionDto[]>(`/search/suggest?q=${encodeURIComponent(q)}`),

  search: (q: string) =>
    api.get<SearchApiResponse>(`/search?q=${encodeURIComponent(q)}`),
};
