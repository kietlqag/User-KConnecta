import { Monitor, Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SettingsSection } from '../SettingsSection';
import { SettingsSaveBar } from '../SettingsSaveBar';
import type { ThemeOption, UserSettings } from '../../types/userSettings.types';

interface AppearanceSectionProps {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function AppearanceSection({
  settings,
  updateSettings,
  isDirty,
  saving,
  onSave,
  onDiscard,
}: AppearanceSectionProps) {
  const { t } = useTranslation();

  const themeOptions = useMemo(
    () => [
      { value: 'light' as ThemeOption, label: t('settings.appearance.themeLight'), description: t('settings.appearance.themeLightDesc'), icon: Sun },
      { value: 'dark' as ThemeOption, label: t('settings.appearance.themeDark'), description: t('settings.appearance.themeDarkDesc'), icon: Moon },
      { value: 'system' as ThemeOption, label: t('settings.appearance.themeSystem'), description: t('settings.appearance.themeSystemDesc'), icon: Monitor },
    ],
    [t],
  );

  return (
    <div className="space-y-8">
      <SettingsSection
        title={t('settings.appearance.themeTitle')}
        description={t('settings.appearance.themeDesc')}
      >
        <RadioGroup
          value={settings.theme}
          onValueChange={(value) => updateSettings({ theme: value as ThemeOption })}
          className="gap-2"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = settings.theme === option.value;
            return (
              <label
                key={option.value}
                htmlFor={`theme-${option.value}`}
                className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 transition-colors ${ isActive ? 'border-primary/30 bg-accent' : 'border-border bg-card hover:bg-muted/40' }`}
              >
                <RadioGroupItem value={option.value} id={`theme-${option.value}`} className="sr-only" />
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${ isActive ? 'bg-primary/15' : 'bg-muted' }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                <div
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${ isActive ? 'border-primary bg-primary' : 'border-border' }`}
                />
              </label>
            );
          })}
        </RadioGroup>
      </SettingsSection>

      <SettingsSaveBar isDirty={isDirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
