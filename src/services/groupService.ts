import { api } from './api';

export interface GroupApiResponse {
  id: string;
  name: string;
  description: string | null;
  coverPhotoUrl: string | null;
  privacy: 'PUBLIC' | 'PRIVATE';
  memberCount: number;
  role: 'ADMIN' | 'MEMBER' | null;
  updatedAt: string;
}

export interface GroupMemberApiResponse {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
}

export const groupService = {
  getJoinedGroups: (userId: string) =>
    api.get<GroupApiResponse[]>(`/groups/joined?userId=${userId}`),

  getManagedGroups: (userId: string) =>
    api.get<GroupApiResponse[]>(`/groups/managed?userId=${userId}`),

  getDiscoverGroups: (userId: string) =>
    api.get<GroupApiResponse[]>(`/groups/discover?userId=${userId}`),

  joinGroup: (groupId: string, userId: string) =>
    api.post<GroupApiResponse>(`/groups/${groupId}/join?userId=${userId}`, {}),

  getGroupById: (groupId: string, currentUserId?: string) => {
    const query = currentUserId ? `?currentUserId=${currentUserId}` : '';
    return api.get<GroupApiResponse>(`/groups/${groupId}${query}`);
  },

  getGroupMembers: (groupId: string) =>
    api.get<GroupMemberApiResponse[]>(`/groups/${groupId}/members`),

  inviteFriends: (groupId: string, userIds: string[]) =>
    api.post<void>(`/groups/${groupId}/invite`, userIds),

  createGroup: (payload: {
    creatorId: string;
    name: string;
    description?: string;
    coverPhotoUrl?: string;
    privacy: 'PUBLIC' | 'PRIVATE';
  }) => api.post<GroupApiResponse>('/groups', payload),

  updateCoverPhoto: (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append('coverPhoto', file);
    return api.putMultipart<GroupApiResponse>(`/groups/${groupId}/cover-photo`, formData);
  },

  removeCoverPhoto: (groupId: string) =>
    api.delete<void>(`/groups/${groupId}/cover-photo`),
};
