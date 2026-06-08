import { Search, Shield, MoreHorizontal, UserMinus } from 'lucide-react';
import type { GroupMember } from '../../types/groups.types';

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  className?: string;
}

function UserAvatar({ avatarUrl, name, className = '' }: UserAvatarProps) {
  const initials = name
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'Avatar'}
        className={`rounded-full object-cover ${className}`}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <div className={`rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 ${className}`}>
      {initials}
    </div>
  );
}

interface GroupMembersTabProps {
  members: GroupMember[];
  adminMembers: GroupMember[];
  regularMembers: GroupMember[];
  memberSearch: string;
  onMemberSearchChange: (value: string) => void;
  isAdmin: boolean;
  onInvite: () => void;
  onMemberClick: (userId: string) => void;
  onRemoveMember?: (member: { userId: string; fullName: string }) => void;
}

export function GroupMembersTab({
  members,
  adminMembers,
  regularMembers,
  memberSearch,
  onMemberSearchChange,
  isAdmin,
  onInvite,
  onMemberClick,
  onRemoveMember,
}: GroupMembersTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Thành viên · {members.length}</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={onInvite}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="text-lg leading-none">+</span> Mời thành viên
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thành viên"
            value={memberSearch}
            onChange={e => onMemberSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {adminMembers.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quản trị viên · {adminMembers.length}
          </h3>
          <div className="space-y-1">
            {adminMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onMemberClick(member.userId)}>
                  <UserAvatar avatarUrl={member.avatarUrl} name={member.fullName} className="w-12 h-12" />
                  <div>
                    <div className="font-semibold text-gray-900 text-[15px] group-hover:underline">{member.fullName}</div>
                    <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                      <Shield className="w-3 h-3" /> Quản trị viên
                    </div>
                  </div>
                </div>
                <button type="button" className="p-2 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                  <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Thành viên · {regularMembers.length}
        </h3>
        {regularMembers.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">
            {memberSearch ? 'Không tìm thấy thành viên nào.' : 'Chưa có thành viên nào. Mời bạn bè để bắt đầu.'}
          </p>
        ) : (
          <div className="space-y-1">
            {regularMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onMemberClick(member.userId)}>
                  <UserAvatar avatarUrl={member.avatarUrl} name={member.fullName} className="w-12 h-12" />
                  <div>
                    <div className="font-semibold text-gray-900 text-[15px] group-hover:underline">{member.fullName}</div>
                    <div className="text-xs text-gray-500">Thành viên</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isAdmin && onRemoveMember && (
                    <button
                      type="button"
                      onClick={() => onRemoveMember({ userId: member.userId, fullName: member.fullName })}
                      className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Xóa khỏi nhóm"
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  )}
                  <button type="button" className="p-2 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
