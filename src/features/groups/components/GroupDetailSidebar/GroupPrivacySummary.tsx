import { Globe2, Lock } from 'lucide-react';
import type { Group } from '../../types/groups.types';

interface GroupPrivacySummaryProps {
  privacy: Group['privacy'];
}

export function GroupPrivacySummary({ privacy }: GroupPrivacySummaryProps) {
  const isPublic = privacy === 'public';

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">
        {isPublic ? (
          <Globe2 className="w-5 h-5 text-gray-900" />
        ) : (
          <Lock className="w-5 h-5 text-gray-900" />
        )}
      </div>
      <div>
        <div className="font-semibold text-gray-900 text-[15px]">
          {isPublic ? 'Nhóm công khai' : 'Nhóm riêng tư'}
        </div>
        <div className="text-[15px] text-gray-500 leading-snug">
          {isPublic
            ? 'Ai cũng có thể xem nhóm và tham gia (tùy cài đặt bài viết).'
            : 'Chỉ thành viên xem danh sách thành viên và bài đăng.'}
        </div>
      </div>
    </div>
  );
}
