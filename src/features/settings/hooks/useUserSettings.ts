import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { loadUserSettings, saveUserSettings } from '../services/userSettingsService';
import type { UserSettings } from '../types/userSettings.types';

export function useUserSettings() {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings>(() => loadUserSettings());
  const [savedSnapshot, setSavedSnapshot] = useState<UserSettings>(() => loadUserSettings());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = loadUserSettings();
    setSettings(next);
    setSavedSnapshot(next);
  }, []);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSnapshot);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      saveUserSettings(settings);
      setTheme(settings.theme);
      setSavedSnapshot(settings);
      toast.success('Đã lưu thay đổi');
    } catch {
      toast.error('Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  }, [settings, setTheme]);

  const discard = useCallback(() => {
    setSettings(savedSnapshot);
  }, [savedSnapshot]);

  return {
    settings,
    updateSettings,
    isDirty,
    save,
    discard,
    saving,
  };
}
