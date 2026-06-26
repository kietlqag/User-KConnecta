import { api } from '@/services/api';
import type {
  BlockedUser,
  LanguageOption,
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
  language: LanguageOption;
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
  language?: LanguageOption;
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
    language: data.language,
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
    return api.get<{ blockedByMe: boolean }>(`/users/me/blocks/${blockedUserId}/status`);
  },

  revokeSession: async (sessionId: string): Promise<UserSettings> => {
    await api.delete(`/users/me/sessions/${sessionId}`);
    return userSettingsApi.getSettings();
  },

  deleteAccount: async (password?: string): Promise<void> => {
    await api.delete('/users/me', password ? { password } : {});
  },
};
