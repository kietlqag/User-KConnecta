import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Cake, Loader2, MessageCircle, MoreHorizontal, UserCheck, Users, X } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { UserAvatar } from '@/components/shared';
import { authService } from '@/services/authService';
import { friendService } from '@/services/friendService';
import type { BirthdayFriend } from '../../hooks/useFriendBirthdays';

function getDaysUntilBirthday(birthDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const birth = new Date(birthDate);
  const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  return Math.round((nextBirthday.getTime() - today.getTime()) / 86_400_000);
}

function formatDaysUntilBirthday(birthDate: string): string {
  const days = getDaysUntilBirthday(birthDate);
  if (days === 0) return 'Hôm nay là sinh nhật';
  if (days === 1) return 'Ngày mai là sinh nhật';
  return `${days} ngày nữa là đến sinh nhật`;
}

function useMutualFriendNames(targetUserId: string, enabled: boolean) {
  const currentUserId = authService.getCurrentUser()?.id;

  const myFriendsQuery = useQuery({
    queryKey: ['friends', currentUserId],
    queryFn: () => friendService.getFriends(currentUserId!),
    enabled: enabled && !!currentUserId,
    staleTime: 120_000,
  });

  const theirFriendsQuery = useQuery({
    queryKey: ['friends', targetUserId],
    queryFn: () => friendService.getFriends(targetUserId),
    enabled: enabled && !!targetUserId,
    staleTime: 120_000,
  });

  const mutualNames = useMemo(() => {
    const myFriends = myFriendsQuery.data ?? [];
    const theirFriends = theirFriendsQuery.data ?? [];
    if (myFriends.length === 0 || theirFriends.length === 0) return [];

    const theirIds = new Set(theirFriends.map((f) => f.userId));
    return myFriends
      .filter(
        (f) =>
          theirIds.has(f.userId) &&
          f.userId !== targetUserId &&
          f.userId !== currentUserId,
      )
      .map((f) => f.fullName);
  }, [myFriendsQuery.data, theirFriendsQuery.data, targetUserId, currentUserId]);

  return {
    mutualNames,
    loading: myFriendsQuery.isLoading || theirFriendsQuery.isLoading,
  };
}

function MutualFriendsLine({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  if (names.length === 1) {
    return (
      <>
        1 bạn chung bao gồm <span className="font-semibold">{names[0]}</span>
      </>
    );
  }
  return (
    <>
      {names.length} bạn chung bao gồm <span className="font-semibold">{names[0]}</span> và{' '}
      <span className="font-semibold">{names[1]}</span>
    </>
  );
}

interface BirthdayHoverCardContentProps {
  friend: BirthdayFriend;
  open: boolean;
  onClose: () => void;
}

function BirthdayHoverCardContent({ friend, open, onClose }: BirthdayHoverCardContentProps) {
  const { mutualNames, loading } = useMutualFriendNames(friend.userId, open);

  return (
    <HoverCardContent
      side="bottom"
      align="start"
      sideOffset={8}
      className="w-[min(360px,calc(100vw-2rem))] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative p-4 pb-3">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-3 pr-8">
          <Link to={`/profile/${friend.userId}`} className="shrink-0">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
              <UserAvatar
                name={friend.name}
                avatarUrl={friend.avatar}
                userId={friend.userId}
                rounded="full"
                className="h-full w-full"
                initialsClassName="text-2xl font-bold"
              />
            </div>
          </Link>
          <div className="min-w-0 pt-1">
            <Link
              to={`/profile/${friend.userId}`}
              className="line-clamp-2 text-xl font-bold leading-tight text-gray-900 dark:text-gray-100 hover:underline"
            >
              {friend.name}
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
            <Cake className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>{formatDaysUntilBirthday(friend.birthDate)}</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải bạn chung...
            </div>
          ) : mutualNames.length > 0 ? (
            <div className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>
                <MutualFriendsLine names={mutualNames} />
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 px-4 py-3">
        <span className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-200 dark:bg-gray-700 px-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
          <UserCheck className="h-4 w-4" />
          Bạn bè
        </span>
        <Link
          to={`/messages?with=${friend.userId}`}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Nhắn tin
        </Link>
        <Link
          to={`/profile/${friend.userId}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-300"
          aria-label="Xem trang cá nhân"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Link>
      </div>
    </HoverCardContent>
  );
}

interface BirthdayNameHoverCardProps {
  friend: BirthdayFriend;
  children: React.ReactNode;
}

export function BirthdayNameHoverCard({ friend, children }: BirthdayNameHoverCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={400} closeDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <BirthdayHoverCardContent friend={friend} open={open} onClose={() => setOpen(false)} />
    </HoverCard>
  );
}
