import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  FileText,
  Globe,
  MapPin,
  MessageSquare,
  Mic,
  MonitorUp,
  MonitorSmartphone,
  Pin,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveDestinationItem } from '@/services/liveService';

const leftMenuItems = [
  { icon: Camera, label: 'Thiết lập buổi phát trực tiếp', active: true },
  { icon: MonitorUp, label: 'Bảng điều khiển' },
  { icon: Settings, label: 'Cài đặt' },
  { icon: Sparkles, label: 'Tương tác' },
  { icon: Bell, label: 'Báo cáo sự cố' },
];

const destinationOptions = [
  {
    id: 'profile',
    label: 'Đăng lên trang cá nhân',
    description: 'Trang cá nhân của bạn',
    icon: <UserRound className="w-4 h-4 text-violet-600" />,
  },
  {
    id: 'page',
    label: 'Đăng lên trang bạn quản lý',
    description: 'Chia sẻ đến trang của bạn',
    icon: <FileText className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'group',
    label: 'Đăng trong nhóm',
    description: 'Chia sẻ trong các nhóm',
    icon: <UsersRound className="w-4 h-4 text-purple-600" />,
  },
] as const;

export default function LiveSetupPage() {
  const navigate = useNavigate();
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<(typeof destinationOptions)[number]['id']>('profile');
  const [selectedPage, setSelectedPage] = useState<LiveDestinationItem | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<LiveDestinationItem | null>(null);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [destinationItems, setDestinationItems] = useState<LiveDestinationItem[]>([]);
  const [isDestinationItemsOpen, setIsDestinationItemsOpen] = useState(false);
  const [isDestinationLoading, setIsDestinationLoading] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [cameraLabel, setCameraLabel] = useState('Đang tải camera...');
  const [micLabel, setMicLabel] = useState('Đang tải microphone...');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedMicId, setSelectedMicId] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isStartingShare, setIsStartingShare] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const selectedDestinationOption = destinationOptions.find((opt) => opt.id === selectedDestination);
  const filteredDestinationItems = useMemo(() => {
    const q = destinationSearch.trim().toLowerCase();
    if (!q) return destinationItems;
    return destinationItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [destinationItems, destinationSearch]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setAvatarUrl(currentUser?.avatarUrl || '');
    setCurrentUserId(currentUser?.id || '');
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    if (selectedDestination === 'profile') {
      setIsDestinationItemsOpen(false);
      return;
    }

    const loadDestinations = async () => {
      setIsDestinationLoading(true);
      try {
        const data = await liveService.getDestinations(currentUserId);
        const nextItems = selectedDestination === 'page' ? data.pages : data.groups;
        setDestinationItems(nextItems);
      } catch {
        setDestinationItems([]);
      } finally {
        setIsDestinationLoading(false);
      }
    };

    void loadDestinations();
  }, [currentUserId, selectedDestination]);

  useEffect(() => {
    let mounted = true;
    let localStream: MediaStream | null = null;

    const loadDevices = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        if (mounted) {
          setMediaError('Trình duyệt không hỗ trợ MediaDevices API');
          setCameraLabel('Không hỗ trợ camera');
          setMicLabel('Không hỗ trợ microphone');
        }
        return;
      }

      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        const firstCamera = videoInputs[0];
        const firstMic = audioInputs[0];

        if (!mounted) return;

        setCameras(videoInputs);
        setMicrophones(audioInputs);
        setSelectedCameraId(firstCamera?.deviceId || '');
        setSelectedMicId(firstMic?.deviceId || '');
        setCameraLabel(firstCamera?.label || 'Camera mặc định');
        setMicLabel(firstMic?.label || 'Microphone mặc định');
        setIsMediaReady(true);
      } catch {
        if (!mounted) return;
        setMediaError('Không thể truy cập camera/microphone. Hãy cấp quyền trong trình duyệt.');
        setCameraLabel('Chưa truy cập được camera');
        setMicLabel('Chưa truy cập được microphone');
        setIsMediaReady(false);
      } finally {
        localStream?.getTracks().forEach((track) => track.stop());
      }
    };

    void loadDevices();

    return () => {
      mounted = false;
      localStream?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const video = previewRef.current;
    if (!video) return;

    if (screenStreamRef.current) {
      video.srcObject = screenStreamRef.current;
      return;
    }

    video.srcObject = null;
  }, [isScreenSharing]);

  const handleShareScreen = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia || isStartingShare) return;

    setIsStartingShare(true);
    setMediaError('');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setIsScreenSharing(false);
        screenStreamRef.current = null;
      });
    } catch {
      setMediaError('Bạn đã hủy chia sẻ màn hình hoặc trình duyệt chặn thao tác này.');
    } finally {
      setIsStartingShare(false);
    }
  };

  const handleSelectCamera = (device: MediaDeviceInfo) => {
    setSelectedCameraId(device.deviceId);
    setCameraLabel(device.label || 'Camera mặc định');
    setIsCameraOpen(false);
  };

  const handleSelectMic = (device: MediaDeviceInfo) => {
    setSelectedMicId(device.deviceId);
    setMicLabel(device.label || 'Microphone mặc định');
    setIsMicOpen(false);
  };

  const isSourceConnected = isMediaReady;
  const isPostDetailsCompleted = postTitle.trim().length >= 5 && postDescription.trim().length >= 10;
  const canGoLive = isSourceConnected && isPostDetailsCompleted;

  const checklist = useMemo(
    () => [
      { label: 'Kết nối nguồn video', done: isSourceConnected },
      { label: 'Hoàn tất chi tiết bài viết', done: isPostDetailsCompleted },
      { label: 'Phát trực tiếp', done: false },
    ],
    [isPostDetailsCompleted, isSourceConnected],
  );

  const completedCount = checklist.filter((item) => item.done).length;
  const progressPercent = (completedCount / checklist.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="pt-14 flex">
        <aside className="w-[340px] shrink-0 border-r border-gray-200 bg-white p-4 h-[calc(100vh-56px)] sticky top-14 overflow-y-auto">
          <div className="mb-5 border-b border-gray-200 pb-4">
            <h1 className="text-2xl leading-tight font-bold text-gray-900 mb-2">Tạo video trực tiếp</h1>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-3 space-y-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm text-gray-900">
                  {item.done ? <CircleCheck className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-500" />}
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2.5">
            <div className="h-11 w-11 overflow-hidden rounded-full bg-gray-200 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="leading-snug">
              <p className="text-base font-bold text-gray-900">Quốc Kiệt</p>
              <p className="text-xs text-gray-700">Người tổ chức - Trang cá nhân của bạn</p>
            </div>
          </div>

          <div className="space-y-3 border-b border-gray-200 pb-4">
            <div className="relative">
              <button
                onClick={() => setIsDestinationOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-left bg-white hover:bg-gray-50"
              >
                <p className="text-sm text-gray-500">Chọn nơi đăng</p>
                <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                  <span>
                    {selectedDestination === 'page' && selectedPage
                      ? selectedPage.name
                      : selectedDestination === 'group' && selectedGroup
                        ? selectedGroup.name
                        : selectedDestinationOption?.label}
                  </span>
                  <ChevronDown className={`w-6 h-6 transition-transform ${isDestinationOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isDestinationOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {destinationOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedDestination(option.id);
                        setIsDestinationOpen(false);
                        setDestinationSearch('');
                        if (option.id === 'profile') {
                          setIsDestinationItemsOpen(false);
                        } else {
                          setIsDestinationItemsOpen(true);
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">{option.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                      {selectedDestination === option.id && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(selectedDestination === 'page' || selectedDestination === 'group') && isDestinationItemsOpen && (
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    value={destinationSearch}
                    onChange={(e) => setDestinationSearch(e.target.value)}
                    placeholder={selectedDestination === 'page' ? 'Tìm trang...' : 'Tìm nhóm...'}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="max-h-48 space-y-1 overflow-auto">
                  {isDestinationLoading && <p className="px-2 py-1 text-sm text-gray-500">Đang tải dữ liệu...</p>}
                  {!isDestinationLoading && filteredDestinationItems.length === 0 && (
                    <p className="px-2 py-1 text-sm text-gray-500">Không có dữ liệu phù hợp.</p>
                  )}
                  {!isDestinationLoading &&
                    filteredDestinationItems.map((item) => {
                      const isSelected = selectedDestination === 'page'
                        ? selectedPage?.id === item.id
                        : selectedGroup?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (selectedDestination === 'page') {
                              setSelectedPage(item);
                            } else {
                              setSelectedGroup(item);
                            }
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                            isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-800'
                          }`}
                        >
                          <p className="font-medium">{item.name}</p>
                          {item.description ? <p className="text-xs text-gray-500">{item.description}</p> : null}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <button className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-left bg-white hover:bg-gray-50">
              <p className="text-sm text-gray-500">Khi nào bạn sẽ phát trực tiếp?</p>
              <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                <span>Bây giờ</span>
                <ChevronDown className="w-6 h-6" />
              </div>
            </button>

            <button className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-base font-medium text-gray-800">
              <Globe className="w-5 h-5" /> Công khai
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {leftMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base font-semibold ${
                    item.active ? 'bg-blue-50 text-gray-900' : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <span
                    className={`h-11 w-11 rounded-full flex items-center justify-center ${
                      item.active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button className="flex-1 rounded-xl bg-gray-200 py-2.5 text-base font-semibold text-gray-900">Quay lại</button>
            <button
              onClick={() => navigate('/live/producer')}
              disabled={!canGoLive}
              className={`flex-1 rounded-xl py-2.5 text-base font-semibold text-white transition-colors ${
                canGoLive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Phát trực tiếp
            </button>
          </div>
          {!canGoLive && (
            <p className="mt-2 text-xs text-amber-700">Hoàn tất chi tiết bài viết trước khi phát trực tiếp.</p>
          )}
        </aside>

        <main className="flex-1 p-6">
          <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">Kiểm soát camera</h2>
                <p className="mb-4 text-base text-gray-700">Trước khi phát trực tiếp, hãy kiểm tra xem đầu vào camera và micrô đã hoạt động đúng cách chưa.</p>

                <div className="space-y-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCameraOpen((prev) => !prev);
                        setIsMicOpen(false);
                      }}
                      className="h-11 w-full flex items-center gap-2.5 overflow-hidden rounded-xl bg-gray-100 px-3"
                    >
                      <Camera className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-medium">{cameraLabel}</span>
                      <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isCameraOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isCameraOpen && cameras.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-md">
                        {cameras.map((camera) => (
                          <button
                            key={camera.deviceId}
                            type="button"
                            onClick={() => handleSelectCamera(camera)}
                            className={`w-full truncate px-3 py-2 text-left text-xs hover:bg-gray-50 ${
                              selectedCameraId === camera.deviceId ? 'bg-blue-50 text-blue-700' : 'text-gray-800'
                            }`}
                          >
                            {camera.label || 'Camera mặc định'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMicOpen((prev) => !prev);
                        setIsCameraOpen(false);
                      }}
                      className="h-11 w-full flex items-center gap-2.5 overflow-hidden rounded-xl bg-gray-100 px-3"
                    >
                      <Mic className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-medium">{micLabel}</span>
                      <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isMicOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isMicOpen && microphones.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-md">
                        {microphones.map((mic) => (
                          <button
                            key={mic.deviceId}
                            type="button"
                            onClick={() => handleSelectMic(mic)}
                            className={`w-full truncate px-3 py-2 text-left text-xs hover:bg-gray-50 ${
                              selectedMicId === mic.deviceId ? 'bg-blue-50 text-blue-700' : 'text-gray-800'
                            }`}
                          >
                            {mic.label || 'Microphone mặc định'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleShareScreen()}
                    disabled={isStartingShare}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-200 py-2.5 text-base font-semibold hover:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <MonitorSmartphone className="w-5 h-5" />
                    {isStartingShare ? 'Đang mở chia sẻ...' : isScreenSharing ? 'Đang chia sẻ màn hình' : 'Chia sẻ màn hình'}
                  </button>
                  {mediaError && <p className="text-sm text-red-600">{mediaError}</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-2xl font-bold">Video</h2>
                <div className="relative h-[300px] rounded-xl bg-black flex items-center justify-center overflow-hidden">
                  {!isScreenSharing && (
                    <>
                      <div className="absolute left-4 top-4 h-8 w-14 rounded bg-gray-400" />
                      <MonitorUp className="w-20 h-20 text-white/85" />
                    </>
                  )}
                  <video ref={previewRef} autoPlay playsInline muted className={`h-full w-full object-cover ${isScreenSharing ? 'block' : 'hidden'}`} />
                </div>
                <button className="mt-4 inline-flex items-center gap-3 text-base font-semibold">
                  <MessageSquare className="w-8 h-8 text-gray-600" /> Nhật ký sự kiện
                </button>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-4 text-2xl font-bold">Thêm chi tiết về bài viết</h2>
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Tiêu đề</label>
                    <input
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-500 outline-none ring-2 ring-transparent focus:border-blue-400 focus:ring-blue-100"
                      placeholder="Nhập tiêu đề buổi phát trực tiếp"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Mô tả</label>
                    <textarea
                      value={postDescription}
                      onChange={(e) => setPostDescription(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-500 outline-none ring-2 ring-transparent focus:border-blue-400 focus:ring-blue-100"
                      placeholder="Mô tả ngắn về nội dung buổi phát trực tiếp"
                    />
                  </div>
                </div>
                <div className="mb-1 border-t border-gray-200 pt-3 flex items-center justify-center gap-16 text-sm">
                  <button className="flex items-center gap-2 text-gray-700"><Users className="w-5 h-5 text-blue-600" /> Gắn thẻ người khác</button>
                  <button className="flex items-center gap-2 text-gray-700"><MapPin className="w-5 h-5 text-blue-600" /> Check in</button>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-2xl font-bold">Bình luận ghim sẵn</h2>
                <p className="text-sm text-gray-700">Bình luận này sẽ tự động được ghim trong đoạn chat của tất cả video trực tiếp mà bạn đăng.</p>
                <div className="my-4 flex items-center justify-between border-y border-gray-200 py-2.5">
                  <p className="text-sm font-semibold">Bật bình luận ghim sẵn</p>
                  <div className="h-7 w-14 rounded-full bg-gray-400 p-1"><div className="h-5 w-5 rounded-full bg-white" /></div>
                </div>
                <p className="mb-3 text-sm font-semibold">Xem trước</p>
                <div className="mb-3 flex items-center gap-2 text-blue-600 text-sm"><Pin className="w-4 h-4" /> Bình luận ghim</div>
                <div className="rounded-2xl bg-gray-100 p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-300 flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <UserRound className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Quốc Kiệt</p>
                      <p className="text-sm text-gray-800">Đây là một bình luận ghim sẵn. Bạn có thể nhấp vào nút Chỉnh sửa bên dưới để thêm bình luận.</p>
                    </div>
                  </div>
                </div>
                <button className="mt-4 w-full rounded-xl bg-gray-200 py-2 text-sm font-semibold text-gray-500">Chỉnh sửa</button>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

