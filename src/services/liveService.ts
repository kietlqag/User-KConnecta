import { api } from './api';

export interface LiveDestinationItem {
  id: string;
  name: string;
  description?: string | null;
}

export interface LiveDestinationsResponse {
  pages: LiveDestinationItem[];
  groups: LiveDestinationItem[];
}

export type LiveStartMode = 'NOW' | 'SCHEDULED';

export interface LiveScheduleResponse {
  id: string | null;
  userId: string;
  startMode: LiveStartMode;
  scheduledAt: string | null;
  effectiveStartAt: string;
  updatedAt: string | null;
}

export interface UpsertLiveScheduleRequest {
  userId: string;
  startMode: LiveStartMode;
  scheduledAt?: string | null;
}

export interface LivePinnedCommentResponse {
  id: string | null;
  userId: string;
  enabled: boolean;
  commentText: string;
  updatedAt: string | null;
}

export interface UpsertLivePinnedCommentRequest {
  userId: string;
  enabled: boolean;
  commentText?: string | null;
}

export interface StartLiveRequest {
  userId: string;
  groupId?: string;
  title: string;
  description: string;
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';
  startMode: LiveStartMode;
  scheduledAt?: string | null;
  locationText?: string | null;
  excludedUserIds?: string[];
  taggedUserIds?: string[];
}

export interface StartLiveResponse {
  postId: string;
  userId: string;
  title: string;
  startMode: LiveStartMode;
  postStatus: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'DELETED';
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export const liveService = {
  getDestinations: (userId: string) =>
    api.get<LiveDestinationsResponse>(`/live/destinations?userId=${encodeURIComponent(userId)}`),
  getSchedule: (userId: string) =>
    api.get<LiveScheduleResponse>(`/live/schedule?userId=${encodeURIComponent(userId)}`),
  upsertSchedule: (payload: UpsertLiveScheduleRequest) =>
    api.post<LiveScheduleResponse>('/live/schedule', payload),
  getPinnedComment: (userId: string) =>
    api.get<LivePinnedCommentResponse>(`/live/pinned-comment?userId=${encodeURIComponent(userId)}`),
  upsertPinnedComment: (payload: UpsertLivePinnedCommentRequest) =>
    api.post<LivePinnedCommentResponse>('/live/pinned-comment', payload),
  startLive: (payload: StartLiveRequest) =>
    api.post<StartLiveResponse>('/live/start', payload),
};
