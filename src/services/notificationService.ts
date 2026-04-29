import { api } from './api';
import { Notification } from '../features/notifications/types/notifications.types';

const API_URL = '/notifications';
const GROUP_API_URL = '/groups';

export const notificationService = {
  getNotifications: (userId: string): Promise<Notification[]> =>
    api.get<Notification[]>(`${API_URL}?userId=${userId}`),

  getUnreadCount: async (userId: string): Promise<number> => {
    const data = await api.get<{ count: number }>(`${API_URL}/unread-count?userId=${userId}`);
    return data.count;
  },

  markAsRead: (notificationId: string): Promise<void> =>
    api.put<void>(`${API_URL}/${notificationId}/read`, {}),

  markAllAsRead: (userId: string): Promise<void> =>
    api.put<void>(`${API_URL}/read-all?userId=${userId}`, {}),

  acceptGroupInvite: (groupId: string, notificationId: string, userId: string): Promise<void> =>
    api.post<void>(`${GROUP_API_URL}/${groupId}/invites/${notificationId}/accept?userId=${userId}`, {}),

  rejectGroupInvite: (groupId: string, notificationId: string): Promise<void> =>
    api.post<void>(`${GROUP_API_URL}/${groupId}/invites/${notificationId}/reject`, {}),
};
