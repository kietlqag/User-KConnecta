import type { AuthUser } from '@/services/authService';
import type { FriendshipStatusResponse } from '@/services/friendService';
import type { FeedPost } from '@/utils/postUtils';

const CACHE_TTL_MS = 5 * 60 * 1000;

export interface ProfileLayoutSnapshot {
  routeKey: string;
  profile: AuthUser;
  resolvedId: string;
  friendsCount: number;
  friendshipStatus: FriendshipStatusResponse | null;
  accessDenied: boolean;
  blocked: boolean;
  cachedAt: number;
}

export interface ProfilePageFriendPreview {
  id: string;
  username?: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ProfilePageSnapshot {
  posts: FeedPost[];
  friends: ProfilePageFriendPreview[];
  profilePhotos: { id: string; url: string }[];
  postsPage: number;
  hasMorePosts: boolean;
  scrollY: number;
  cachedAt: number;
}

const layoutByRouteKey = new Map<string, ProfileLayoutSnapshot>();
const layoutByResolvedId = new Map<string, ProfileLayoutSnapshot>();
const pageByResolvedId = new Map<string, ProfilePageSnapshot>();

function isFresh(cachedAt: number) {
  return Date.now() - cachedAt < CACHE_TTL_MS;
}

function profileRouteKeys(routeKey: string, profile: AuthUser, resolvedId: string) {
  const keys = new Set<string>([routeKey, resolvedId]);
  if (profile.username) keys.add(profile.username);
  if (profile.id) keys.add(profile.id);
  return keys;
}

export function getProfileLayoutCache(routeKey: string): ProfileLayoutSnapshot | null {
  const cached = layoutByRouteKey.get(routeKey) ?? layoutByResolvedId.get(routeKey);
  if (!cached || !isFresh(cached.cachedAt)) return null;
  return cached;
}

export function hasProfileLayoutCache(routeKey: string) {
  return getProfileLayoutCache(routeKey) != null;
}

export function setProfileLayoutCache(
  routeKey: string,
  snapshot: Omit<ProfileLayoutSnapshot, 'cachedAt' | 'routeKey'>,
) {
  const entry: ProfileLayoutSnapshot = {
    ...snapshot,
    routeKey,
    cachedAt: Date.now(),
  };
  for (const key of profileRouteKeys(routeKey, snapshot.profile, snapshot.resolvedId)) {
    layoutByRouteKey.set(key, entry);
    layoutByResolvedId.set(snapshot.resolvedId, entry);
  }
}

export function getProfilePageCache(resolvedId: string): ProfilePageSnapshot | null {
  const cached = pageByResolvedId.get(resolvedId);
  if (!cached || !isFresh(cached.cachedAt)) return null;
  return cached;
}

export function setProfilePageCache(
  resolvedId: string,
  snapshot: Omit<ProfilePageSnapshot, 'cachedAt'>,
) {
  pageByResolvedId.set(resolvedId, {
    ...snapshot,
    cachedAt: Date.now(),
  });
}

export function updateProfilePageScroll(resolvedId: string, scrollY: number) {
  const cached = pageByResolvedId.get(resolvedId);
  if (!cached) return;
  pageByResolvedId.set(resolvedId, { ...cached, scrollY, cachedAt: Date.now() });
}

export function invalidateProfileCache(resolvedId?: string) {
  if (!resolvedId) {
    layoutByRouteKey.clear();
    layoutByResolvedId.clear();
    pageByResolvedId.clear();
    return;
  }
  for (const [key, entry] of layoutByRouteKey) {
    if (entry.resolvedId === resolvedId) layoutByRouteKey.delete(key);
  }
  layoutByResolvedId.delete(resolvedId);
  pageByResolvedId.delete(resolvedId);
}
