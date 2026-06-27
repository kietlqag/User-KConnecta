import { useNavigate } from 'react-router-dom';
import type { Group } from '../../types/groups.types';
function formatGroupCreatedDate(createdAt?: string): string | null {
  if (!createdAt) return null;
  return new Date(createdAt).toLocaleDateString('vi-VN');
}

interface GroupListCardProps {
  group: Group;
  /** Placeholder avatar style for groups without a cover photo. */
  placeholderVariant?: 'neutral' | 'emerald';
}

export const GroupListCard = ({
  group,
  placeholderVariant = 'neutral',
}: GroupListCardProps) => {
  const navigate = useNavigate();
  const createdDate = formatGroupCreatedDate(group.createdAt);

  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md dark:shadow-none">
      <div className="flex flex-1 gap-3 p-3">
        {group.icon ? (
          <img
            src={group.icon}
            alt={group.name}
            className="h-[72px] w-[72px] shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div
            className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl text-2xl font-bold ${ placeholderVariant === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground' }`}
          >
            {group.name.charAt(0)}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3
            onClick={() => navigate(`/groups/${group.id}`)}
            className="line-clamp-2 cursor-pointer text-[15px] font-semibold leading-tight text-foreground hover:underline"
          >
            {group.name}
          </h3>
          {group.lastActivity && (
            <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
              {group.lastActivity}
            </p>
          )}
          <div className="mt-1.5 space-y-0.5 text-[13px] leading-snug text-muted-foreground">
            {createdDate && <p>Ngày tạo: {createdDate}</p>}
            <p>{group.members.toLocaleString('vi-VN')} thành viên</p>
          </div>
        </div>
      </div>
    </div>
  );
};