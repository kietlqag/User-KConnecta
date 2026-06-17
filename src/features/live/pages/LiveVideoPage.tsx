import { Calendar, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../home/components';
import { LiveSidebar, LiveOptionCard, ScheduledLiveDetailDialog } from '../components';
import { liveService, type LiveSessionResponse } from '@/services/liveService';
import { authService } from '@/services/authService';
import { navigateToLiveSession } from '../utils/navigateToLiveSession';
import { formatScheduledDisplayFromIso } from '../utils/liveFormUtils';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-14 flex">
        <LiveSidebar />

        <div className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Chào mừng bạn quay lại!</h1>
              <p className="text-gray-600">Chọn cách bạn muốn phát trực tiếp</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LiveOptionCard
                icon={<Video className="w-10 h-10 text-green-600" />}
                title="Phát trực tiếp"
                description="Phát trực tiếp một mình hoặc cùng với người khác"
                buttonText="Thiết lập phát trực tuyến"
                buttonVariant="primary"
                onClick={handleGoLive}
              />

              <LiveOptionCard
                icon={<Calendar className="w-10 h-10 text-gray-600" />}
                title="Tạo sự kiện phát trực tiếp"
                description="Tạo trước một sự kiện để chia sẻ với đối tượng"
                buttonText="Tạo sự kiện"
                buttonVariant="secondary"
                onClick={handleCreateEvent}
              />
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={`font-medium hover:underline ${
                  activeTab === 'live' ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                Đang phát trực tiếp
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={() => setActiveTab('scheduled')}
                className={`font-medium hover:underline ${
                  activeTab === 'scheduled' ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                Buổi phát trực tiếp theo lịch
              </button>
            </div>

            <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold mb-4">
                {activeTab === 'live' ? 'Đang phát trực tiếp' : 'Buổi phát trực tiếp theo lịch'}
              </h3>
              {isLoading && sessions.length === 0 ? (
                <p className="text-sm text-gray-600">Đang tải...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {activeTab === 'live'
                    ? 'Chưa có phiên live nào đang phát.'
                    : 'Chưa có buổi live nào được lên lịch.'}
                </p>
              ) : activeTab === 'scheduled' ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {scheduledSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleOpenDetail(session)}
                      className="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                    >
                      <div className="mb-2 inline-flex rounded bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                        Đã lên lịch
                      </div>
                      <p className="font-semibold text-gray-900 line-clamp-1">{session.title}</p>
                      {session.description && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{session.description}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        {session.scheduledAt
                          ? `Bắt đầu lúc ${formatScheduledDisplayFromIso(session.scheduledAt)}`
                          : 'Chưa có thời gian'}
                      </p>
                      {(session.subscriptionCount ?? 0) > 0 && (
                        <p className="mt-1 text-xs font-semibold text-green-700">
                          {session.subscriptionCount} người quan tâm
                        </p>
                      )}
                    </button>
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
                      className="rounded-lg border border-gray-200 p-4 text-left hover:border-green-400 hover:bg-green-50"
                    >
                      <div className="mb-2 inline-flex rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">LIVE</div>
                      <p className="font-semibold text-gray-900">{session.title}</p>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{session.description || 'Video trực tiếp'}</p>
                      <p className="mt-3 text-xs text-gray-500">{session.viewerCount} người đang xem</p>
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
        onUpdated={handleSessionUpdated}
        onDeleted={handleSessionDeleted}
      />
    </div>
  );
}
