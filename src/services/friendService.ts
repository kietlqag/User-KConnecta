import { api } from './api';

export interface FriendApiResponse {
  friendshipId: string | null;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  mutualFriends: number;
  status: 'PENDING' | 'ACCEPTED' | null;
  createdAt: string | null;
}

export interface FriendshipStatusResponse {
  friendshipId: string | null;
  status: 'PENDING' | 'ACCEPTED' | null;
  sentByMe: boolean;
}

export const friendService = {
  getFriends: (userId: string) =>
    api.get<FriendApiResponse[]>(`/friends/${userId}`),

  getFriendRequests: (userId: string) =>
    api.get<FriendApiResponse[]>(`/friends/${userId}/requests`),

  getSuggestions: (userId: string) =>
    api.get<FriendApiResponse[]>(`/friends/${userId}/suggestions`),

  sendFriendRequest: (requesterId: string, addresseeId: string) =>
    api.post<FriendApiResponse>('/friends/request', { requesterId, addresseeId }),

  acceptFriendRequest: (friendshipId: string) =>
    api.put<FriendApiResponse>(`/friends/${friendshipId}/accept`, {}),

  deleteFriendship: (friendshipId: string) =>
    api.delete<void>(`/friends/${friendshipId}`),

  getStatus: (meId: string, targetId: string) =>
    api.get<FriendshipStatusResponse>(`/friends/status?me=${meId}&target=${targetId}`),
};
