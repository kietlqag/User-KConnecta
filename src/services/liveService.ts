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
  pageId?: string;
  title: string;
  description: string;
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'SPECIFIC_FRIENDS' | 'PRIVATE';
  startMode: LiveStartMode;
  scheduledAt?: string | null;
  locationText?: string | null;
  excludedUserIds?: string[];
  taggedUserIds?: string[];
}

export interface StartLiveResponse {
  postId: string;
  sessionId: string;
  userId: string;
  title: string;
  roomName: string;
  livekitUrl: string | null;
  hostToken: string | null;
  startMode: LiveStartMode;
  postStatus: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'DELETED';
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export type LiveSessionStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELED';
export type LiveRecordingStatus = 'NONE' | 'RECORDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface LiveSessionResponse {
  id: string;
  hostUserId: string;
  hostName?: string | null;
  hostAvatarUrl?: string | null;
  groupId?: string | null;
  pageId?: string | null;
  postId?: string | null;
  title: string;
  description?: string | null;
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';
  startMode: LiveStartMode;
  scheduledAt: string | null;
  status: LiveSessionStatus;
  streamKey: string;
  roomName: string;
  playbackUrl?: string | null;
  hlsPlaybackUrl?: string | null;
  thumbnailUrl?: string | null;
  recordingStatus?: LiveRecordingStatus | null;
  recordingDurationSec?: number | null;
  recordingMimeType?: string | null;
  recordingFileSizeBytes?: number | null;
  recordingError?: string | null;
  startedAt: string | null;
  endedAt: string | null;
  viewerCount: number;
  peakViewerCount: number;
  totalReactionCount: number;
  createdAt: string;
  updatedAt: string;
  subscriptionCount?: number | null;
  subscribedByCurrentUser?: boolean | null;
}

export interface LiveKitTokenRequest {
  userId: string;
  sessionId: string;
  role: 'HOST' | 'VIEWER';
}

export interface LiveKitTokenResponse {
  sessionId: string;
  userId: string;
  role: 'HOST' | 'VIEWER';
  roomName: string;
  livekitUrl: string;
  token: string;
  expiresAt: string;
}

export interface LiveSessionStatsResponse {
  sessionId: string;
  viewerCount: number;
  peakViewerCount: number;
  totalReactionCount: number;
}

export interface LiveSessionToolStateResponse {
  sessionId: string;
  pollEnabled: boolean;
  pollQuestion: string | null;
  pollOptions: string[];
  pollOptionCounts?: number[] | null;
  myPollOptionIndex?: number | null;
  featuredLinkTitle: string | null;
  featuredLinkUrl: string | null;
  hostNotice: string | null;
  pinnedCommentId: string | null;
  updatedAt: string | null;
}

export type LiveSessionRealtimeEventType =
  | 'LIVE_STARTED'
  | 'LIVE_ENDED'
  | 'SESSION_UPDATED'
  | 'VIEWER_COUNT_UPDATED'
  | 'REACTION_UPDATED'
  | 'TOOLS_UPDATED';

export interface LiveSessionReactionResponse {
  sessionId: string;
  userId: string;
  reactionType: UpsertLiveReactionRequest['reactionType'];
}

export interface LiveSessionRealtimeEvent {
  type: LiveSessionRealtimeEventType;
  sessionId: string;
  status?: LiveSessionStatus | null;
  viewerCount?: number | null;
  peakViewerCount?: number | null;
  totalReactionCount?: number | null;
  reactedUserId?: string | null;
  reactionType?: UpsertLiveReactionRequest['reactionType'];
  session?: LiveSessionResponse | null;
  tools?: LiveSessionToolStateResponse | null;
  emittedAt?: string | null;
}

export interface UpsertLivePollRequest {
  enabled: boolean;
  question?: string | null;
  options?: string[];
}

export interface VoteLivePollRequest {
  optionIndex: number;
}

export interface UpsertLiveFeaturedLinkRequest {
  title?: string | null;
  url?: string | null;
}

export interface UpsertLiveHostNoticeRequest {
  notice?: string | null;
}

export interface UpsertLiveSessionPinnedCommentRequest {
  commentId?: string | null;
}

export interface GoLiveResponse {
  session: LiveSessionResponse;
  livekitUrl: string;
  hostToken: string;
}

export interface UpsertLiveReactionRequest {
  reactionType: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | null;
}

export interface LiveEventSubscriptionStatusResponse {
  subscribed: boolean;
  subscriptionCount: number;
}

export interface LiveEventSubscriberResponse {
  userId: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  subscribedAt: string;
}

export interface LiveEventSubscribersResponse {
  total: number;
  subscribers: LiveEventSubscriberResponse[];
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
  getToken: (payload: LiveKitTokenRequest) =>
    api.post<LiveKitTokenResponse>('/live/token', payload),
  listActiveSessions: () =>
    api.get<LiveSessionResponse[]>('/live/sessions/active'),
  listScheduledSessions: () =>
    api.get<LiveSessionResponse[]>('/live/sessions/scheduled'),
  listGroupSessions: (groupId: string) =>
    api.get<LiveSessionResponse[]>(`/live/sessions/by-group/${encodeURIComponent(groupId)}`),
  updateScheduledSession: (
    sessionId: string,
    payload: {
      title: string;
      description: string;
      scheduledAt: string;
      privacy: LiveSessionResponse['privacy'];
    },
  ) => api.put<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/scheduled`, payload),
  cancelScheduledSession: (sessionId: string) =>
    api.delete<void>(`/live/sessions/${encodeURIComponent(sessionId)}/scheduled`),
  getSession: (sessionId: string) =>
    api.get<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}`),
  getSessionByPost: (postId: string) =>
    api.get<LiveSessionResponse>(`/live/sessions/by-post/${encodeURIComponent(postId)}`),
  goLive: (sessionId: string) =>
    api.post<GoLiveResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/go-live`, {}),
  getStats: (sessionId: string) =>
    api.get<LiveSessionStatsResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/stats`),
  getTools: (sessionId: string) =>
    api.get<LiveSessionToolStateResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/tools`),
  upsertPoll: (sessionId: string, payload: UpsertLivePollRequest) =>
    api.put<LiveSessionToolStateResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/tools/poll`, payload),
  votePoll: (sessionId: string, payload: VoteLivePollRequest) =>
    api.put<LiveSessionToolStateResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/tools/poll/vote`, payload),
  upsertFeaturedLink: (sessionId: string, payload: UpsertLiveFeaturedLinkRequest) =>
    api.put<LiveSessionToolStateResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/tools/featured-link`, payload),
  upsertHostNotice: (sessionId: string, payload: UpsertLiveHostNoticeRequest) =>
    api.put<LiveSessionToolStateResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/tools/host-notice`, payload),
  upsertSessionPinnedComment: (sessionId: string, payload: UpsertLiveSessionPinnedCommentRequest) =>
    api.put<LiveSessionToolStateResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/tools/pinned-comment`, payload),
  endSession: (sessionId: string) =>
    api.post<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/end`, {}),
  uploadRecording: (sessionId: string, file: Blob, durationSec?: number) => {
    const formData = new FormData();
    const mimeType = file.type || 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const uploadFile = file instanceof File
      ? file
      : new File([file], `live-${sessionId}.${ext}`, { type: mimeType });
    formData.append('file', uploadFile, uploadFile.name);
    if (durationSec != null) {
      formData.append('durationSec', String(durationSec));
    }
    return api.postMultipart<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/recording`, formData);
  },
  markRecordingFailed: (sessionId: string, error?: string) =>
    api.post<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/recording/failed`, { error }),
  joinSession: (sessionId: string) =>
    api.put<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/viewer/join`, {}),
  heartbeat: (sessionId: string) =>
    api.put<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/viewer/heartbeat`, {}),
  leaveSession: (sessionId: string) =>
    api.put<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/viewer/leave`, {}),
  react: (sessionId: string, payload: UpsertLiveReactionRequest) =>
    api.put<LiveSessionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/reaction`, payload),
  getReaction: (sessionId: string) =>
    api.get<LiveSessionReactionResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/reaction`),
  subscribeToEvent: (sessionId: string) =>
    api.post<LiveEventSubscriptionStatusResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/subscribe`, {}),
  unsubscribeFromEvent: (sessionId: string) =>
    api.delete<LiveEventSubscriptionStatusResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/subscribe`),
  getEventSubscriptionStatus: (sessionId: string) =>
    api.get<LiveEventSubscriptionStatusResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/subscription`),
  getEventSubscribers: (sessionId: string) =>
    api.get<LiveEventSubscribersResponse>(`/live/sessions/${encodeURIComponent(sessionId)}/subscribers`),
};
