import { Bell, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/shared/UserAvatar';
import type { LiveSessionResponse } from '@/services/liveService';
import { formatScheduledDisplayFromIso } from '../../utils/liveFormUtils';

interface ScheduledLiveEventCardProps {
  session: LiveSessionResponse;
  currentUserId?: string;
  isSubscribing?: boolean;
  onOpen: (session: LiveSessionResponse) => void;
  onToggleInterest?: (session: LiveSessionResponse) => void;
}

export function ScheduledLiveEventCard({
  session,
  currentUserId,
  isSubscribing = false,
  onOpen,
  onToggleInterest,
}: ScheduledLiveEventCardProps) {
  const isOwner = Boolean(currentUserId && session.hostUserId === currentUserId);
  const isSubscribed = Boolean(session.subscribedByCurrentUser);
  const showInterest = !isOwner && Boolean(onToggleInterest);
  const hostLabel = session.hostName?.trim() || 'Người dùng';

  const cardTone = isOwner
    ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/20 dark:hover:border-emerald-700'
    : 'border-violet-200 bg-violet-50/60 hover:border-violet-300 hover:bg-violet-50/90 dark:border-violet-800/50 dark:bg-violet-950/25 dark:hover:border-violet-700';

  const badgeTone = isOwner
    ? 'bg-emerald-600 text-white'
    : 'bg-violet-600 text-white';

  return (
    <div className={`rounded-lg border p-4 transition-colors ${cardTone}`}>
      <button
        type="button"
        onClick={() => onOpen(session)}
        className="w-full text-left"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${badgeTone}`}>
            Đã lên lịch
          </span>
          {isOwner && (
            <span className="inline-flex rounded bg-white/80 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              Sự kiện của bạn
            </span>
          )}
        </div>

        <p className="line-clamp-1 font-semibold text-gray-900 dark:text-gray-100">{session.title}</p>
        {session.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{session.description}</p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {session.scheduledAt
            ? `Bắt đầu lúc ${formatScheduledDisplayFromIso(session.scheduledAt)}`
            : 'Chưa có thời gian'}
        </p>
      </button>

      {!isOwner && (
        <Link
          to={`/profile/${session.hostUserId}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg py-1 pr-2 transition-colors hover:bg-white/60 dark:hover:bg-gray-800/60"
        >
          <UserAvatar
            name={hostLabel}
            avatarUrl={session.hostAvatarUrl}
            userId={session.hostUserId}
            rounded="full"
            className="h-8 w-8 shrink-0"
          />
          <span className="min-w-0 truncate text-sm text-gray-700 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">Tạo bởi </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{hostLabel}</span>
          </span>
        </Link>
      )}

      {(showInterest || (session.subscriptionCount ?? 0) > 0) && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/5 pt-3 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {(session.subscriptionCount ?? 0) > 0
              ? `${session.subscriptionCount} người quan tâm`
              : 'Chưa có ai quan tâm'}
          </p>
          {showInterest && (
            <button
              type="button"
              disabled={isSubscribing}
              onClick={(e) => {
                e.stopPropagation();
                onToggleInterest?.(session);
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isSubscribed
                  ? 'border border-violet-600 bg-white text-violet-700 hover:bg-violet-50 dark:border-violet-500 dark:bg-transparent dark:text-violet-300 dark:hover:bg-violet-950/40'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isSubscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {isSubscribing ? 'Đang lưu...' : isSubscribed ? 'Đã quan tâm' : 'Quan tâm'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
