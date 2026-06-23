import { Monitor, Moon, Sun } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsSection } from '../SettingsSection';
import { SettingRow } from '../SettingRow';
import { SettingsSaveBar } from '../SettingsSaveBar';
import type { LanguageOption, ThemeOption, UserSettings } from '../../types/userSettings.types';

const THEME_OPTIONS: {
  value: ThemeOption;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: 'Chế độ sáng', description: 'Giao diện sáng, dễ đọc ban ngày', icon: Sun },
  { value: 'dark', label: 'Chế độ tối', description: 'Giảm chói mắt khi dùng ban đêm', icon: Moon },
  { value: 'system', label: 'Theo hệ thống', description: 'Tự động theo thiết bị của bạn', icon: Monitor },
];

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
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Chế độ hiển thị"
        description="Tùy chỉnh giao diện KConnecta theo sở thích của bạn."
      >
        <RadioGroup
          value={settings.theme}
          onValueChange={(value) => updateSettings({ theme: value as ThemeOption })}
          className="gap-2"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = settings.theme === option.value;
            return (
              <label
                key={option.value}
                htmlFor={`theme-${option.value}`}
                className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 transition-colors ${
                  isActive
                    ? 'border-primary/30 bg-accent'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value={option.value} id={`theme-${option.value}`} className="sr-only" />
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                    isActive ? 'bg-primary/15' : 'bg-muted'
                  }`}
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
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    isActive ? 'border-primary bg-primary' : 'border-border'
                  }`}
                />
              </label>
            );
          })}
        </RadioGroup>
      </SettingsSection>

      <SettingsSection
        title="Ngôn ngữ hệ thống"
        description="Chọn ngôn ngữ hiển thị trên giao diện KConnecta."
      >
        <SettingRow label="Ngôn ngữ">
          <Select
            value={settings.language}
            onValueChange={(value) => updateSettings({ language: value as LanguageOption })}
          >
            <SelectTrigger className="w-full rounded-[10px] border-border bg-card sm:min-w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[10px]">
              <SelectItem value="vi">Tiếng Việt</SelectItem>
              <SelectItem value="en" disabled>
                English (sắp có)
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingsSection>

      <SettingsSaveBar isDirty={isDirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
