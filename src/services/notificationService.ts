import { api } from './api';
import { Notification, NotificationType } from '../features/notifications/types/notifications.types';

const API_URL = '/notifications';
const GROUP_API_URL = '/groups';

/** Backend sends Java enum names (UPPER_SNAKE_CASE). Frontend expects lower_snake_case. */
function mapApiNotification(raw: any): Notification {
  return {
    ...raw,
    id: String(raw.id),
    type: (typeof raw.type === 'string' ? raw.type.toLowerCase() : raw.type) as NotificationType,
    relatedId: raw.relatedId ? String(raw.relatedId) : undefined,
    isActioned: raw.isActioned ?? raw.actioned ?? false,
    isUnread: raw.isUnread ?? raw.unread ?? false,
    user: raw.user
      ? { id: raw.user.id ? String(raw.user.id) : undefined, name: raw.user.name ?? 'Người dùng', avatar: raw.user.avatar ?? '' }
      : { name: 'Người dùng', avatar: '' },
  };
}

export const notificationService = {
  getNotifications: async (userId: string): Promise<Notification[]> => {
    const data = await api.get<any[]>(`${API_URL}?userId=${userId}`);
    return (Array.isArray(data) ? data : []).map(mapApiNotification);
  },

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
