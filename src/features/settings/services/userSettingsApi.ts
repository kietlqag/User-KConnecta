import { api } from '@/services/api';
import { isUserUuid } from '@/features/profile/utils/profileDisplayUtils';
import type {
  BlockedUser,
  LoginDevice,
  ThemeOption,
  UserSettings,
  VisibilityOption,
} from '@/features/settings/types/userSettings.types';

export interface UserSettingsApiResponse {
  userId: string;
  twoFactorEnabled: boolean;
  profileVisibility: VisibilityOption;
  notifyPosts: boolean;
  notifyMessages: boolean;
  theme: ThemeOption;
  blockedUsers: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    blockedAt: string;
  }[];
  devices: {
    id: string;
    deviceName: string;
    browser: string;
    location: string;
    lastActive: string;
    current: boolean;
  }[];
}

export interface UpdateUserSettingsPayload {
  twoFactorEnabled?: boolean;
  profileVisibility?: VisibilityOption;
  notifyPosts?: boolean;
  notifyMessages?: boolean;
  theme?: ThemeOption;
}

function mapApiToUserSettings(data: UserSettingsApiResponse): UserSettings {
  return {
    twoFactorEnabled: data.twoFactorEnabled,
    profileVisibility: data.profileVisibility,
    blockedUsers: data.blockedUsers.map(
      (user): BlockedUser => ({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
        blockedAt: user.blockedAt,
      }),
    ),
    notifyPosts: data.notifyPosts,
    notifyMessages: data.notifyMessages,
    theme: data.theme,
    devices: data.devices.map(
      (device): LoginDevice => ({
        id: device.id,
        deviceName: device.deviceName,
        browser: device.browser,
        location: device.location,
        lastActive: device.lastActive,
        isCurrent: device.current,
      }),
    ),
  };
}

export const userSettingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const data = await api.get<UserSettingsApiResponse>('/users/me/settings');
    return mapApiToUserSettings(data);
  },

  updateSettings: async (payload: UpdateUserSettingsPayload): Promise<UserSettings> => {
    const data = await api.patch<UserSettingsApiResponse>('/users/me/settings', payload);
    return mapApiToUserSettings(data);
  },

  unblockUser: async (blockedUserId: string): Promise<UserSettings> => {
    await api.delete(`/users/me/blocks/${blockedUserId}`);
    return userSettingsApi.getSettings();
  },

  blockUser: async (blockedUserId: string): Promise<void> => {
    await api.post(`/users/me/blocks/${blockedUserId}`);
  },

  getBlockStatus: async (blockedUserId: string): Promise<{ blockedByMe: boolean }> => {
    if (!blockedUserId?.trim()) {
      return { blockedByMe: false };
    }
    // Backend hỗ trợ username; vẫn ưu tiên UUID khi có để tránh lookup thừa
    const id = isUserUuid(blockedUserId) ? blockedUserId : encodeURIComponent(blockedUserId);
    return api.get<{ blockedByMe: boolean }>(`/users/me/blocks/${id}/status`);
  },

  revokeSession: async (sessionId: string): Promise<UserSettings> => {
    await api.delete(`/users/me/sessions/${sessionId}`);
    return userSettingsApi.getSettings();
  },

  deleteAccount: async (password?: string): Promise<void> => {
    await api.delete('/users/me', password ? { password } : {});
  },
};
