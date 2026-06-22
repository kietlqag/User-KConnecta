import { api } from './api';

// Dispatched on the window when a realtime group-membership notification arrives
// (join request, approval/rejection, invite) so open group views can refetch without a reload.
export const GROUP_MEMBERSHIP_CHANGED_EVENT = 'group-membership-changed';

export interface GroupApiResponse {
  id: string;
  name: string;
  description: string | null;
  coverPhotoUrl: string | null;
  privacy: 'PUBLIC' | 'PRIVATE';
  memberApprovalRequired: boolean;
  memberCount: number;
  role: 'ADMIN' | 'MEMBER' | null;
  status: 'PENDING' | 'APPROVED' | null;
  updatedAt: string;
}

export interface GroupMemberApiResponse {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
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

  inviteFriends: (groupId: string, senderId: string, userIds: string[]) =>
    api.post<void>(`/groups/${groupId}/invite?currentUserId=${senderId}`, userIds),

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

  updateDescription: (groupId: string, requesterId: string, description: string) =>
    api.put<GroupApiResponse>(`/groups/${groupId}/description`, { requesterId, description }),

  updateMemberApproval: (groupId: string, memberApprovalRequired: boolean) =>
    api.put<GroupApiResponse>(`/groups/${groupId}/member-approval`, { memberApprovalRequired }),

  removeMember: (groupId: string, userId: string, requesterId: string) =>
    api.delete<void>(`/groups/${groupId}/members/${userId}?requesterId=${requesterId}`),

  leaveGroup: (groupId: string, userId: string) =>
    api.delete<void>(`/groups/${groupId}/leave?userId=${userId}`),

  disbandGroup: (groupId: string) =>
    api.delete<void>(`/groups/${groupId}`),

  getJoinRequests: (groupId: string) =>
    api.get<GroupMemberApiResponse[]>(`/groups/${groupId}/requests`),

  approveJoinRequest: (groupId: string, userId: string) =>
    api.post<void>(`/groups/${groupId}/requests/${userId}/approve`, {}),

  rejectJoinRequest: (groupId: string, userId: string) =>
    api.post<void>(`/groups/${groupId}/requests/${userId}/reject`, {}),
};
