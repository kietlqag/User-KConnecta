import { api } from './api';

export const FRIENDSHIP_CHANGED_EVENT = 'friendship-changed';

export interface FriendApiResponse {
  friendshipId: string | null;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  mutualFriends: number;
  suggestionReason?: string | null;
  status: 'PENDING' | 'ACCEPTED' | null;
  createdAt: string | null;
}

export interface FriendshipStatusResponse {
  friendshipId: string | null;
  status: 'PENDING' | 'ACCEPTED' | null;
  sentByMe: boolean;
}

function notifyFriendshipChanged() {
  window.dispatchEvent(new Event(FRIENDSHIP_CHANGED_EVENT));
}

export const friendService = {
  getFriends: (userId: string) =>
    api.get<FriendApiResponse[]>(`/friends/${userId}`),

  getFriendRequests: () =>
    api.get<FriendApiResponse[]>('/friends/requests'),

  getSentFriendRequests: () =>
    api.get<FriendApiResponse[]>('/friends/sent-requests'),

  getSuggestions: (userId: string) =>
    api.get<FriendApiResponse[]>(`/friends/${userId}/suggestions`),

  sendFriendRequest: (requesterId: string, addresseeId: string) => {
    if (requesterId === addresseeId) {
      return Promise.reject(new Error('Không thể gửi lời mời kết bạn cho chính mình'));
    }
    return api.post<FriendApiResponse>('/friends/request', { requesterId, addresseeId });
  },

  acceptFriendRequest: async (friendshipId: string) => {
    const res = await api.put<FriendApiResponse>(`/friends/${friendshipId}/accept`, {});
    notifyFriendshipChanged();
    return res;
  },

  deleteFriendship: async (friendshipId: string) => {
    await api.delete<void>(`/friends/${friendshipId}`);
    notifyFriendshipChanged();
  },

  getStatus: (meId: string, targetId: string) =>
    api.get<FriendshipStatusResponse>(`/friends/status?me=${meId}&target=${targetId}`),
};
