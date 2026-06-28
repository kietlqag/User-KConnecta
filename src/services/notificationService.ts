import { api } from './api';
import { Notification, NotificationType } from '../features/notifications/types/notifications.types';
import logoV2 from '@/assets/LogoKConnecta_V2.png';
import { resolveUserAvatarUrl } from '@/utils/userAvatarUtils';

const API_URL = '/notifications';
const GROUP_API_URL = '/groups';

function resolveNotificationAvatar(rawUser: { avatar?: string; avatarUrl?: string } | null | undefined, isSystem: boolean): string {
  if (isSystem) return logoV2;
  const resolved = resolveUserAvatarUrl(rawUser?.avatarUrl ?? rawUser?.avatar);
  return resolved ?? '';
}

function normalizeNotificationText(text: string | undefined, userName: string): string {
  if (!text || !userName) return text ?? '';
  return text.startsWith(userName) ? text.slice(userName.length).trimStart() : text;
}

/** Backend sends Java enum names (UPPER_SNAKE_CASE). Frontend expects lower_snake_case. */
function mapApiNotification(raw: any): Notification {
  const type = (typeof raw.type === 'string' ? raw.type.toLowerCase() : raw.type) as NotificationType;
  const isSystem = type === 'system';
  const userName = isSystem ? 'từ Admin' : (raw.user?.name ?? 'Người dùng');

  return {
    ...raw,
    id: String(raw.id),
    type,
    text: normalizeNotificationText(raw.text, userName),
    relatedId: raw.relatedId ? String(raw.relatedId) : undefined,
    isActioned: raw.isActioned ?? raw.actioned ?? false,
    isUnread: raw.isUnread ?? raw.unread ?? false,
    user: raw.user
      ? {
          id: raw.user.id ? String(raw.user.id) : undefined,
          name: userName,
          avatar: resolveNotificationAvatar(raw.user, isSystem),
        }
      : {
          name: isSystem ? 'từ Admin' : 'Người dùng',
          avatar: isSystem ? logoV2 : '',
        },
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

  acceptGroupInvite: (groupId: string, notificationId: string, userId: string): Promise<{ status?: string }> =>
    api.post<{ status?: string }>(`${GROUP_API_URL}/${groupId}/invites/${notificationId}/accept?userId=${userId}`, {}),

  rejectGroupInvite: (groupId: string, notificationId: string): Promise<void> =>
    api.post<void>(`${GROUP_API_URL}/${groupId}/invites/${notificationId}/reject`, {}),
};
