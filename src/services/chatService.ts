import { api } from './api';
import type { IncomingChatMessage } from '@/features/messenger/types/message.types';

export const chatService = {
  getChatHistory: (userId1: string, userId2: string) =>
    api.get<IncomingChatMessage[]>(`/chat/history?userId1=${userId1}&userId2=${userId2}`),
};
