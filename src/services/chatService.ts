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

export const chatService = {
  getChatHistory: (userId1: string, userId2: string) =>
    api.get<IncomingChatMessage[]>(`/chat/history?userId1=${userId1}&userId2=${userId2}`),

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
};
