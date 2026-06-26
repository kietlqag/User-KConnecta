export type SettingsTab = 'security' | 'privacy' | 'notifications' | 'appearance';

export type VisibilityOption = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

export type ThemeOption = 'light' | 'dark' | 'system';

export interface LoginDevice {
  id: string;
  deviceName: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface BlockedUser {
  id: string;
  name: string;
  avatarUrl?: string;
  blockedAt: string;
}

export interface UserSettings {
  twoFactorEnabled: boolean;
  devices: LoginDevice[];
  profileVisibility: VisibilityOption;
  blockedUsers: BlockedUser[];
  notifyPosts: boolean;
  notifyMessages: boolean;
  theme: ThemeOption;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  twoFactorEnabled: false,
  devices: [],
  profileVisibility: 'PUBLIC',
  blockedUsers: [],
  notifyPosts: true,
  notifyMessages: true,
  theme: 'system',
};
