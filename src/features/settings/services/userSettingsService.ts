import { authService } from '@/services/authService';
import {
  DEFAULT_USER_SETTINGS,
  type LoginDevice,
  type UserSettings,
} from '../types/userSettings.types';

const STORAGE_PREFIX = 'kconnecta-user-settings';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function detectCurrentDevice(): LoginDevice {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  const browser = /Edg\//.test(ua)
    ? 'Microsoft Edge'
    : /Chrome\//.test(ua)
      ? 'Google Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Trình duyệt web';

  return {
    id: 'current-device',
    deviceName: isMobile ? 'Điện thoại' : 'Máy tính',
    browser,
    location: 'Việt Nam',
    lastActive: new Date().toISOString(),
    isCurrent: true,
  };
}

export function loadUserSettings(): UserSettings {
  const user = authService.getCurrentUser();
  if (!user?.id) return { ...DEFAULT_USER_SETTINGS };

  try {
    const raw = localStorage.getItem(storageKey(user.id));
    if (!raw) {
      return {
        ...DEFAULT_USER_SETTINGS,
        devices: [detectCurrentDevice()],
      };
    }
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const devices =
      parsed.devices && parsed.devices.length > 0
        ? parsed.devices.map((d) =>
            d.id === 'current-device'
              ? { ...detectCurrentDevice(), ...d, isCurrent: true }
              : d,
          )
        : [detectCurrentDevice()];

    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
      devices,
    };
  } catch {
    return {
      ...DEFAULT_USER_SETTINGS,
      devices: [detectCurrentDevice()],
    };
  }
}

export function saveUserSettings(settings: UserSettings): void {
  const user = authService.getCurrentUser();
  if (!user?.id) return;
  localStorage.setItem(storageKey(user.id), JSON.stringify(settings));
}
