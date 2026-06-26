import { Search, Shield, UserMinus } from 'lucide-react';
import { UserAvatar } from '@/components/shared';
import type { GroupMember } from '../../types/groups.types';

function formatJoinedAt(joinedAt: string): string {  const date = new Date(joinedAt);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return 'Tham gia hôm nay';
  if (days === 0) return 'Tham gia hôm nay';
  if (days === 1) return 'Tham gia hôm qua';
  if (days < 30) return `Tham gia ${days} ngày trước`;
  return `Tham gia ${date.toLocaleDateString('vi-VN')}`;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Thành viên · {members.length}</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={onInvite}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
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
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:bg-gray-800 transition-all"
          />
        </div>
      </div>

      {adminMembers.length > 0 && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="mb-3 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            Quản trị viên · {adminMembers.length}
          </h3>
          <div className="space-y-1">
            {adminMembers.map(member => (
              <div key={member.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onMemberClick(member.userId)}>
                  <UserAvatar avatarUrl={member.avatarUrl} name={member.fullName} userId={member.userId} rounded="full" className="w-12 h-12 shrink-0" initialsClassName="text-sm font-semibold" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-[15px] group-hover:underline">{member.fullName}</div>
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Shield className="w-3 h-3" /> Quản trị viên
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatJoinedAt(member.joinedAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="mb-3 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
          Thành viên · {regularMembers.length}
        </h3>
        {regularMembers.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">
            {memberSearch ? 'Không tìm thấy thành viên nào.' : 'Chưa có thành viên nào. Mời bạn bè để bắt đầu.'}
          </p>
        ) : (
          <div className="space-y-1">
            {regularMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onMemberClick(member.userId)}>
                  <UserAvatar avatarUrl={member.avatarUrl} name={member.fullName} userId={member.userId} rounded="full" className="w-12 h-12 shrink-0" initialsClassName="text-sm font-semibold" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-[15px] group-hover:underline">{member.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Thành viên · {formatJoinedAt(member.joinedAt)}</div>                  </div>
                </div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
