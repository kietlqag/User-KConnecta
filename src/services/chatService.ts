import { api } from './api';
import type { IncomingChatMessage } from '@/features/messenger/types/message.types';

export interface CallRecordingResponse {
  id: string;
  callId: string;
  ownerUserId: string;
  fileUrl: string;
  recordingMediaType?: 'audio' | 'video';
  hasVideo?: boolean;
  mimeType?: string;
  fileSizeBytes: number;
  durationSec?: number;
  createdAt: string;
}

export interface ChatHistoryPageResponse {
  messages: IncomingChatMessage[];
  hasMore: boolean;
  nextBeforeCreatedAt?: string | null;
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

    return api
      .get<ChatHistoryPageResponse | IncomingChatMessage[]>(`/chat/history?${params.toString()}`)
      .then(normalizeChatHistoryResponse);
  },

  uploadCallRecording: (callId: string, file: File, durationSec?: number, mediaType?: 'audio' | 'video') => {
    const formData = new FormData();
    formData.append('file', file);
    if (typeof durationSec === 'number' && Number.isFinite(durationSec)) {
      formData.append('durationSec', String(Math.max(0, Math.floor(durationSec))));
    }
    if (mediaType) {
      formData.append('mediaType', mediaType);
    }
    return api.postMultipart<CallRecordingResponse>(`/chat/calls/${callId}/recordings`, formData);
  },

  getCallSessionSnapshot: (callId: string) => {
    return api.get<CallSessionSnapshotResponse>(`/chat/calls/${callId}/session`);
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
