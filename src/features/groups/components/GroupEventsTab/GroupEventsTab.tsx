import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { liveService, type LiveSessionResponse } from '@/services/liveService';
import { authService } from '@/services/authService';
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
    return { label: 'Đã kết thúc', className: 'bg-gray-500 text-white' };
  }
  return { label: session.status, className: 'bg-gray-400 text-white' };
}

export function GroupEventsTab({ groupId }: GroupEventsTabProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LiveSessionResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    liveService.listGroupSessions(groupId)
      .then((data) => {
        if (!cancelled) setSessions(data.filter(shouldShowGroupEvent));
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const handleOpenSession = (session: LiveSessionResponse) => {
    if (session.status === 'SCHEDULED') {
      setSelectedSession(session);
      setDetailOpen(true);
      return;
    }

    void navigateToLiveSession(session, authService.getCurrentUser()?.id, navigate).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể mở sự kiện');
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sessions.map((session) => {
          const badge = statusBadge(session);
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => handleOpenSession(session)}
              className="rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
                {session.status === 'LIVE' && <Radio className="h-3.5 w-3.5 text-red-600" aria-hidden />}
              </div>
              <p className="line-clamp-1 font-semibold text-gray-900 dark:text-gray-100">{session.title}</p>
              {session.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{session.description}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {session.scheduledAt
                  ? session.status === 'SCHEDULED' && isScheduledSessionDue(session.scheduledAt)
                    ? `Đã đến giờ · ${formatScheduledDisplayFromIso(session.scheduledAt)}`
                    : `Bắt đầu lúc ${formatScheduledDisplayFromIso(session.scheduledAt)}`
                  : session.startedAt
                    ? `Đã bắt đầu lúc ${formatScheduledDisplayFromIso(session.startedAt)}`
                    : 'Chưa có thời gian'}
              </p>
              {(session.subscriptionCount ?? 0) > 0 && (
                <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {session.subscriptionCount} người quan tâm
                </p>
              )}
            </button>
          );
        })}
      </div>

      <ScheduledLiveDetailDialog
        session={selectedSession}
        open={detailOpen}
        onOpenChange={setDetailOpen}
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
