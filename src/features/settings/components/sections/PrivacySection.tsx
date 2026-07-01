import { vi } from '@/constants/vi';
import { formatVi } from '@/constants/formatVi';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { SettingsSection } from '../SettingsSection';
import { SettingRow } from '../SettingRow';
import { SettingsSaveBar } from '../SettingsSaveBar';
import { VisibilitySelect } from '../VisibilitySelect';
import type { UserSettings } from '../../types/userSettings.types';

interface PrivacySectionProps {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  unblockUser?: (userId: string) => Promise<void>;
}

function formatBlockedDate(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function PrivacySection({
  settings,
  updateSettings,
  isDirty,
  saving,
  onSave,
  onDiscard,
  unblockUser,
}: PrivacySectionProps) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title={vi.settings.privacy.profileTitle}
        description={vi.settings.privacy.profileDesc}
      >
        <SettingRow label={vi.settings.privacy.profileLabel}>
          <VisibilitySelect
            value={settings.profileVisibility}
            onChange={(profileVisibility) => updateSettings({ profileVisibility })}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title={vi.settings.privacy.blockedTitle}
        description={vi.settings.privacy.blockedDesc}
      >
        {settings.blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center rounded-[12px] border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <UserX className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{vi.settings.privacy.blockedEmpty}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {vi.settings.privacy.blockedEmptyDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {settings.blockedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-[10px] border border-border bg-card px-4 py-3"
              >
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  userId={user.id}
                  className="h-10 w-10"
                  rounded="full"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatVi(vi.settings.privacy.blockedAt, {
                      date: formatBlockedDate(user.blockedAt, 'vi'),
                    })}
                  </p>
                </div>
                {unblockUser ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-[10px]"
                    onClick={() => void unblockUser(user.id)}
                  >
                    {vi.settings.privacy.unblock}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSaveBar isDirty={isDirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
