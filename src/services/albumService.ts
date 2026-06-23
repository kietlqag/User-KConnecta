import { api } from './api';
import type { ReactionType, PostReactionDetailsResponse } from './postService';

export type AlbumType = 'PERSONAL' | 'FAMILY' | 'EVENT' | 'TRAVEL' | 'OTHER';
export type AlbumPrivacy = 'PUBLIC' | 'FRIENDS' | 'ONLY_ME';
export type AlbumStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type AlbumMediaType = 'IMAGE' | 'VIDEO';

export interface AlbumSidebarItem {
  id: string;
  title: string;
  coverUrl: string | null;
  mediaCount: number;
  updatedAt: string;
}

export interface AlbumMedia {
  id: string;
  mediaType: AlbumMediaType;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  uploaderId: string | null;
  uploaderName: string | null;
  createdAt: string;
  reactionCount: number;
  viewerReaction: string | null;
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  albumType: AlbumType;
  privacy: AlbumPrivacy;
  status: AlbumStatus;
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  groupId: string | null;
  groupName: string | null;
  coverMediaId: string | null;
  coverUrl: string | null;
  mediaCount: number;
  reactionCount: number;
  commentCount: number;
  viewerReaction: string | null;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
  media?: AlbumMedia[];
}

export interface AlbumComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  content: string;
  parentId: string | null;
  createdAt: string;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateAlbumPayload {
  title: string;
  description?: string;
  albumType?: AlbumType;
  privacy?: AlbumPrivacy;
  groupId?: string;
}

export interface UpdateAlbumPayload {
  title?: string;
  description?: string;
  albumType?: AlbumType;
  privacy?: AlbumPrivacy;
  status?: AlbumStatus;
}

export const albumService = {
  getSidebar: () => api.get<AlbumSidebarItem[]>('/me/albums/sidebar'),

  getMyAlbums: (page = 0, size = 12) =>
    api.get<SpringPage<Album>>(`/me/albums?page=${page}&size=${size}`),

  getUserAlbums: (userId: string, page = 0, size = 12) =>
    api.get<SpringPage<Album>>(`/users/${userId}/albums?page=${page}&size=${size}`),

  getById: (id: string, includeMedia = true) =>
    api.get<Album>(`/albums/${id}?includeMedia=${includeMedia}`),

  create: (payload: CreateAlbumPayload) => api.post<Album>('/albums', payload),

  update: (id: string, payload: UpdateAlbumPayload) => api.put<Album>(`/albums/${id}`, payload),

  delete: (id: string) => api.delete<void>(`/albums/${id}`),

  uploadMedia: (albumId: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    return api.postMultipart<AlbumMedia>(`/albums/${albumId}/media`, formData);
  },

  deleteMedia: (albumId: string, mediaId: string) =>
    api.delete<void>(`/albums/${albumId}/media/${mediaId}`),

  setCover: (albumId: string, mediaId: string) =>
    api.put<void>(`/albums/${albumId}/cover`, { mediaId }),

  reorderMedia: (albumId: string, mediaIds: string[]) =>
    api.put<void>(`/albums/${albumId}/media/reorder`, { mediaIds }),

  getComments: (albumId: string) => api.get<AlbumComment[]>(`/albums/${albumId}/comments`),

  addComment: (albumId: string, content: string, parentId?: string) =>
    api.post<AlbumComment>(`/albums/${albumId}/comments`, { content, parentId }),

  addReaction: (albumId: string, reactionType: ReactionType = 'LIKE') =>
    api.post<void>(`/albums/${albumId}/reactions`, { reactionType }),

  removeReaction: (albumId: string) => api.delete<void>(`/albums/${albumId}/reactions`),

  getReactionDetails: (albumId: string) =>
    api.get<PostReactionDetailsResponse>(`/albums/${albumId}/reactions/details`),

  share: (albumId: string, message?: string, shareToFeed = true) =>
    api.post<{ id: string; postId: string | null }>(`/albums/${albumId}/share`, { message, shareToFeed }),

  sendToUser: (albumId: string, recipientId: string) =>
    api.post<void>(`/albums/${albumId}/send/${recipientId}`, {}),

  getGroupAlbums: (groupId: string, page = 0, size = 12) =>
    api.get<SpringPage<Album>>(`/groups/${groupId}/albums?page=${page}&size=${size}`),

  report: (albumId: string, reason: string, detail?: string) =>
    api.post<void>(`/albums/${albumId}/report`, { reason, detail }),
};
