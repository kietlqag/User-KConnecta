import { Switch } from '@/components/ui/switch';
import { SettingsSection } from '../SettingsSection';
import { SettingRow } from '../SettingRow';
import { SettingsSaveBar } from '../SettingsSaveBar';
import type { UserSettings } from '../../types/userSettings.types';

interface NotificationsSectionProps {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function NotificationsSection({
  settings,
  updateSettings,
  isDirty,
  saving,
  onSave,
  onDiscard,
}: NotificationsSectionProps) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Thông báo trong ứng dụng"
        description="Chọn loại hoạt động bạn muốn nhận thông báo trên KConnecta."
      >
        <SettingRow
          label="Thông báo bài viết"
          description="Bình luận, thích và chia sẻ liên quan đến bài viết của bạn."
        >
          <div className="flex justify-end sm:justify-start">
            <Switch
              checked={settings.notifyPosts}
              onCheckedChange={(notifyPosts) => updateSettings({ notifyPosts })}
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Thông báo tin nhắn"
          description="Tin nhắn mới và cuộc gọi từ Messenger."
        >
          <div className="flex justify-end sm:justify-start">
            <Switch
              checked={settings.notifyMessages}
              onCheckedChange={(notifyMessages) => updateSettings({ notifyMessages })}
            />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Thông báo qua email"
        description="Nhận email tóm tắt hoạt động quan trọng trên tài khoản."
      >
        <SettingRow
          label="Bật thông báo email"
          description="Gửi email khi có hoạt động quan trọng hoặc cập nhật bảo mật."
        >
          <div className="flex justify-end sm:justify-start">
            <Switch
              checked={settings.notifyEmail}
              onCheckedChange={(notifyEmail) => updateSettings({ notifyEmail })}
            />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSaveBar isDirty={isDirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
