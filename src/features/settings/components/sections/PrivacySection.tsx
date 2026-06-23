import { UserX } from 'lucide-react';
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
}

function formatBlockedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
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
}: PrivacySectionProps) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Ai có thể xem hồ sơ của tôi"
        description="Kiểm soát ai được phép xem trang cá nhân và thông tin cơ bản."
      >
        <SettingRow label="Quyền xem hồ sơ">
          <VisibilitySelect
            value={settings.profileVisibility}
            onChange={(profileVisibility) => updateSettings({ profileVisibility })}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Ai có thể xem bài viết của tôi"
        description="Áp dụng mặc định cho các bài viết mới trên bảng feed."
      >
        <SettingRow label="Quyền xem bài viết">
          <VisibilitySelect
            value={settings.postsVisibility}
            onChange={(postsVisibility) => updateSettings({ postsVisibility })}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Danh sách người dùng bị chặn"
        description="Những người bạn đã chặn sẽ không thể xem hồ sơ hoặc liên hệ với bạn."
      >
        {settings.blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center rounded-[12px] border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <UserX className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Chưa chặn ai</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Khi bạn chặn ai đó, họ sẽ xuất hiện trong danh sách này.
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
                    Đã chặn · {formatBlockedDate(user.blockedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSaveBar isDirty={isDirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
