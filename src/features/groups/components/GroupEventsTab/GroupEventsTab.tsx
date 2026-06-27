import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Calendar, Loader2, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { liveService, type LiveSessionResponse } from '@/services/liveService';
import { authService } from '@/services/authService';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ScheduledLiveDetailDialog } from '@/features/live/components';
import { navigateToLiveSession } from '@/features/live/utils/navigateToLiveSession';
import { formatScheduledDisplayFromIso, isScheduledSessionDue, shouldShowGroupEvent } from '@/features/live/utils/liveFormUtils';
import { GroupTabEmptyState } from '../GroupTabEmptyState/GroupTabEmptyState';

interface GroupEventsTabProps {
  groupId: string;
}

function statusBadge(session: LiveSessionResponse) {
  if (session.status === 'LIVE') {
    return { label: 'Đang phát', className: 'bg-red-600 text-white' };
  }
  if (session.status === 'SCHEDULED') {
    if (isScheduledSessionDue(session.scheduledAt)) {
      return { label: 'Đến giờ phát', className: 'bg-amber-600 text-white' };
    }
    return { label: 'Đã lên lịch', className: 'bg-emerald-600 text-white' };
  }
  if (session.status === 'ENDED') {
    return { label: 'Đã kết thúc', className: 'bg-muted0 text-white' };
  }
  return { label: session.status, className: 'bg-gray-400 text-white' };
}

function EventInterestButton({
  session,
  loading,
  onToggle,
}: {
  session: LiveSessionResponse;
  loading: boolean;
  onToggle: () => void;
}) {
  const isSubscribed = Boolean(session.subscribedByCurrentUser);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${ isSubscribed ? 'border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-emerald-600 text-white hover:bg-emerald-700' } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {loading ? 'Đang lưu...' : isSubscribed ? 'Đã quan tâm' : 'Quan tâm'}
    </button>
  );
}

export function GroupEventsTab({ groupId }: GroupEventsTabProps) {
  const navigate = useNavigate();
  const currentUserId = authService.getCurrentUser()?.id;
  const [sessions, setSessions] = useState<LiveSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LiveSessionResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    liveService.listGroupSessions(groupId)
      .then((data) => {
        if (!cancelled) setSessions(data.filter(shouldShowGroupEvent));
      })
      .catch((err) => {
        if (!cancelled) {
          setSessions([]);
          toast.error(err instanceof Error ? err.message : 'Không thể tải sự kiện nhóm');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const updateSession = (sessionId: string, patch: Partial<LiveSessionResponse>) => {
    setSessions((prev) => prev.map((item) => (item.id === sessionId ? { ...item, ...patch } : item)));
    setSelectedSession((prev) => (prev?.id === sessionId ? { ...prev, ...patch } : prev));
  };

  const handleToggleInterest = async (session: LiveSessionResponse) => {
    if (!currentUserId) {
      toast.error('Bạn cần đăng nhập để quan tâm sự kiện');
      return;
    }
    if (session.hostUserId === currentUserId) return;

    setSubscribingId(session.id);
    try {
      const isSubscribed = Boolean(session.subscribedByCurrentUser);
      const result = isSubscribed
        ? await liveService.unsubscribeFromEvent(session.id)
        : await liveService.subscribeToEvent(session.id);
      updateSession(session.id, {
        subscribedByCurrentUser: result.subscribed,
        subscriptionCount: result.subscriptionCount,
      });
      toast.success(result.subscribed ? 'Đã quan tâm sự kiện' : 'Đã bỏ quan tâm');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật quan tâm');
    } finally {
      setSubscribingId(null);
    }
  };

  const handleOpenSession = (session: LiveSessionResponse) => {
    if (session.status === 'SCHEDULED') {
      setSelectedSession(session);
      setDetailOpen(true);
      return;
    }

    void navigateToLiveSession(session, currentUserId, navigate).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể mở sự kiện');
    });
  };

  const canShowInterest = (session: LiveSessionResponse) =>
    session.status === 'SCHEDULED' && session.hostUserId !== currentUserId;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <GroupTabEmptyState
        icon={Calendar}
        title="Chưa có sự kiện nào"
        description="Các sự kiện live được tạo khi bạn lên lịch phát trực tiếp và chọn đăng trong nhóm này sẽ hiển thị tại đây."
      />
    );
  }

  return (
    <>
      <div className={`grid gap-3 ${sessions.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {sessions.map((session) => {
          const badge = statusBadge(session);
          const showInterest = canShowInterest(session);

          return (
            <div
              key={session.id}
              className="rounded-lg border border-border bg-card"
            >
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => handleOpenSession(session)}
                  className="w-full text-left transition-colors hover:opacity-90"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                    {session.status === 'LIVE' && <Radio className="h-3.5 w-3.5 text-red-600" aria-hidden />}
                  </div>
                  <p className="line-clamp-1 font-semibold text-foreground">{session.title}</p>
                  {session.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{session.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {session.scheduledAt
                      ? session.status === 'SCHEDULED' && isScheduledSessionDue(session.scheduledAt)
                        ? `Đã đến giờ · ${formatScheduledDisplayFromIso(session.scheduledAt)}`
                        : `Bắt đầu lúc ${formatScheduledDisplayFromIso(session.scheduledAt)}`
                      : session.startedAt
                        ? `Đã bắt đầu lúc ${formatScheduledDisplayFromIso(session.startedAt)}`
                        : 'Chưa có thời gian'}
                  </p>
                </button>

                <Link
                  to={`/profile/${session.hostUserId}`}
                  className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg py-1 pr-2 transition-colors hover:bg-muted/60"
                >
                  <UserAvatar
                    name={session.hostName || 'Người tạo'}
                    avatarUrl={session.hostAvatarUrl}
                    userId={session.hostUserId}
                    rounded="full"
                    className="h-8 w-8 shrink-0"
                  />
                  <span className="min-w-0 truncate text-sm text-foreground">
                    <span className="text-muted-foreground">Tạo bởi </span>
                    <span className="font-semibold text-foreground">
                      {session.hostName || 'Người dùng'}
                    </span>
                  </span>
                </Link>
              </div>

              {(showInterest || (session.subscriptionCount ?? 0) > 0) && (
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {(session.subscriptionCount ?? 0) > 0
                      ? `${session.subscriptionCount} người quan tâm`
                      : 'Chưa có ai quan tâm'}
                  </p>
                  {showInterest && (
                    <EventInterestButton
                      session={session}
                      loading={subscribingId === session.id}
                      onToggle={() => void handleToggleInterest(session)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ScheduledLiveDetailDialog
        session={selectedSession}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        hideSubscribeButton
        onUpdated={(updated) => {
          setSessions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          setSelectedSession(updated);
        }}
        onDeleted={(sessionId) => {
          setSessions((prev) => prev.filter((item) => item.id !== sessionId));
          setSelectedSession(null);
          setDetailOpen(false);
        }}
      />
    </>
  );
}
