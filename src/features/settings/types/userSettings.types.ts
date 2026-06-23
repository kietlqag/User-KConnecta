export type SettingsTab = 'security' | 'privacy' | 'notifications' | 'appearance';

export type VisibilityOption = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

export type ThemeOption = 'light' | 'dark' | 'system';

export type LanguageOption = 'vi' | 'en';

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
  postsVisibility: VisibilityOption;
  blockedUsers: BlockedUser[];
  notifyPosts: boolean;
  notifyMessages: boolean;
  notifyEmail: boolean;
  theme: ThemeOption;
  language: LanguageOption;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  twoFactorEnabled: false,
  devices: [],
  profileVisibility: 'PUBLIC',
  postsVisibility: 'FRIENDS',
  blockedUsers: [],
  notifyPosts: true,
  notifyMessages: true,
  notifyEmail: false,
  theme: 'system',
  language: 'vi',
};
