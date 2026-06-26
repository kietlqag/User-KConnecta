import { Images } from 'lucide-react';
import { GroupTabEmptyState } from '../GroupTabEmptyState/GroupTabEmptyState';

interface GroupPlaceholderTabsProps {
  isApprovedMember?: boolean;
  onPostWithMedia?: () => void;
}

export function GroupPlaceholderTab({
  isApprovedMember = false,
  onPostWithMedia,
}: GroupPlaceholderTabsProps) {
  const comingSoon = 'Tính năng đang được phát triển. Bạn vẫn có thể xem nội dung trong từng bài viết trong mục Bài viết.';

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
