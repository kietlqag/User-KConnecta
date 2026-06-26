import { Edit3 } from 'lucide-react';
import { GroupPrivacySummary } from '../GroupDetailSidebar/GroupPrivacySummary';
import type { Group } from '../../types/groups.types';

interface GroupDescriptionTabProps {
  description: string | null;
  privacy: Group['privacy'];
  memberCount: number;
  isAdmin: boolean;
  onEditDescription: () => void;
}

export function GroupDescriptionTab({
  description,
  privacy,
  memberCount,
  isAdmin,
  onEditDescription,
}: GroupDescriptionTabProps) {
  const trimmed = description?.trim() ?? '';

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mô tả</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={onEditDescription}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              {trimmed ? 'Chỉnh sửa' : 'Thêm mô tả'}
            </button>
          )}
        </div>
        {trimmed ? (
          <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {trimmed}
          </p>
        ) : (
          <p className="text-[15px] text-gray-500 dark:text-gray-400">
            {isAdmin
              ? 'Thêm mô tả để thành viên mới hiểu mục đích và quy tắc của nhóm.'
              : 'Nhóm chưa có mô tả.'}
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Giới thiệu</h3>
        <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-4">
          {privacy === 'public'
            ? 'Người lạ có thể thấy nội dung nhóm của bạn.'
            : 'Chỉ thành viên mới xem được nội dung nhóm này.'}
        </p>
        <GroupPrivacySummary privacy={privacy} />
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            {memberCount} thành viên
          </span>
        </div>
      </div>
    </div>
  );
}
