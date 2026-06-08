import type { GroupMember } from '../../types/groups.types';

interface GroupMembersPreviewProps {
  members: GroupMember[];
  onViewAll: () => void;
}

function MemberAvatar({ member }: { member: GroupMember }) {
  const initials = member.fullName
    .trim()
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.fullName}
        className="w-9 h-9 rounded-full object-cover border-2 border-white ring-1 ring-gray-200"
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-blue-500 border-2 border-white ring-1 ring-gray-200 flex items-center justify-center text-white text-xs font-semibold">
      {initials}
    </div>
  );
}

export function GroupMembersPreview({ members, onViewAll }: GroupMembersPreviewProps) {
  const preview = members.slice(0, 6);
  const extra = members.length - preview.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[17px] text-gray-900">Thành viên · {members.length}</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-[13px] font-semibold text-blue-600 hover:underline"
        >
          Xem tất cả
        </button>
      </div>
      <div className="flex items-center -space-x-2">
        {preview.map(m => (
          <MemberAvatar key={m.id} member={m} />
        ))}
        {extra > 0 && (
          <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-white ring-1 ring-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold z-10">
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}
