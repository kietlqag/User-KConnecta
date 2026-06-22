import { api } from './api';
import type { IncomingChatMessage } from '@/features/messenger/types/message.types';

export interface VoiceMessageUploadResponse {
  audioUrl: string;
  mimeType?: string;
  fileSizeBytes: number;
  durationSec?: number;
}

export interface VideoMessageUploadResponse {
  videoUrl: string;
  mimeType?: string;
  fileSizeBytes: number;
  durationSec?: number;
}

export interface ChatImageUploadResponse {
  imageUrl: string;
  mimeType?: string;
  fileSizeBytes: number;
}

export interface ChatFileUploadResponse {
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  fileSizeBytes: number;
}

export interface ChatHistoryPageResponse {
  messages: IncomingChatMessage[];
  hasMore: boolean;
  nextBeforeCreatedAt?: string | null;
}

export interface ChatAssetItemResponse {
  id: string;
  type: 'image' | 'file' | 'link' | string;
  url: string;
  label?: string | null;
  meta?: string | null;
  createdAt?: string | null;
}

export interface ChatAssetPageResponse {
  items: ChatAssetItemResponse[];
  hasMore: boolean;
  nextBeforeCreatedAt?: string | null;
}

export interface GroupConversationMemberResponse {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
  nickname?: string | null;
  memberStatus?: 'APPROVED' | 'PENDING';
}

export interface GroupJoinLinkResponse {
  conversationId: string;
  token: string;
  memberApprovalRequired: boolean;
}

export interface GroupJoinLinkPreviewResponse {
  conversationId: string;
  conversationName: string;
  avatarUrl?: string | null;
  memberCount: number;
  memberApprovalRequired: boolean;
  membershipStatus: 'NONE' | 'MEMBER' | 'PENDING';
}

export interface JoinGroupViaLinkResponse {
  status: 'JOINED' | 'PENDING' | 'ALREADY_MEMBER' | 'ALREADY_PENDING';
  conversationId: string;
  conversationName: string;
  message: string;
}

export interface GroupConversationResponse {
  id: string;
  name: string;
  avatarUrl?: string | null;
  themeColor?: string | null;
  createdAt: string;
  createdBy: string;
  memberApprovalRequired?: boolean;
  members: GroupConversationMemberResponse[];
}

export interface CallSessionSnapshotResponse {
  callId: string;
  status?: 'RINGING' | 'ONGOING' | 'MISSED' | 'COMPLETED';
  mediaType?: 'audio' | 'video';
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSec?: number | null;
}

export interface GroupCallSessionResponse {
  callId: string;
  conversationId: string;
  callerId: string;
  status?: 'RINGING' | 'ONGOING' | 'MISSED' | 'COMPLETED';
  mediaType?: 'audio' | 'video';
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSec?: number | null;
}

export interface ConversationPinResponse {
  peerUserId?: string | null;
  conversationId?: string | null;
  pinned: boolean;
}

export interface ConversationSummaryResponse {
  peerUserId?: string | null;
  conversationId?: string | null;
  lastMessageContent?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageCreatedAt?: string | null;
  unreadCount?: number;
}

export interface PinnedMessageResponse {
  id?: string | null;
  peerUserId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  pinnedBy?: string | null;
  pinnedAt?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
  messagePreview?: string | null;
  messageCreatedAt?: string | null;
  pinned: boolean;
}

function normalizeChatHistoryResponse(payload: unknown): ChatHistoryPageResponse {
  if (Array.isArray(payload)) {
    const messages = payload as IncomingChatMessage[];
    return {
      messages,
      hasMore: false,
      nextBeforeCreatedAt: messages.length > 0 ? messages[0].createdAt : null,
    };
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Partial<ChatHistoryPageResponse>;
    const messages = Array.isArray(obj.messages) ? obj.messages : [];
    return {
      messages,
      hasMore: typeof obj.hasMore === 'boolean' ? obj.hasMore : false,
      nextBeforeCreatedAt:
        typeof obj.nextBeforeCreatedAt === 'string' || obj.nextBeforeCreatedAt === null
          ? obj.nextBeforeCreatedAt
          : messages.length > 0
            ? messages[0].createdAt
            : null,
    };
  }

  return {
    messages: [],
    hasMore: false,
    nextBeforeCreatedAt: null,
  };
}

const pendingHistoryRequests = new Map<string, Promise<ChatHistoryPageResponse>>();

function dedupHistoryRequest(key: string, request: () => Promise<ChatHistoryPageResponse>) {
  const pending = pendingHistoryRequests.get(key);
  if (pending) return pending;

  const next = request().finally(() => {
    pendingHistoryRequests.delete(key);
  });
  pendingHistoryRequests.set(key, next);
  return next;
}

export const chatService = {
  getChatHistory: (
    userId1: string,
    userId2: string,
    options?: {
      beforeCreatedAt?: string | null;
      limit?: number;
    },
  ) => {
    const params = new URLSearchParams({
      userId1,
      userId2,
    });

    if (options?.beforeCreatedAt) {
      params.set('beforeCreatedAt', options.beforeCreatedAt);
    }
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }

    const query = params.toString();
    return dedupHistoryRequest(
      `private:${query}`,
      () =>
        api
          .get<ChatHistoryPageResponse | IncomingChatMessage[]>(`/chat/history?${query}`)
          .then(normalizeChatHistoryResponse),
    );
  },

  uploadVoiceMessage: (file: File, durationSec?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (typeof durationSec === 'number' && Number.isFinite(durationSec)) {
      formData.append('durationSec', String(Math.max(0, Math.floor(durationSec))));
    }
    return api.postMultipart<VoiceMessageUploadResponse>('/chat/messages/voice', formData);
  },

  uploadChatVideo: (file: File, durationSec?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (typeof durationSec === 'number' && Number.isFinite(durationSec)) {
      formData.append('durationSec', String(Math.max(0, Math.floor(durationSec))));
    }
    return api.postMultipart<VideoMessageUploadResponse>('/chat/messages/videos', formData);
  },

  uploadChatImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.postMultipart<ChatImageUploadResponse>('/chat/messages/images', formData);
  },

  uploadChatFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.postMultipart<ChatFileUploadResponse>('/chat/messages/files', formData);
  },

  getCallSessionSnapshot: (callId: string) => {
    return api.get<CallSessionSnapshotResponse>(`/chat/calls/${callId}/session`);
  },

  createGroupCallSession: (conversationId: string, mediaType: 'audio' | 'video') => {
    return api.post<GroupCallSessionResponse>(`/chat/conversations/${conversationId}/calls`, { mediaType });
  },

  getGroupCallSessionSnapshot: (callId: string) => {
    return api.get<GroupCallSessionResponse>(`/chat/conversations/group/calls/${callId}/session`);
  },

  createGroupConversation: (payload: { name?: string; avatarUrl?: string; memberIds: string[] }) => {
    return api.post<GroupConversationResponse>('/chat/conversations/group', payload);
  },

  addGroupMembers: (conversationId: string, memberIds: string[]) => {
    return api.post<GroupConversationResponse>(`/chat/conversations/${conversationId}/members`, { memberIds });
  },
  approveGroupMember: (conversationId: string, memberUserId: string) =>
    api.post<GroupConversationResponse>(`/chat/conversations/${conversationId}/members/${memberUserId}/approve`, {}),
  rejectGroupMember: (conversationId: string, memberUserId: string) =>
    api.delete<GroupConversationResponse>(`/chat/conversations/${conversationId}/members/${memberUserId}/pending`),

  removeGroupMember: (conversationId: string, memberUserId: string) =>
    api.delete<GroupConversationResponse>(`/chat/conversations/${conversationId}/members/${memberUserId}`),

  leaveGroupConversation: (conversationId: string, payload?: { newAdminUserId?: string }) =>
    api.post<GroupConversationResponse>(`/chat/conversations/${conversationId}/leave`, payload ?? {}),

  dissolveGroupConversation: (conversationId: string) =>
    api.delete<void>(`/chat/conversations/${conversationId}`),

  getGroupJoinLink: (conversationId: string) =>
    api.get<GroupJoinLinkResponse>(`/chat/conversations/${conversationId}/join-link`),

  previewGroupJoinLink: (token: string) =>
    api.get<GroupJoinLinkPreviewResponse>(`/chat/join/${encodeURIComponent(token)}/preview`),

  joinGroupViaLink: (token: string) =>
    api.post<JoinGroupViaLinkResponse>(`/chat/join/${encodeURIComponent(token)}`, {}),

  updateGroupConversation: (conversationId: string, payload: { name?: string; avatarUrl?: string | null; themeColor?: string | null; memberApprovalRequired?: boolean }) => {
    return api.put<GroupConversationResponse>(`/chat/conversations/${conversationId}`, payload);
  },

  updateGroupMemberNickname: (conversationId: string, memberUserId: string, nickname: string | null) => {
    return api.put<GroupConversationResponse>(`/chat/conversations/${conversationId}/members/${memberUserId}/nickname`, { nickname });
  },

  getMyGroupConversations: () => {
    return api.get<GroupConversationResponse[]>('/chat/conversations/group');
  },

  setConversationPinned: (payload: { peerUserId?: string; conversationId?: string; pinned: boolean }) => {
    return api.put<ConversationPinResponse>('/chat/conversations/pin', payload);
  },

  getPinnedConversations: () => {
    return api.get<ConversationPinResponse[]>('/chat/conversations/pin');
  },

  getTotalPrivateUnreadCount: () => api.get<number>('/chat/unread-count'),

  getConversationSummaries: (options?: { peerUserIds?: string[]; conversationIds?: string[] }) => {
    const params = new URLSearchParams();
    options?.peerUserIds?.forEach((id) => params.append('peerUserIds', id));
    options?.conversationIds?.forEach((id) => params.append('conversationIds', id));
    const query = params.toString();
    const url = query ? `/chat/conversations/summaries?${query}` : '/chat/conversations/summaries';
    return api.get<ConversationSummaryResponse[]>(url);
  },

  setPinnedMessage: (payload: {
    peerUserId?: string;
    conversationId?: string;
    messageId?: string;
    pinned: boolean;
  }) => {
    return api.put<PinnedMessageResponse>('/chat/messages/pin', payload);
  },

  getPinnedMessages: () => {
    return api.get<PinnedMessageResponse[]>('/chat/messages/pin');
  },

  getGroupChatHistory: (
    conversationId: string,
    options?: {
      beforeCreatedAt?: string | null;
      limit?: number;
    },
  ) => {
    const params = new URLSearchParams();
    if (options?.beforeCreatedAt) {
      params.set('beforeCreatedAt', options.beforeCreatedAt);
    }
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    const query = params.toString();
    const url = query
      ? `/chat/conversations/${conversationId}/history?${query}`
      : `/chat/conversations/${conversationId}/history`;
    return dedupHistoryRequest(`group:${conversationId}:${query}`, () => api.get<ChatHistoryPageResponse>(url));
  },

  getPrivateAssets: (
    peerUserId: string,
    type: 'media' | 'files' | 'links',
    options?: { beforeCreatedAt?: string | null; limit?: number },
  ) => {
    const params = new URLSearchParams({ type });
    if (options?.beforeCreatedAt) params.set('beforeCreatedAt', options.beforeCreatedAt);
    if (typeof options?.limit === 'number') params.set('limit', String(options.limit));
    return api.get<ChatAssetPageResponse>(`/chat/assets/private/${peerUserId}?${params.toString()}`);
  },

  getGroupAssets: (
    conversationId: string,
    type: 'media' | 'files' | 'links',
    options?: { beforeCreatedAt?: string | null; limit?: number },
  ) => {
    const params = new URLSearchParams({ type });
    if (options?.beforeCreatedAt) params.set('beforeCreatedAt', options.beforeCreatedAt);
    if (typeof options?.limit === 'number') params.set('limit', String(options.limit));
    return api.get<ChatAssetPageResponse>(`/chat/assets/group/${conversationId}?${params.toString()}`);
  },

  sendGroupMessage: (conversationId: string, content: string) => {
    return api.post<IncomingChatMessage>(`/chat/conversations/${conversationId}/messages`, {
      content,
    });
  },

  updateMessageReaction: (messageId: string, emoji: string | null) => {
    return api.put<IncomingChatMessage>(`/chat/messages/${messageId}/reaction`, { emoji });
  },

  deleteMessage: (messageId: string) => {
    return api.delete<IncomingChatMessage>(`/chat/messages/${messageId}`);
  },

  reportMessage: (messageId: string, reason?: string) => {
    return api.post<void>(`/chat/messages/${messageId}/report`, { reason: reason?.trim() || null });
  },
};
