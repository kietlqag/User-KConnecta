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
    <div className={`flex h-full min-h-[210px] flex-col rounded-lg border p-4 transition-colors ${cardTone}`}>
      {/* Top Row: Badges & Interest Button */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${badgeTone}`}>
            Đã lên lịch
          </span>
          {isOwner && (
            <span className="inline-flex rounded bg-card/80 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              Sự kiện của bạn
            </span>
          )}
        </div>

        {showInterest && (
          <button
            type="button"
            disabled={isSubscribing}
            onClick={(e) => {
              e.stopPropagation();
              onToggleInterest?.(session);
            }}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              isSubscribed
                ? 'border border-violet-600 bg-card text-violet-700 hover:bg-violet-50 dark:border-violet-500 dark:bg-transparent dark:text-violet-300 dark:hover:bg-violet-950/40'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isSubscribing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            {isSubscribing ? 'Đang...' : isSubscribed ? 'Đã quan tâm' : 'Quan tâm'}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen(session)}
        className="w-full text-left"
      >
        <p className="line-clamp-1 font-semibold text-foreground">{session.title}</p>
        {session.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{session.description}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {session.scheduledAt
            ? `Bắt đầu lúc ${formatScheduledDisplayFromIso(session.scheduledAt)}`
            : 'Chưa có thời gian'}
        </p>
      </button>

      {!isOwner && (
        <div className="mt-3 flex">
          <Link
            to={`/profile/${session.hostUserId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex max-w-full items-center gap-2 rounded-lg py-1 pr-2 transition-colors hover:bg-card/60"
          >
            <UserAvatar
              name={hostLabel}
              avatarUrl={session.hostAvatarUrl}
              userId={session.hostUserId}
              rounded="full"
              className="h-8 w-8 shrink-0"
            />
            <span className="min-w-0 truncate text-sm text-foreground">
              <span className="text-muted-foreground">Tạo bởi </span>
              <span className="font-semibold text-foreground">{hostLabel}</span>
            </span>
          </Link>
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-black/5 dark:border-white/10">
        <p className="text-xs font-medium text-muted-foreground">
          {(session.subscriptionCount ?? 0) > 0
            ? `${session.subscriptionCount} người quan tâm`
            : 'Chưa có ai quan tâm'}
        </p>
      </div>
    </div>
  );
}
