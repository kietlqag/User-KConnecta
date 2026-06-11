import { Calendar, Images, FileText } from 'lucide-react';
import { GroupTabEmptyState } from '../GroupTabEmptyState/GroupTabEmptyState';
interface GroupPlaceholderTabsProps {
  tabId: 'events' | 'media' | 'documents';
  isAdmin?: boolean;
  isApprovedMember?: boolean;
  onCreateEvent?: () => void;
  onPostWithMedia?: () => void;
}

export function GroupPlaceholderTab({
  tabId,
  isAdmin,
  isApprovedMember = false,
  onCreateEvent,
  onPostWithMedia,
}: GroupPlaceholderTabsProps) {
  const comingSoon = 'Tính năng đang được phát triển. Bạn vẫn có thể xem nội dung trong từng bài viết ở Thảo luận.';

  if (tabId === 'events') {
    return (
      <GroupTabEmptyState
        icon={Calendar}
        title="Chưa có sự kiện nào"
        description="Tạo sự kiện để họp mặt, workshop hoặc livestream cùng nhóm."
        actionLabel={isAdmin ? 'Tạo sự kiện' : undefined}
        onAction={isAdmin ? onCreateEvent : undefined}
        secondaryHint={comingSoon}
      />
    );
  }

  if (tabId === 'media') {
    return (
      <GroupTabEmptyState
        icon={Images}
        title="Chưa có ảnh hoặc video"
        description="Ảnh và video đăng trong nhóm sẽ hiển thị tại đây."
        actionLabel={isApprovedMember ? 'Đăng bài có ảnh' : undefined}
        onAction={isApprovedMember ? onPostWithMedia : undefined}
        secondaryHint={comingSoon}
      />
    );
  }

  return (
    <GroupTabEmptyState
      icon={FileText}
      title="Chưa có tài liệu"
      description="File PDF, Word, Excel… đính kèm bài viết sẽ được lưu tại đây."
      secondaryHint={comingSoon}
    />
  );
}
