import { api } from './api';
import type { PostResponse } from './postService';

export type PinType = 'NORMAL' | 'RULE' | 'ANNOUNCEMENT' | 'FAQ' | 'GUIDE' | 'EVENT';
export type PinPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface PinnedPostApiResponse {
  pinId: string;
  groupId: string;
  featuredType: string;
  pinType: PinType;
  priority: PinPriority;
  displayOrder: number;
  pinnedAt: string;
  expiresAt: string | null;
  reason: string | null;
  pinnedBy: { id: string; fullName: string; avatarUrl: string | null };
  read: boolean;
  post: PostResponse;
}

export interface PinPostBody {
  pinType?: PinType;
  priority?: PinPriority;
  reason?: string;
  expiresAt?: string | null;
}

export const groupPinService = {
  getPinnedPosts: (groupId: string) =>
    api.get<PinnedPostApiResponse[]>(`/groups/${groupId}/pinned-posts`),

  pin: (groupId: string, postId: string, body?: PinPostBody) =>
    api.post<PinnedPostApiResponse>(`/groups/${groupId}/posts/${postId}/pin`, body ?? {}),

  unpin: (groupId: string, postId: string) =>
    api.delete<void>(`/groups/${groupId}/posts/${postId}/pin`),

  reorder: (groupId: string, orderedPostIds: string[]) =>
    api.patch<PinnedPostApiResponse[]>(`/groups/${groupId}/pinned-posts/reorder`, { orderedPostIds }),

  setExpiration: (groupId: string, postId: string, expiresAt: string | null) =>
    api.patch<PinnedPostApiResponse>(`/groups/${groupId}/posts/${postId}/pin-expiration`, { expiresAt }),

  markRead: (groupId: string, pinId: string) =>
    api.post<void>(`/groups/${groupId}/pinned-posts/${pinId}/read`, {}),

  unreadCount: (groupId: string) =>
    api.get<{ unreadCount: number }>(`/groups/${groupId}/pinned-posts/unread-count`),
};
