import type { Group } from '../../types/groups.types';
import { GroupPrivacySummary } from './GroupPrivacySummary';

interface GroupAboutCardProps {
  group: Group;
  isAdmin: boolean;
  onEditDescription: () => void;
}

export function GroupAboutCard({ group, isAdmin, onEditDescription }: GroupAboutCardProps) {
  const hasDescription = !!group.description?.trim();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[17px] text-gray-900">Giới thiệu</h3>
        {isAdmin && (
          <button
            type="button"
            onClick={onEditDescription}
            className="text-[13px] font-semibold text-blue-600 hover:underline"
          >
            Chỉnh sửa
          </button>
        )}
      </div>

      {hasDescription ? (
        <p className="text-[15px] text-gray-700 leading-snug whitespace-pre-wrap mb-4">{group.description}</p>
      ) : isAdmin ? (
        <button
          type="button"
          onClick={onEditDescription}
          className="w-full text-left text-[15px] text-gray-500 leading-snug mb-4 p-3 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
        >
          Chưa có mô tả. Thêm vài dòng để người mới hiểu nhóm dành cho ai.
        </button>
      ) : (
        <p className="text-[15px] text-gray-500 leading-snug mb-4">Nhóm chưa có mô tả.</p>
      )}

      <GroupPrivacySummary privacy={group.privacy} />
    </div>
  );
}
