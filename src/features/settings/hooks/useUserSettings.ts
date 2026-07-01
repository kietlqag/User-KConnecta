import { vi } from '@/constants/vi';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useTheme } from 'next-themes';

import { toast } from 'sonner';


import type { UserSettings } from '../types/userSettings.types';

import { DEFAULT_USER_SETTINGS } from '../types/userSettings.types';

import { userSettingsApi } from '../services/userSettingsApi';
import { setNotifyMessagesEnabled } from '@/features/messenger/utils/messageNotificationPrefs';



export function useUserSettings() {

  const { setTheme } = useTheme();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  const [savedSnapshot, setSavedSnapshot] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const loadingRef = useRef(false);



  const load = useCallback(async () => {

    if (loadingRef.current) return;

    loadingRef.current = true;

    setLoading(true);

    setLoadError(null);

    try {

      const data = await userSettingsApi.getSettings();

      setSettings(data);

      setSavedSnapshot(data);

      if (data.theme) {

        setTheme(data.theme);

      }

      setNotifyMessagesEnabled(data.notifyMessages);

    } catch (error) {

      const message = error instanceof Error ? error.message : vi.settings.loadError;

      setLoadError(message);

      toast.error(message);

    } finally {

      loadingRef.current = false;

      setLoading(false);

    }

  }, [setTheme]);



  useEffect(() => {

    void load();

  }, [load]);



  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSnapshot);



  const updateSettings = useCallback((patch: Partial<UserSettings>) => {

    setSettings((prev) => ({ ...prev, ...patch }));

  }, []);



  const save = useCallback(async () => {

    setSaving(true);

    try {

      const data = await userSettingsApi.updateSettings({

        twoFactorEnabled: settings.twoFactorEnabled,

        profileVisibility: settings.profileVisibility,

        notifyPosts: settings.notifyPosts,

        notifyMessages: settings.notifyMessages,

        theme: settings.theme,

      });

      setSettings(data);

      setSavedSnapshot(data);

      setTheme(data.theme);

      setNotifyMessagesEnabled(data.notifyMessages);

      toast.success(vi.common.saved);

    } catch (error) {

      toast.error(error instanceof Error ? error.message : vi.settings.saveError);

    } finally {

      setSaving(false);

    }

  }, [settings, setTheme]);



  const discard = useCallback(() => {

    setSettings(savedSnapshot);

  }, [savedSnapshot]);



  const unblockUser = useCallback(async (blockedUserId: string) => {

    try {

      const data = await userSettingsApi.unblockUser(blockedUserId);

      setSettings(data);

      setSavedSnapshot(data);

      toast.success(vi.settings.unblockSuccess);

    } catch (error) {

      toast.error(error instanceof Error ? error.message : vi.settings.unblockError);

    }

  }, []);



  const revokeSession = useCallback(async (sessionId: string) => {

    try {

      const data = await userSettingsApi.revokeSession(sessionId);

      setSettings(data);

      setSavedSnapshot(data);

      toast.success(vi.settings.revokeSuccess);

    } catch (error) {

      toast.error(error instanceof Error ? error.message : vi.settings.revokeError);

    }

  }, []);



  return {

    settings,

    updateSettings,

    isDirty,

    save,

    discard,

    saving,

    loading,

    loadError,

    reload: load,

    unblockUser,

    revokeSession,

  };

}


