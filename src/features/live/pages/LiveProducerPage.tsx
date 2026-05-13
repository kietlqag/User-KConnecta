import {
  Activity,
  Bell,
  Camera,
  ChartNoAxesColumn,
  ChevronDown,
  Clapperboard,
  Eye,
  Globe,
  MessageCircle,
  Mic,
  Monitor,
  MoreHorizontal,
  Pencil,
  Settings,
  Share2,
  Sparkles,
  ThumbsUp,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';

type MainSection = 'dashboard' | 'details' | 'settings';
type SettingsSub = 'video' | 'viewer' | 'tab-live';
interface ProducerLocationState {
  selectedCameraId?: string;
  selectedMicId?: string;
}

const rankCamera = (device: MediaDeviceInfo) => {
  const name = (device.label || '').toLowerCase();
  if (name.includes('integrated') || name.includes('built-in') || name.includes('webcam')) return 0;
  if (name.includes('droidcam') || name.includes('iriun') || name.includes('camo') || name.includes('obs')) return 1;
  if (name.includes('virtual')) return 2;
  return 3;
};

function LiveTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatted = useMemo(() => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `00:${mm}:${ss}`;
  }, [seconds]);

  return <span>{formatted}</span>;
}

export default function LiveProducerPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const currentUserName = currentUser?.fullName?.trim() || currentUser?.username || 'Người dùng';
  const currentUserAvatar = currentUser?.avatarUrl || '';
  const location = useLocation();
  const routeState = (location.state as ProducerLocationState | null) ?? null;
  const preferredCameraId = routeState?.selectedCameraId?.trim() || '';
  const preferredMicId = routeState?.selectedMicId?.trim() || '';
  const [mainSection, setMainSection] = useState<MainSection>('dashboard');
  const [settingsSub, setSettingsSub] = useState<SettingsSub>('video');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState(preferredCameraId);
  const [selectedMicId, setSelectedMicId] = useState(preferredMicId);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const miniVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const bindStreamToPreview = useCallback(async (stream: MediaStream) => {
    const bind = async (el: HTMLVideoElement | null) => {
      if (!el) return;
      el.srcObject = stream;
      try {
        await el.play();
      } catch {
        setMediaError('Không thể phát preview video.');
      }
    };
    await Promise.all([bind(mainVideoRef.current), bind(miniVideoRef.current)]);
  }, []);

  useEffect(() => {
    let mounted = true;
    let permissionStream: MediaStream | null = null;
    const init = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        if (mounted) setMediaError('Trình duyệt không hỗ trợ camera/microphone.');
        return;
      }
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices
          .filter((d) => d.kind === 'videoinput')
          .sort((a, b) => rankCamera(a) - rankCamera(b));
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        if (!mounted) return;
        setCameras(videoInputs);
        setMicrophones(audioInputs);
        setSelectedCameraId((prev) => {
          const preferred = prev || preferredCameraId;
          if (preferred && videoInputs.some((d) => d.deviceId === preferred)) return preferred;
          return videoInputs[0]?.deviceId || '';
        });
        setSelectedMicId((prev) => {
          const preferred = prev || preferredMicId;
          if (preferred && audioInputs.some((d) => d.deviceId === preferred)) return preferred;
          return audioInputs[0]?.deviceId || '';
        });
      } catch {
        if (mounted) setMediaError('Không truy cập được camera/microphone. Vui lòng cấp quyền cho trình duyệt.');
      } finally {
        permissionStream?.getTracks().forEach((t) => t.stop());
      }
    };
    void init();
    return () => {
      mounted = false;
      permissionStream?.getTracks().forEach((t) => t.stop());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [preferredCameraId, preferredMicId]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    if (!selectedCameraId && !selectedMicId) return;
    let cancelled = false;
    const applyStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
          audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = stream;
        setIsMediaReady(true);
        setMediaError('');
        await bindStreamToPreview(stream);
      } catch {
        setIsMediaReady(false);
        setMediaError('Không thể mở camera/microphone đã chọn.');
      }
    };
    void applyStream();
    return () => {
      cancelled = true;
    };
  }, [selectedCameraId, selectedMicId, bindStreamToPreview]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    void bindStreamToPreview(localStreamRef.current);
  }, [mainSection, bindStreamToPreview]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="pt-14 flex">
        <aside className="w-[340px] shrink-0 border-r border-gray-200 bg-white h-[calc(100vh-56px)] sticky top-14 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">Bảng điều khiển phát trực tiếp</h2>
            <p className="mt-3 text-sm text-gray-600">
              Hiện tại, khi phát trực tiếp, bạn có thể xem thông tin chi tiết tức thì hoặc thêm công cụ để tăng khả năng phân phối/tương tác.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="w-7 h-7 text-gray-600" />
                )}
              </div>
              <div>
                <p className="text-sm"><span className="font-semibold text-gray-900">{currentUserName}</span> đang phát trực tiếp.</p>
                <p className="text-xs text-gray-500">Vừa xong</p>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <button onClick={() => setMainSection('dashboard')} className={`w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 ${mainSection === 'dashboard' ? 'bg-blue-50 text-gray-900' : 'hover:bg-gray-100 text-gray-900'}`}>
              <span className={`h-10 w-10 rounded-full flex items-center justify-center ${mainSection === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                <Monitor className="w-5 h-5" />
              </span>
              Bảng điều khiển
            </button>

            <button onClick={() => setMainSection('details')} className={`w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 ${mainSection === 'details' ? 'bg-blue-50 text-gray-900' : 'hover:bg-gray-100 text-gray-900'}`}>
              <span className={`h-10 w-10 rounded-full flex items-center justify-center ${mainSection === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                <ChartNoAxesColumn className="w-5 h-5" />
              </span>
              Thông tin chi tiết
            </button>

            <div>
              <button onClick={() => setMainSection('settings')} className={`w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 ${mainSection === 'settings' ? 'bg-blue-50 text-gray-900' : 'hover:bg-gray-100 text-gray-900'}`}>
                <span className={`h-10 w-10 rounded-full flex items-center justify-center ${mainSection === 'settings' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  <Settings className="w-5 h-5" />
                </span>
                Cài đặt
                <ChevronDown className="ml-auto w-5 h-5 text-gray-500" />
              </button>

              {mainSection === 'settings' && (
                <div className="ml-14 mt-1 space-y-1">
                  <button onClick={() => setSettingsSub('video')} className={`block w-full text-left rounded-lg px-3 py-2 font-medium ${settingsSub === 'video' ? 'bg-blue-50 text-gray-900' : 'hover:bg-gray-100 text-gray-700'}`}>Video đang phát</button>
                  <button onClick={() => setSettingsSub('viewer')} className={`block w-full text-left rounded-lg px-3 py-2 font-medium ${settingsSub === 'viewer' ? 'bg-blue-50 text-gray-900' : 'hover:bg-gray-100 text-gray-700'}`}>Người xem</button>
                  <button onClick={() => setSettingsSub('tab-live')} className={`block w-full text-left rounded-lg px-3 py-2 font-medium ${settingsSub === 'tab-live' ? 'bg-blue-50 text-gray-900' : 'hover:bg-gray-100 text-gray-700'}`}>Tab Live</button>
                </div>
              )}
            </div>

            <button className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-gray-100 text-gray-900">
              <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center"><Sparkles className="w-5 h-5" /></span>
              Tương tác
            </button>
            <button className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-gray-100 text-gray-900">
              <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center"><Activity className="w-5 h-5" /></span>
              Phân phối
            </button>
            <button className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-gray-100 text-gray-900">
              <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center"><Bell className="w-5 h-5" /></span>
              Báo cáo sự cố
            </button>
          </div>

          <div className="p-4 mt-2 border-t border-gray-200 sticky bottom-0 bg-white">
            <div className="flex items-center gap-2 text-red-500 font-semibold text-sm mb-3">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <LiveTimer />
            </div>
            <button className="w-full rounded-xl bg-red-600 text-white font-semibold py-2.5 hover:bg-red-700">Kết thúc video trực tiếp</button>
          </div>
        </aside>

        <main className="flex-1 p-6">
          {mainSection === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4 items-start">
              <div className="space-y-4">
                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <div className="relative h-[520px] rounded-xl bg-black overflow-hidden">
                    <video ref={mainVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    <span className="absolute top-4 left-4 rounded-md bg-red-600 text-white text-sm font-semibold px-2 py-1">TRỰC TIẾP</span>
                    {!isMediaReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 px-4 text-center text-sm text-white/80">
                        {mediaError || 'Đang chờ camera/microphone...'}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xl font-semibold flex items-center gap-2"><MessageCircle className="w-6 h-6 text-gray-700" /> Nhật ký sự kiện</div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Hoạt động trong Live</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-100 p-3">
                      <p className="text-sm text-gray-600">Số người đang xem</p>
                      <p className="text-4xl font-bold mt-1">0</p>
                    </div>
                    <div className="rounded-xl bg-gray-100 p-3">
                      <p className="text-sm text-gray-600">Số bình luận hiện tại</p>
                      <p className="text-4xl font-bold mt-1">0</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Thông tin chi tiết</h3>
                    <div className="flex items-center gap-3 text-gray-600">
                      <MoreHorizontal className="w-5 h-5" />
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Eye className="w-5 h-5 text-gray-500 mt-1" />
                      <div>
                        <p className="text-3xl font-bold leading-none">0</p>
                        <p className="text-gray-600">Người xem</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageCircle className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <p className="text-3xl font-bold leading-none">0</p>
                        <p className="text-gray-600">Bình luận</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ThumbsUp className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="text-3xl font-bold leading-none">0</p>
                        <p className="text-gray-600">Cảm xúc</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Share2 className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="text-3xl font-bold leading-none">0</p>
                        <p className="text-gray-600">Lượt chia sẻ</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clapperboard className="w-5 h-5 text-red-500 mt-1" />
                      <div>
                        <p className="text-3xl font-bold leading-none">0</p>
                        <p className="text-gray-600">Clip</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full rounded-xl bg-blue-50 text-blue-700 font-semibold py-2.5">Xem thông tin chi tiết</button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Số liệu về video đang phát</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <svg viewBox="0 0 320 54" className="w-full h-16">
                        <path d="M0,36 C18,12 42,42 68,28 C90,16 114,38 136,24 C164,8 192,34 216,20 C240,8 270,30 320,18" fill="none" stroke="#1877F2" strokeWidth="2.5" />
                      </svg>
                      <p className="text-sm text-gray-600">14.4 Kbps - Tốc độ bit của video</p>
                    </div>
                    <div>
                      <svg viewBox="0 0 320 54" className="w-full h-16">
                        <path d="M0,22 C24,18 44,34 74,26 C100,18 126,38 152,28 C176,20 202,34 226,24 C252,16 278,28 320,20" fill="none" stroke="#1877F2" strokeWidth="2.5" />
                      </svg>
                      <p className="text-sm text-gray-600">30 fps - Tỷ lệ khung hình</p>
                    </div>
                    <div>
                      <svg viewBox="0 0 320 54" className="w-full h-16">
                        <path d="M0,32 C24,10 50,40 78,30 C104,20 126,36 152,26 C178,14 202,34 230,24 C256,16 286,30 320,22" fill="none" stroke="#1877F2" strokeWidth="2.5" />
                      </svg>
                      <p className="text-sm text-gray-600">28 Kbps - Tốc độ bit của âm thanh</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Quản lý trên thiết bị thứ hai</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-gray-700 mb-3">Chia sẻ liên kết của video trực tiếp với người kiểm duyệt. Liên kết này sẽ mở trong Live Producer để dễ dàng truy cập.</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-gray-100 px-4 py-2 truncate">https://www.facebook.com/live/producer/abc</div>
                    <button className="rounded-xl bg-blue-50 text-blue-700 font-semibold px-4 py-2">Sao chép</button>
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 min-h-[520px]">
                  <h3 className="text-2xl font-bold mb-4">Bình luận</h3>
                  <div className="rounded-xl bg-gray-100 p-6 text-center text-gray-500 min-h-[320px] flex flex-col justify-center">
                    <MessageCircle className="w-7 h-7 mx-auto mb-2" />
                    <p className="font-semibold">Chưa có bình luận</p>
                    <p className="text-sm">Bình luận của đối tượng sẽ hiển thị ở đây.</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Chi tiết bài viết</h3>

                  <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-slate-50 to-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {currentUserAvatar ? (
                          <img src={currentUserAvatar} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                          <UserRound className="h-6 w-6 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900 leading-tight">{currentUserName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700">
                            <Globe className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                            Công khai
                          </div>
                          <p className="text-xs text-gray-500">Đang phát trực tiếp</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xl font-semibold text-gray-900 leading-tight">hhhh</p>
                      <p className="mt-1.5 text-lg text-gray-700 leading-tight">hhh</p>
                    </div>
                  </div>

                  <button className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa bài viết
                  </button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Cuộc thăm dò ý kiến</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-lg font-semibold mb-2">Tạo cuộc thăm dò ý kiến</p>
                  <div className="space-y-3">
                    <input className="w-full rounded-xl bg-gray-100 px-4 py-2.5 outline-none" placeholder="Câu hỏi" />
                    <input className="w-full rounded-xl bg-gray-100 px-4 py-2.5 outline-none" placeholder="Lựa chọn" />
                    <input className="w-full rounded-xl bg-gray-100 px-4 py-2.5 outline-none" placeholder="Lựa chọn" />
                    <button className="w-full rounded-xl border border-dashed border-blue-500 text-blue-600 py-2.5 font-medium">Thêm lựa chọn</button>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-gray-200 text-gray-500 py-2.5 font-semibold">Xóa</button>
                      <button className="rounded-xl bg-gray-200 text-gray-500 py-2.5 font-semibold">Lưu</button>
                    </div>
                    <button className="w-full rounded-xl bg-blue-50 text-blue-700 font-semibold py-2.5">Tạo cuộc thăm dò ý kiến</button>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Thông báo</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="rounded-xl bg-gray-50 p-5 min-h-[180px]" />
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Liên kết đáng chú ý</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-gray-700 mb-3">Chưa thiết lập liên kết nào. Hãy nhấp vào nút Thêm ở bên dưới để thiết lập liên kết đáng chú ý.</p>
                  <button className="w-full rounded-xl bg-blue-50 text-blue-700 font-semibold py-2.5">Thêm</button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Liên kết xem trước</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-gray-700 mb-3">Nhấp vào liên kết bên dưới để xem những gì người xem nhìn thấy</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-gray-100 px-4 py-2 truncate">https://www.facebook.com/quoc.kiet/live-preview</div>
                    <button onClick={() => navigate('/live/viewer')} className="rounded-xl bg-blue-50 text-blue-700 font-semibold px-4 py-2">Xem bài viết</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {mainSection === 'details' && (
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-gray-900">Thông tin chi tiết</h2>
              <p className="text-gray-600">Một số thông tin chi tiết có thể hiển thị chậm hơn so với những gì bạn đang thấy.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Số người đang xem</p><p className="text-4xl font-bold mt-2">0</p></div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Số người xem đồng thời cao nhất</p><p className="text-4xl font-bold mt-2">0</p></div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Tổng số bình luận</p><p className="text-4xl font-bold mt-2">0</p></div>
              </div>
            </div>
          )}

          {mainSection === 'settings' && settingsSub === 'video' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="text-2xl font-bold mb-4">Cài đặt phát trực tiếp</h3>
                <p className="font-semibold mb-1">Độ trễ của video trực tiếp</p>
                <p className="text-gray-600 mb-6">Độ trễ video đang phát là khoảng thời gian trễ từ khi camera ghi lại một khoảnh khắc đến khi người xem nhìn thấy khoảnh khắc đó.</p>

                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-3"><p className="font-semibold">Tự động</p><p className="text-gray-600">Chúng tôi sẽ chọn độ trễ phù hợp nhất cho nội dung phát của bạn.</p></div>
                  <div className="border-b border-gray-200 pb-3"><p className="font-semibold">Bình thường</p><p className="text-gray-600">Nên dùng nếu bạn không định tương tác với người xem.</p></div>
                  <div><p className="font-semibold">Độ trễ thấp</p><p className="text-gray-600">Nên dùng nếu bạn muốn tương tác với người xem gần như ngay tức thì.</p></div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="text-2xl font-bold mb-4">Kiểm soát camera</h3>
                <p className="text-gray-600 mb-4">Trước khi phát trực tiếp, hãy kiểm tra xem đầu vào camera và micrô đã hoạt động đúng cách chưa.</p>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Camera</label>
                  <div className="relative">
                    <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm"
                    >
                      {cameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || 'Camera mặc định'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="block text-sm font-semibold text-gray-700">Microphone</label>
                  <div className="relative">
                    <Mic className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <select
                      value={selectedMicId}
                      onChange={(e) => setSelectedMicId(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm"
                    >
                      {microphones.map((mic) => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label || 'Microphone mặc định'}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!!mediaError && <p className="text-sm text-red-600">{mediaError}</p>}
                </div>
              </section>
            </div>
          )}

          {mainSection === 'settings' && settingsSub === 'viewer' && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 max-w-[640px]">
              <h3 className="text-2xl font-bold mb-5">Cài đặt cho người xem</h3>
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-3"><p className="font-semibold">Cho phép người xem tua lại</p><p className="text-gray-600">Người xem có thể tua lại video trực tiếp mà bạn bắt đầu trong Live Producer.</p></div>
                <div className="border-b border-gray-200 pb-3"><p className="font-semibold">Bật chú thích tạo tự động</p><p className="text-gray-600">Chú thích sẽ tự động tạo trong video trực tiếp của bạn.</p></div>
                <div><p className="font-semibold">Cho phép người xem nhắn tin cho bạn</p><p className="text-gray-600">Người xem có thể nhắn tin thẳng cho bạn qua Messenger từ video trực tiếp.</p></div>
              </div>
            </section>
          )}

          {mainSection === 'settings' && settingsSub === 'tab-live' && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 max-w-[760px]">
              <h3 className="text-2xl font-bold mb-2">Truy cập nhanh vào video trực tiếp</h3>
              <p className="text-gray-600 mb-4">Cho người xem biết vị trí để tìm video trực tiếp của bạn.</p>
              <p className="font-semibold mb-2">Hiển thị Tab Live trên Trang</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2"><div className="flex-1 rounded-full bg-gray-100 px-4 py-2 truncate">https://www.facebook.com/quoc.kiet/live_video</div><button className="rounded-xl bg-blue-50 text-blue-700 font-semibold px-4 py-2">Sao chép</button></div>
                <div className="flex items-center gap-2"><div className="flex-1 rounded-full bg-gray-100 px-4 py-2 truncate">https://www.facebook.com/quoc.kiet/videos/14</div><button className="rounded-xl bg-blue-50 text-blue-700 font-semibold px-4 py-2">Sao chép</button></div>
              </div>
            </section>
          )}

          {mainSection !== 'dashboard' && (
            <div className="fixed right-6 bottom-6 w-[280px] h-[150px] rounded-2xl bg-black shadow-xl overflow-hidden">
              <video ref={miniVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <span className="absolute top-3 left-3 rounded-md bg-red-600 text-white text-sm font-semibold px-2 py-1">TRỰC TIẾP</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
