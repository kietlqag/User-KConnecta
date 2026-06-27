import { Calendar, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../home/components';
import { LiveSidebar, LiveOptionCard, ScheduledLiveDetailDialog, ScheduledLiveEventCard } from '../components';
import { liveService, type LiveSessionResponse } from '@/services/liveService';
import { authService } from '@/services/authService';
import { navigateToLiveSession } from '../utils/navigateToLiveSession';
import { toast } from 'sonner';

type LiveListTab = 'live' | 'scheduled';

export default function LiveVideoPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LiveListTab>('live');
  const [activeSessions, setActiveSessions] = useState<LiveSessionResponse[]>([]);
  const [scheduledSessions, setScheduledSessions] = useState<LiveSessionResponse[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(false);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LiveSessionResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const currentUserId = authService.getCurrentUser()?.id;

  const handleGoLive = () => {
    navigate('/live/setup');
  };

  const handleCreateEvent = () => {
    navigate('/live/event');
  };

  const loadScheduledSessions = async () => {
    setIsLoadingScheduled(true);
    try {
      const data = await liveService.listScheduledSessions();
      setScheduledSessions(data.filter((session) => session.status === 'SCHEDULED'));
    } catch (err) {
      setScheduledSessions([]);
      toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách live theo lịch.');
    } finally {
      setIsLoadingScheduled(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadActiveSessions = async () => {
      setIsLoadingActive(true);
      try {
        const data = await liveService.listActiveSessions();
        if (!cancelled) setActiveSessions(data.filter((session) => session.status === 'LIVE'));
      } catch (err) {
        if (!cancelled) {
          setActiveSessions([]);
          toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách live đang phát.');
        }
      } finally {
        if (!cancelled) setIsLoadingActive(false);
      }
    };
    void loadActiveSessions();
    const interval = window.setInterval(() => void loadActiveSessions(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoadingScheduled(true);
      try {
        const data = await liveService.listScheduledSessions();
        if (!cancelled) setScheduledSessions(data.filter((session) => session.status === 'SCHEDULED'));
      } catch (err) {
        if (!cancelled) {
          setScheduledSessions([]);
          toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách live theo lịch.');
        }
      } finally {
        if (!cancelled) setIsLoadingScheduled(false);
      }
    };
    void run();
    const interval = window.setInterval(() => void run(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const isLoading = activeTab === 'live' ? isLoadingActive : isLoadingScheduled;
  const sessions = activeTab === 'live' ? activeSessions : scheduledSessions;

  const handleOpenDetail = (session: LiveSessionResponse) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

  const handleSessionUpdated = (updated: LiveSessionResponse) => {
    setScheduledSessions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedSession(updated);
  };

  const handleSessionDeleted = (sessionId: string) => {
    setScheduledSessions((prev) => prev.filter((item) => item.id !== sessionId));
    setSelectedSession(null);
  };

  const updateScheduledSession = (sessionId: string, patch: Partial<LiveSessionResponse>) => {
    setScheduledSessions((prev) => prev.map((item) => (item.id === sessionId ? { ...item, ...patch } : item)));
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
      updateScheduledSession(session.id, {
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

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <Header />

      <div className="pt-14 flex">
        <LiveSidebar />

        <div className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Chào mừng bạn quay lại!</h1>
              <p className="text-muted-foreground">Chọn cách bạn muốn phát trực tiếp</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LiveOptionCard
                icon={<Video className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />}
                title="Phát trực tiếp"
                description="Phát trực tiếp một mình hoặc cùng với người khác"
                buttonText="Thiết lập phát trực tuyến"
                tone="emerald"
                onClick={handleGoLive}
              />

              <LiveOptionCard
                icon={<Calendar className="h-10 w-10 text-violet-600 dark:text-violet-400" />}
                title="Tạo sự kiện phát trực tiếp"
                description="Tạo trước một sự kiện để chia sẻ với đối tượng"
                buttonText="Tạo sự kiện"
                tone="violet"
                onClick={handleCreateEvent}
              />
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={`font-medium hover:underline ${ activeTab === 'live' ? 'text-green-600' : 'text-muted-foreground' }`}
              >
                Đang phát trực tiếp
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={() => setActiveTab('scheduled')}
                className={`font-medium hover:underline ${ activeTab === 'scheduled' ? 'text-green-600' : 'text-muted-foreground' }`}
              >
                Buổi phát trực tiếp theo lịch
              </button>
            </div>

            <div className="mt-12 bg-card rounded-lg shadow-sm dark:shadow-none p-6">
              <h3 className="font-semibold mb-4">
                {activeTab === 'live' ? 'Đang phát trực tiếp' : 'Buổi phát trực tiếp theo lịch'}
              </h3>
              {isLoading && sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'live'
                    ? 'Chưa có phiên live nào đang phát.'
                    : 'Chưa có buổi live nào được lên lịch.'}
                </p>
              ) : activeTab === 'scheduled' ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {scheduledSessions.map((session) => (
                    <ScheduledLiveEventCard
                      key={session.id}
                      session={session}
                      currentUserId={currentUserId}
                      isSubscribing={subscribingId === session.id}
                      onOpen={handleOpenDetail}
                      onToggleInterest={handleToggleInterest}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {activeSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        void navigateToLiveSession(session, authService.getCurrentUser()?.id, navigate).catch((error) => {
                          toast.error(error instanceof Error ? error.message : 'Không thể mở phiên live');
                        });
                      }}
                      className="rounded-lg border border-border p-4 text-left hover:border-green-400 hover:bg-green-50"
                    >
                      <div className="mb-2 inline-flex rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">LIVE</div>
                      <p className="font-semibold text-foreground">{session.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{session.description || 'Video trực tiếp'}</p>
                      <p className="mt-3 text-xs text-muted-foreground">{session.viewerCount} người đang xem</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ScheduledLiveDetailDialog
        session={selectedSession}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        hideSubscribeButton={Boolean(
          selectedSession && currentUserId && selectedSession.hostUserId !== currentUserId,
        )}
        onUpdated={handleSessionUpdated}
        onDeleted={handleSessionDeleted}
      />
    </div>
  );
}
