import type { Group } from '../../types/groups.types';
import { GroupPrivacySummary } from './GroupPrivacySummary';

interface GroupAboutCardProps {
  group: Group;
  isAdmin: boolean;
  onEditDescription: () => void;
}

export function GroupAboutCard({ group, isAdmin, onEditDescription }: GroupAboutCardProps) {
  const description = group.description?.trim() ?? '';
  const hasDescription =
    description.length > 0 && description.toLowerCase() !== group.name.trim().toLowerCase();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[17px] text-gray-900 dark:text-gray-100">Giới thiệu</h3>
        {isAdmin && (
          <button
            type="button"
            onClick={onEditDescription}
            className="text-[13px] font-semibold text-emerald-600 hover:underline"
          >
            Chỉnh sửa
          </button>
        )}
      </div>

      {hasDescription ? (
        <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-snug whitespace-pre-wrap mb-4">{description}</p>
      ) : isAdmin ? (
        <button
          type="button"
          onClick={onEditDescription}
          className="w-full text-left text-[15px] text-gray-500 dark:text-gray-400 leading-snug mb-4 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
        >
          Chưa có mô tả. Thêm vài dòng để người mới hiểu nhóm dành cho ai.
        </button>
      ) : (
        <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-snug mb-4">Nhóm chưa có mô tả.</p>
      )}

      <GroupPrivacySummary privacy={group.privacy} />
    </div>
  );
}
