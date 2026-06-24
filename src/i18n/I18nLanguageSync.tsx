import { useEffect } from 'react';
import { authService, AUTH_USER_CHANGED_EVENT } from '@/services/authService';
import { userSettingsApi } from '@/features/settings/services/userSettingsApi';
import { applyAppLanguage } from '@/i18n';
import type { LanguageOption } from '@/features/settings/types/userSettings.types';

export function I18nLanguageSync() {
  useEffect(() => {
    const syncFromServer = async () => {
      const user = authService.getCurrentUser();
      if (!user?.token) return;
      try {
        const settings = await userSettingsApi.getSettings();
        applyAppLanguage(settings.language as LanguageOption);
      } catch {
        // keep local preference when settings API is unavailable
      }
    };

    void syncFromServer();

    const onAuthChange = () => {
      void syncFromServer();
    };

    window.addEventListener(AUTH_USER_CHANGED_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_USER_CHANGED_EVENT, onAuthChange);
  }, []);

  return null;
}
