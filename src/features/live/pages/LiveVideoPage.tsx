import { Calendar, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../home/components';
import { LiveSidebar, LiveOptionCard } from '../components';
import { liveService, type LiveSessionResponse } from '@/services/liveService';

export default function LiveVideoPage() {
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState<LiveSessionResponse[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(false);

  const handleGoLive = () => {
    navigate('/live/setup');
  };

  const handleCreateEvent = () => {
    navigate('/live/setup');
  };

  useEffect(() => {
    let cancelled = false;
    const loadActiveSessions = async () => {
      setIsLoadingActive(true);
      try {
        const data = await liveService.listActiveSessions();
        if (!cancelled) setActiveSessions(data);
      } catch {
        if (!cancelled) setActiveSessions([]);
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
                icon={<Video className="w-10 h-10 text-blue-600" />}
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
              <button className="text-blue-600 hover:underline font-medium">Đang phát trực tiếp</button>
              <span className="text-gray-300">•</span>
              <button className="text-blue-600 hover:underline font-medium">Buổi phát trực tiếp theo lịch</button>
            </div>

            <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold mb-4">Đang phát trực tiếp</h3>
              {isLoadingActive && activeSessions.length === 0 ? (
                <p className="text-sm text-gray-600">Đang tải phiên live...</p>
              ) : activeSessions.length === 0 ? (
                <p className="text-sm text-gray-600">Chưa có phiên live nào đang phát.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {activeSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => navigate(`/live/viewer?sessionId=${encodeURIComponent(session.id)}`)}
                      className="rounded-lg border border-gray-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50"
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
    </div>
  );
}
