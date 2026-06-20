import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  FileText,
  Globe,
  Lock,
  LocateFixed,
  Lightbulb,
  MapPin,
  MessageSquare,
  Mic,
  MonitorUp,
  MonitorSmartphone,
  Pin,
  Search,
  Settings,
  UserRound,
  Users,
  Users2,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveDestinationItem } from '@/services/liveService';
import { friendService, type FriendApiResponse } from '@/services/friendService';
import { locationService, type Province, type Ward } from '@/services/locationService';
import { postService, type CheckInSuggestionResponse } from '@/services/postService';

const leftMenuItems = [
  { icon: Camera, label: 'Thiết lập buổi phát trực tiếp', active: true },
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

const privacyOptions = [
  { id: 'PUBLIC', label: 'Công khai', description: 'Mọi người đều có thể xem', icon: Globe },
  { id: 'FRIENDS', label: 'Bạn bè', description: 'Chỉ bạn bè của bạn có thể xem', icon: Users2 },
  { id: 'FRIENDS_EXCEPT', label: 'Bạn bè ngoại trừ...', description: 'Ẩn với một số người bạn chọn', icon: Users2 },
  { id: 'ONLY_ME', label: 'Chỉ mình tôi', description: 'Chỉ bạn mới có thể xem', icon: Lock },
] as const;

export default function LiveSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('flow') === 'event') {
      navigate('/live/event', { replace: true });
    }
  }, [navigate, searchParams]);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<(typeof destinationOptions)[number]['id']>('profile');
  const [selectedPages, setSelectedPages] = useState<LiveDestinationItem[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<LiveDestinationItem[]>([]);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [pageItems, setPageItems] = useState<LiveDestinationItem[]>([]);
  const [groupItems, setGroupItems] = useState<LiveDestinationItem[]>([]);
  const [isDestinationItemsOpen, setIsDestinationItemsOpen] = useState(false);
  const [isDestinationLoading, setIsDestinationLoading] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [selectedPrivacy, setSelectedPrivacy] = useState<(typeof privacyOptions)[number]['id']>('PUBLIC');
  const [isExceptEditorOpen, setIsExceptEditorOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [friends, setFriends] = useState<FriendApiResponse[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [excludedFriendIds, setExcludedFriendIds] = useState<string[]>([]);
  const [pendingExcludedFriendIds, setPendingExcludedFriendIds] = useState<string[]>([]);
  const [isTagPeopleOpen, setIsTagPeopleOpen] = useState(false);
  const [tagFriendSearch, setTagFriendSearch] = useState('');
  const [taggedFriendIds, setTaggedFriendIds] = useState<string[]>([]);
  const [pendingTaggedFriendIds, setPendingTaggedFriendIds] = useState<string[]>([]);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInDetailDraft, setCheckInDetailDraft] = useState('');
  const [checkInDetail, setCheckInDetail] = useState('');
  const [checkInLocation, setCheckInLocation] = useState('');
  const [checkInProvinces, setCheckInProvinces] = useState<Province[]>([]);
  const [checkInWards, setCheckInWards] = useState<Ward[]>([]);
  const [selectedCheckInProvince, setSelectedCheckInProvince] = useState<Province | null>(null);
  const [selectedCheckInWard, setSelectedCheckInWard] = useState<Ward | null>(null);
  const [isCheckInLocationLoading, setIsCheckInLocationLoading] = useState(false);
  const [isDetectingCheckInLocation, setIsDetectingCheckInLocation] = useState(false);
  const [isSuggestingCheckIn, setIsSuggestingCheckIn] = useState(false);
  const [checkInError, setCheckInError] = useState('');
  const [checkInSuggestions, setCheckInSuggestions] = useState<CheckInSuggestionResponse[]>([]);
  const [selectedCheckInSuggestion, setSelectedCheckInSuggestion] = useState('');
  const [isCheckInSuggestionsOpen, setIsCheckInSuggestionsOpen] = useState(false);
  const [checkInSuggestionSearch, setCheckInSuggestionSearch] = useState('');
  const [pinnedEnabled, setPinnedEnabled] = useState(false);
  const [pinnedCommentText, setPinnedCommentText] = useState('Đây là một bình luận ghim sẵn. Bạn có thể nhấp vào nút Chỉnh sửa bên dưới để thêm bình luận.');
  const [isPinnedLoading, setIsPinnedLoading] = useState(false);
  const [isPinnedEditMode, setIsPinnedEditMode] = useState(false);
  const [pinnedDraftText, setPinnedDraftText] = useState('');
  const [pinnedError, setPinnedError] = useState('');
  const [isCreatingLivePost, setIsCreatingLivePost] = useState(false);
  const [createLiveError, setCreateLiveError] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [cameraLabel, setCameraLabel] = useState('Đang tải camera...');
  const [micLabel, setMicLabel] = useState('Đang tải microphone...');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [cameraSignals, setCameraSignals] = useState<Record<string, 'unknown' | 'checking' | 'live' | 'no-signal'>>({});
  const [cameraSignalReason, setCameraSignalReason] = useState<Record<string, string>>({});
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedMicId, setSelectedMicId] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [micLevels, setMicLevels] = useState<Record<string, number>>({});
  const [micProbeStatus, setMicProbeStatus] = useState<Record<string, 'idle' | 'checking' | 'ok' | 'error'>>({});
  const [mediaError, setMediaError] = useState('');
  const [mediaHint, setMediaHint] = useState('');
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isLocalPreviewReady, setIsLocalPreviewReady] = useState(false);
  const [hasVideoFrame, setHasVideoFrame] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isStartingShare, setIsStartingShare] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('Người dùng');
  const [cameraLabelMinWidth, setCameraLabelMinWidth] = useState(0);
  const [micLabelMinWidth, setMicLabelMinWidth] = useState(0);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraSignalsRef = useRef<Record<string, 'unknown' | 'checking' | 'live' | 'no-signal'>>({});
  const cameraSignalReasonRef = useRef<Record<string, string>>({});
  const micProbeTokenRef = useRef(0);
  const selectedDestinationOption = destinationOptions.find((opt) => opt.id === selectedDestination);
  const selectedPrivacyOption = privacyOptions.find((opt) => opt.id === selectedPrivacy) ?? privacyOptions[0];
  const hasPageItems = pageItems.length > 0;
  const hasGroupItems = groupItems.length > 0;
  const destinationItems = selectedDestination === 'page' ? pageItems : groupItems;
  const filteredDestinationItems = useMemo(() => {
    const q = destinationSearch.trim().toLowerCase();
    if (!q) return destinationItems;
    return destinationItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [destinationItems, destinationSearch]);
  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => (friend.fullName || friend.username).toLowerCase().includes(q));
  }, [friends, friendSearch]);
  const filteredTagFriends = useMemo(() => {
    const q = tagFriendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => (friend.fullName || friend.username).toLowerCase().includes(q));
  }, [friends, tagFriendSearch]);
  const orderedTagFriends = useMemo(() => {
    if (filteredTagFriends.length === 0) return filteredTagFriends;
    // Keep ordering stable while user is ticking in current session.
    // Only prioritize already-saved tags when reopening.
    const selectedIds = new Set(taggedFriendIds);
    const selected: FriendApiResponse[] = [];
    const unselected: FriendApiResponse[] = [];
    for (const friend of filteredTagFriends) {
      if (selectedIds.has(friend.userId)) {
        selected.push(friend);
      } else {
        unselected.push(friend);
      }
    }
    return [...selected, ...unselected];
  }, [filteredTagFriends, taggedFriendIds]);
  const taggedFriends = useMemo(
    () => friends.filter((friend) => taggedFriendIds.includes(friend.userId)),
    [friends, taggedFriendIds],
  );
  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();
  const filteredCheckInSuggestions = useMemo(() => {
    const q = normalizeText(checkInSuggestionSearch);
    if (!q) return checkInSuggestions;
    return checkInSuggestions.filter((item) => normalizeText(item.locationText).includes(q));
  }, [checkInSuggestions, checkInSuggestionSearch]);

  const findBestProvinceMatch = (rawProvince: string, provinceList: Province[]) => {
    const target = normalizeText(rawProvince).replace(/^tinh\s+|^thanh pho\s+/g, '');
    return (
      provinceList.find((province) => normalizeText(province.name).includes(target)) ??
      provinceList.find((province) => target.includes(normalizeText(province.name).replace(/^tinh\s+|^thanh pho\s+/g, ''))) ??
      null
    );
  };

  const findBestWardMatch = (wardList: Ward[], candidates: string[]) => {
    const normalizedCandidates = candidates
      .map((candidate) => normalizeText(candidate))
      .filter((candidate) => candidate.length > 0);

    for (const candidate of normalizedCandidates) {
      const exact = wardList.find((ward) => normalizeText(ward.name) === candidate);
      if (exact) return exact;
    }

    for (const candidate of normalizedCandidates) {
      const partial = wardList.find((ward) => normalizeText(ward.name).includes(candidate));
      if (partial) return partial;
    }

    return null;
  };

  const composeCheckInLocation = (detailText: string, ward: Ward | null, province: Province | null) => {
    const parts = [detailText.trim(), ward?.name ?? '', province?.name ?? ''].filter((part) => part.trim().length > 0);
    return parts.join(', ');
  };

  const stopMicProbe = () => {
    micProbeTokenRef.current += 1;
  };

  const rankCamera = (device: MediaDeviceInfo) => {
    const name = (device.label || '').toLowerCase();
    if (name.includes('integrated') || name.includes('built-in') || name.includes('webcam')) return 0;
    if (name.includes('droidcam') || name.includes('iriun') || name.includes('camo') || name.includes('obs')) return 1;
    if (name.includes('virtual')) return 2;
    return 3;
  };

  const setSignalWithReason = (
    deviceId: string,
    status: 'unknown' | 'checking' | 'live' | 'no-signal',
    reason = '',
  ) => {
    setCameraSignals((prev) => {
      const next = { ...prev, [deviceId]: status };
      cameraSignalsRef.current = next;
      return next;
    });
    setCameraSignalReason((prev) => {
      const next = { ...prev, [deviceId]: reason };
      cameraSignalReasonRef.current = next;
      return next;
    });
  };

  const estimateFrameLuma = (video: HTMLVideoElement) => {
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return 0;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.min(160, video.videoWidth));
    canvas.height = Math.max(1, Math.min(90, video.videoHeight));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    const step = 16; // sample every 4th pixel (rgba stride)
    for (let i = 0; i < data.length; i += step) {
      // Relative luminance approximation
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    const sampleCount = Math.max(1, data.length / step);
    return sum / sampleCount;
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const measureMicLevelByDevice = async (deviceId: string, token: number): Promise<{ level: number; ok: boolean }> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { deviceId: { exact: deviceId } },
      });

      const WindowWithWebkit = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextCtor = window.AudioContext || WindowWithWebkit.webkitAudioContext;
      if (!AudioContextCtor) {
        stream.getTracks().forEach((track) => track.stop());
        return { level: 0, ok: false };
      }

      const ctx = new AudioContextCtor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => undefined);
      }

      const data = new Uint8Array(analyser.fftSize);
      let peak = 0;
      const startedAt = performance.now();

      while (performance.now() - startedAt < 420) {
        if (micProbeTokenRef.current !== token) break;
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i += 1) {
          const normalized = (data[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        const level = Math.min(100, Math.round(rms * 240));
        peak = Math.max(peak, level);
        await wait(33);
      }

      source.disconnect();
      analyser.disconnect();
      await ctx.close().catch(() => undefined);
      stream.getTracks().forEach((track) => track.stop());
      return { level: peak, ok: true };
    } catch {
      return { level: 0, ok: false };
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const measureMaxWidth = (labels: string[]) => {
      if (labels.length === 0) return 0;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      ctx.font = '500 14px sans-serif';
      return Math.ceil(Math.max(...labels.map((label) => ctx.measureText(label).width)));
    };

    const cameraLabels = cameras.map((device) => device.label || 'Camera mặc định');
    const micLabels = microphones.map((device) => device.label || 'Microphone mặc định');
    setCameraLabelMinWidth(measureMaxWidth(cameraLabels));
    setMicLabelMinWidth(measureMaxWidth(micLabels));
  }, [cameras, microphones]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setAvatarUrl(currentUser?.avatarUrl || '');
    setCurrentUserId(currentUser?.id || '');
    setCurrentUserName(currentUser?.fullName?.trim() || currentUser?.username || 'Người dùng');
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const loadDestinations = async () => {
      setIsDestinationLoading(true);
      try {
        const data = await liveService.getDestinations(currentUserId);
        setPageItems(data.pages ?? []);
        setGroupItems(data.groups ?? []);
      } catch {
        setPageItems([]);
        setGroupItems([]);
      } finally {
        setIsDestinationLoading(false);
      }
    };

    void loadDestinations();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const loadPinnedComment = async () => {
      setIsPinnedLoading(true);
      setPinnedError('');
      try {
        const data = await liveService.getPinnedComment(currentUserId);
        setPinnedEnabled(data.enabled);
        const nextText = data.commentText?.trim()
          ? data.commentText
          : 'Đây là một bình luận ghim sẵn. Bạn có thể nhấp vào nút Chỉnh sửa bên dưới để thêm bình luận.';
        setPinnedCommentText(nextText);
      } catch {
        setPinnedError('Không thể tải cài đặt bình luận ghim.');
      } finally {
        setIsPinnedLoading(false);
      }
    };
    void loadPinnedComment();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const loadFriends = async () => {
      setIsFriendsLoading(true);
      try {
        const data = await friendService.getFriends(currentUserId);
        setFriends(data);
      } catch {
        setFriends([]);
      } finally {
        setIsFriendsLoading(false);
      }
    };
    void loadFriends();
  }, [currentUserId]);

  useEffect(() => {
    if (!isCheckInOpen || checkInProvinces.length > 0) return;
    const loadProvinces = async () => {
      setIsCheckInLocationLoading(true);
      setCheckInError('');
      try {
        const data = await locationService.getProvinces();
        setCheckInProvinces(data);
      } catch (err) {
        setCheckInError(err instanceof Error ? err.message : 'Không tải được danh sách tỉnh/thành phố');
      } finally {
        setIsCheckInLocationLoading(false);
      }
    };
    void loadProvinces();
  }, [isCheckInOpen, checkInProvinces.length]);

  useEffect(() => {
    if (selectedDestination === 'profile') {
      setIsDestinationItemsOpen(false);
      return;
    }
    if (selectedDestination === 'page' && !hasPageItems) {
      setSelectedDestination('profile');
      setIsDestinationItemsOpen(false);
      return;
    }
    if (selectedDestination === 'group' && !hasGroupItems) {
      setSelectedDestination('profile');
      setIsDestinationItemsOpen(false);
      return;
    }
    setIsDestinationItemsOpen(true);
  }, [selectedDestination, hasPageItems, hasGroupItems]);

  useEffect(() => {
    let mounted = true;
    let permissionStream: MediaStream | null = null;

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
        permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices
          .filter((d) => d.kind === 'videoinput')
          .sort((a, b) => rankCamera(a) - rankCamera(b));
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        const firstCamera = videoInputs[0];
        const firstMic = audioInputs[0];

        if (!mounted) return;

        setCameras(videoInputs);
        const initialSignals = Object.fromEntries(videoInputs.map((camera) => [camera.deviceId, 'unknown' as const]));
        const initialReasons = Object.fromEntries(videoInputs.map((camera) => [camera.deviceId, '']));
        cameraSignalsRef.current = initialSignals;
        cameraSignalReasonRef.current = initialReasons;
        setCameraSignals(initialSignals);
        setCameraSignalReason(initialReasons);
        setMicrophones(audioInputs);
        setSelectedCameraId(firstCamera?.deviceId || '');
        setSelectedMicId(firstMic?.deviceId || '');
        setCameraLabel(firstCamera?.label || 'Camera mặc định');
        setMicLabel(firstMic?.label || 'Microphone mặc định');
      } catch {
        if (!mounted) return;
        setMediaError('Không thể truy cập camera/microphone. Hãy cấp quyền trong trình duyệt.');
        setCameraLabel('Chưa truy cập được camera');
        setMicLabel('Chưa truy cập được microphone');
        setIsMediaReady(false);
      } finally {
        permissionStream?.getTracks().forEach((track) => track.stop());
      }
    };

    void loadDevices();

    return () => {
      mounted = false;
      permissionStream?.getTracks().forEach((track) => track.stop());
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      stopMicProbe();
    };
  }, []);

  useEffect(() => {
    if (!isCameraOpen || cameras.length === 0 || !navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;

    const probe = async (camera: MediaDeviceInfo) => {
      setSignalWithReason(camera.deviceId, 'checking', 'Đang kiểm tra luồng hình...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: camera.deviceId } },
          audio: false,
        });

        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;

        const hasSignal = await new Promise<boolean>((resolve) => {
          const ok = () => resolve(true);
          video.onloadeddata = ok;
          video.oncanplay = ok;
          setTimeout(() => resolve(false), 1200);
          void video.play().catch(() => resolve(false));
        });

        stream.getTracks().forEach((track) => track.stop());

        if (!cancelled) {
          if (!hasSignal) {
            setSignalWithReason(
              camera.deviceId,
              'no-signal',
              'Không lấy được frame từ camera. Thiết bị có thể đang bị app khác chiếm dụng hoặc chưa được cấp quyền.',
            );
          } else {
            setSignalWithReason(camera.deviceId, 'live', 'Đã nhận hình ảnh bình thường.');
          }
        }
      } catch {
        if (!cancelled) {
          setSignalWithReason(
            camera.deviceId,
            'no-signal',
            'Không thể mở camera này. Có thể thiếu quyền hoặc thiết bị đang bị app khác sử dụng.',
          );
        }
      }
    };

    const run = async () => {
      for (const camera of cameras) {
        if (cancelled) break;
        await probe(camera);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isCameraOpen, cameras]);

  useEffect(() => {
    if (!isMicOpen || microphones.length === 0 || !navigator.mediaDevices?.getUserMedia) return;

    const token = micProbeTokenRef.current + 1;
    micProbeTokenRef.current = token;
    setMicProbeStatus(Object.fromEntries(microphones.map((mic) => [mic.deviceId, 'idle'])));
    setMicLevels((prev) => ({
      ...Object.fromEntries(microphones.map((mic) => [mic.deviceId, 0])),
      ...prev,
    }));

    const runProbeLoop = async () => {
      while (micProbeTokenRef.current === token) {
        setMicProbeStatus((prev) => ({
          ...prev,
          ...Object.fromEntries(microphones.map((mic) => [mic.deviceId, 'checking' as const])),
        }));

        const results = await Promise.all(
          microphones.map(async (mic) => ({
            deviceId: mic.deviceId,
            ...(await measureMicLevelByDevice(mic.deviceId, token)),
          })),
        );

        if (micProbeTokenRef.current !== token) return;

        setMicLevels((prev) => {
          const next = { ...prev };
          for (const result of results) {
            next[result.deviceId] = Math.round((prev[result.deviceId] ?? 0) * 0.45 + result.level * 0.55);
          }
          return next;
        });

        setMicProbeStatus((prev) => {
          const next = { ...prev };
          for (const result of results) {
            next[result.deviceId] = result.ok ? 'ok' : 'error';
          }
          return next;
        });

        await wait(250);
      }
    };

    void runProbeLoop();

    return () => {
      if (micProbeTokenRef.current === token) {
        micProbeTokenRef.current += 1;
      }
    };
  }, [isMicOpen, microphones]);

  useEffect(() => {
    if (!selectedCameraId && !selectedMicId) return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;

    const applySelectedDevices = async () => {
      setIsSwitchingCamera(true);
      setMediaHint('');
      const tryGetStream = async (constraints: MediaStreamConstraints) => {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          return null;
        }
      };

      try {
        const clearPreviewToBlack = () => {
          localStreamRef.current?.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
          const videoEl = previewRef.current;
          if (videoEl && !screenStreamRef.current) {
            videoEl.srcObject = null;
          }
          setHasVideoFrame(false);
          setIsMediaReady(false);
          setIsLocalPreviewReady(false);
        };

        const hasExplicitCameraSelection = Boolean(selectedCameraId);
        const explicitVideoConstraints = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true;

        // If user selected a specific camera, never fallback to another camera.
        let videoStream = await tryGetStream({
          video: explicitVideoConstraints,
          audio: false,
        });
        if (!videoStream && !hasExplicitCameraSelection) {
          videoStream = await tryGetStream({ video: true, audio: false });
        }

        if (!videoStream) {
          clearPreviewToBlack();
          setMediaError(hasExplicitCameraSelection ? 'Không thể mở camera đã chọn.' : 'Không thể mở camera.');
          setMediaHint(
            hasExplicitCameraSelection
              ? cameraSignalReasonRef.current[selectedCameraId] ||
                  'Camera đã chọn không có tín hiệu hoặc đang bị ứng dụng khác chiếm dụng.'
              : 'Không thể lấy tín hiệu camera. Vui lòng kiểm tra quyền truy cập.',
          );
          setIsSwitchingCamera(false);
          return;
        }

        // Request audio separately; it's optional for preview.
        const audioStream =
          (await tryGetStream({
            video: false,
            audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
          })) ??
          (await tryGetStream({ video: false, audio: true }));

        const stream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...(audioStream ? audioStream.getAudioTracks() : []),
        ]);

        if (cancelled) {
          videoStream.getTracks().forEach((track) => track.stop());
          audioStream?.getTracks().forEach((track) => track.stop());
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        const videoTrackLive = videoTrack ? videoTrack.readyState === 'live' : false;
        setIsMediaReady(videoTrackLive || stream.getAudioTracks().length > 0);
        setIsLocalPreviewReady(videoTrackLive);
        setMediaError(videoTrackLive ? '' : 'Camera đã kết nối nhưng chưa xuất hình.');

        // Bind stream immediately to avoid waiting for effect/state timing.
        const videoEl = previewRef.current;
        if (videoEl && !screenStreamRef.current) {
          setHasVideoFrame(false);
          videoEl.srcObject = stream;
          try {
            await videoEl.play();
          } catch {
            setMediaError('Không thể phát preview camera.');
          }
        }

        // Wait shortly for frame; if still black, keep selection and show stable hint.
        window.setTimeout(() => {
          if (cancelled) return;
          const videoEl = previewRef.current;
          const hasRenderableFrame = Boolean(videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0);
          if (hasRenderableFrame) {
            const luma = videoEl ? estimateFrameLuma(videoEl) : 0;
            if (luma < 6) {
              setMediaHint(
                cameraSignalReasonRef.current[selectedCameraId] ||
                  'Camera đã trả tín hiệu nhưng khung hình đang đen. Hãy kiểm tra nguồn camera.',
              );
              setIsSwitchingCamera(false);
              return;
            }
            setIsSwitchingCamera(false);
            setMediaHint('');
            return;
          }
          setMediaHint(
            cameraSignalReasonRef.current[selectedCameraId] ||
              'Camera đã chọn chưa có tín hiệu. Hãy mở app virtual camera trên điện thoại hoặc chọn camera khác.',
          );
          setIsSwitchingCamera(false);
        }, 1500);
      } catch {
        if (cancelled) return;
        stopMicProbe();
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        const videoEl = previewRef.current;
        if (videoEl && !screenStreamRef.current) {
          videoEl.srcObject = null;
        }
        setHasVideoFrame(false);
        setIsMediaReady(false);
        setIsLocalPreviewReady(false);
        setMediaError(selectedCameraId ? 'Không thể mở camera đã chọn.' : 'Không thể áp dụng camera/microphone đã chọn.');
        setMediaHint(
          selectedCameraId
            ? cameraSignalReasonRef.current[selectedCameraId] ||
                'Camera đã chọn không có tín hiệu hoặc đang bị ứng dụng khác chiếm dụng.'
            : 'Vui lòng kiểm tra quyền truy cập hoặc đổi thiết bị khác.',
        );
        setIsSwitchingCamera(false);
      }
    };

    void applySelectedDevices();

    return () => {
      cancelled = true;
    };
  }, [selectedCameraId, selectedMicId]);

  useEffect(() => {
    const video = previewRef.current;
    if (!video) return;

    let cancelled = false;
    const tryPlay = async () => {
      try {
        await video.play();
      } catch {
        if (!cancelled) {
          setMediaError('Không thể phát preview camera. Hãy kiểm tra quyền camera hoặc thiết bị đang bị ứng dụng khác chiếm dụng.');
        }
      }
    };

    const nextStream = screenStreamRef.current ?? localStreamRef.current;
    if (video.srcObject !== nextStream) {
      video.srcObject = nextStream;
      setHasVideoFrame(false);
      void tryPlay();
    }

    return () => {
      cancelled = true;
    };
  }, [isScreenSharing, isLocalPreviewReady]);

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

  const handleCheckInProvinceChange = async (provinceCode: string) => {
    const province = checkInProvinces.find((item) => item.code === provinceCode) ?? null;
    setSelectedCheckInProvince(province);
    setSelectedCheckInWard(null);
    setCheckInWards([]);
    setSelectedCheckInSuggestion('');
    setCheckInError('');

    if (!province) return;

    setIsCheckInLocationLoading(true);
    try {
      const provinceWards = await locationService.getWardsByProvinceCode(province.code);
      setCheckInWards(provinceWards);
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : 'Không tải được danh sách xã/phường');
    } finally {
      setIsCheckInLocationLoading(false);
    }
  };

  const detectCurrentCheckInLocation = async (): Promise<{ ok: boolean; province: Province | null; ward: Ward | null }> => {
    if (!navigator.geolocation) {
      setCheckInError('Trình duyệt không hỗ trợ lấy vị trí hiện tại');
      return { ok: false, province: null, ward: null };
    }

    setIsDetectingCheckInLocation(true);
    setCheckInError('');

    return new Promise<{ ok: boolean; province: Province | null; ward: Ward | null }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const { data } = await axios.get<{
              address?: {
                city?: string;
                state?: string;
                town?: string;
                village?: string;
                suburb?: string;
                quarter?: string;
                road?: string;
                house_number?: string;
              };
            }>(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=vi`);

            const provinceName = data.address?.state || data.address?.city || data.address?.town || '';
            const wardCandidates = [data.address?.suburb || '', data.address?.quarter || '', data.address?.village || ''].filter(Boolean);
            const detailCandidate = [data.address?.house_number || '', data.address?.road || ''].filter(Boolean).join(' ').trim();

            let provinceList = checkInProvinces;
            if (provinceList.length === 0) {
              provinceList = await locationService.getProvinces();
              setCheckInProvinces(provinceList);
            }

            const matchedProvince = provinceName ? findBestProvinceMatch(provinceName, provinceList) : null;
            if (matchedProvince) {
              setSelectedCheckInProvince(matchedProvince);
              const provinceWards = await locationService.getWardsByProvinceCode(matchedProvince.code);
              setCheckInWards(provinceWards);

              const matchedWard = findBestWardMatch(provinceWards, wardCandidates);
              setSelectedCheckInWard(matchedWard);
              if (detailCandidate) {
                setCheckInDetailDraft(detailCandidate);
              }
              resolve({ ok: true, province: matchedProvince, ward: matchedWard });
            } else {
              setSelectedCheckInProvince(null);
              setSelectedCheckInWard(null);
              setCheckInWards([]);
              if (detailCandidate) {
                setCheckInDetailDraft(detailCandidate);
              }
              resolve({ ok: true, province: null, ward: null });
            }
          } catch (err) {
            setCheckInError(err instanceof Error ? err.message : 'Không lấy được vị trí hiện tại');
            resolve({ ok: false, province: null, ward: null });
          } finally {
            setIsDetectingCheckInLocation(false);
          }
        },
        () => {
          setIsDetectingCheckInLocation(false);
          setCheckInError('Không thể truy cập vị trí. Hãy cấp quyền vị trí cho trình duyệt');
          resolve({ ok: false, province: null, ward: null });
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  const handleGetCurrentCheckInLocation = () => {
    void detectCurrentCheckInLocation();
  };

  const handleSuggestCheckInLocations = async () => {
    if (isSuggestingCheckIn) return;
    setIsCheckInSuggestionsOpen(true);
    setCheckInSuggestionSearch('');
    setCheckInError('');
    setCheckInSuggestions([]);
    setSelectedCheckInSuggestion('');
    setIsSuggestingCheckIn(true);
    try {
      let province = selectedCheckInProvince;
      let ward = selectedCheckInWard;
      if (!province) {
        const detected = await detectCurrentCheckInLocation();
        if (detected.ok) {
          province = detected.province;
          ward = detected.ward;
        }
      }

      const suggestions = await postService.getCheckInSuggestions({
        currentUserId: currentUserId || undefined,
        province: province?.name || undefined,
        ward: ward?.name || undefined,
      });
      setCheckInSuggestions(suggestions);
    } catch {
      setCheckInError('Không tải được gợi ý vị trí check in');
    } finally {
      setIsSuggestingCheckIn(false);
    }
  };

  const savePinnedComment = async (enabled: boolean, commentText: string) => {
    if (!currentUserId) return false;
    setPinnedError('');
    setIsPinnedLoading(true);
    try {
      const data = await liveService.upsertPinnedComment({
        userId: currentUserId,
        enabled,
        commentText,
      });
      setPinnedEnabled(data.enabled);
      setPinnedCommentText(
        data.commentText?.trim()
          ? data.commentText
          : 'Đây là một bình luận ghim sẵn. Bạn có thể nhấp vào nút Chỉnh sửa bên dưới để thêm bình luận.',
      );
      return true;
    } catch {
      setPinnedError('Không thể lưu bình luận ghim. Vui lòng thử lại.');
      return false;
    } finally {
      setIsPinnedLoading(false);
    }
  };

  const mapPrivacyToPostApi = (): 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE' => {
    if (selectedPrivacy === 'ONLY_ME') return 'PRIVATE';
    return selectedPrivacy;
  };

  const handleGoLive = async () => {
    if (!canGoLive || isCreatingLivePost || !currentUserId) return;
    setCreateLiveError('');
    setIsCreatingLivePost(true);
    try {
      const started = await liveService.startLive({
        userId: currentUserId,
        groupId: selectedDestination === 'group' ? selectedGroups[0]?.id : undefined,
        pageId: selectedDestination === 'page' ? selectedPages[0]?.id : undefined,
        title: postTitle.trim(),
        description: postDescription.trim(),
        privacy: mapPrivacyToPostApi(),
        startMode: 'NOW',
        ...(checkInLocation.trim() ? { locationText: checkInLocation.trim() } : {}),
        ...(selectedPrivacy === 'FRIENDS_EXCEPT' && excludedFriendIds.length > 0
          ? { excludedUserIds: excludedFriendIds }
          : {}),
        ...(taggedFriendIds.length > 0 ? { taggedUserIds: taggedFriendIds } : {}),
      });

      const producerState = {
        postId: started.postId,
        sessionId: started.sessionId,
        roomName: started.roomName,
        livekitUrl: started.livekitUrl,
        hostToken: started.hostToken,
        title: postTitle.trim(),
        description: postDescription.trim(),
        taggedUserIds: taggedFriendIds,
        locationText: checkInLocation.trim() || null,
        selectedCameraId,
        selectedMicId,
        videoSourceMode: isScreenSharing ? 'screen' as const : 'camera' as const,
      };

      window.sessionStorage.setItem('kconnecta.liveProducerState', JSON.stringify(producerState));
      navigate('/live/producer', { state: producerState });
    } catch (err) {
      setCreateLiveError(err instanceof Error ? err.message : 'Không thể khởi tạo phiên live. Vui lòng thử lại.');
    } finally {
      setIsCreatingLivePost(false);
    }
  };

  const isSourceConnected = isMediaReady && hasVideoFrame;
  const isPostDetailsCompleted = postTitle.trim().length >= 5 && postDescription.trim().length >= 10;
  const isDestinationSelectionValid =
    selectedDestination === 'profile' ||
    (selectedDestination === 'page' && selectedPages.length > 0) ||
    (selectedDestination === 'group' && selectedGroups.length > 0);
  const canGoLive = isSourceConnected && isPostDetailsCompleted && isDestinationSelectionValid;

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
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      <Header />

      <div className="pt-14 flex">
        <aside className="sticky top-14 flex h-[calc(100vh-56px)] w-[340px] shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-5 border-b border-gray-200 dark:border-gray-700 pb-4">
            <h1 className="text-2xl leading-tight font-bold text-gray-900 dark:text-gray-100 mb-2">Tạo video trực tiếp</h1>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-green-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-3 space-y-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm text-gray-900 dark:text-gray-100">
                  {item.done ? <CircleCheck className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2.5">
            <div className="h-11 w-11 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <div className="leading-snug">
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">{currentUserName}</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">Người tổ chức - Trang cá nhân của bạn</p>
            </div>
          </div>

          <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="relative">
              <button
                onClick={() => setIsDestinationOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">Chọn nơi đăng</p>
                <div className="flex items-center justify-between text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span>
                    {selectedDestination === 'page' && selectedPages.length > 0
                      ? `${selectedPages.length} trang đã chọn`
                      : selectedDestination === 'group' && selectedGroups.length > 0
                        ? `${selectedGroups.length} nhóm đã chọn`
                        : selectedDestinationOption?.label}
                  </span>
                  <ChevronDown className={`w-6 h-6 transition-transform ${isDestinationOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isDestinationOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm dark:shadow-none overflow-hidden">
                  {destinationOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        const optionUnavailable =
                          (option.id === 'page' && !hasPageItems) ||
                          (option.id === 'group' && !hasGroupItems);
                        if (optionUnavailable) return;

                        setSelectedDestination(option.id);
                        setIsDestinationOpen(false);
                        setDestinationSearch('');
                      }}
                      disabled={
                        (option.id === 'page' && !hasPageItems) ||
                        (option.id === 'group' && !hasGroupItems)
                      }
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">{option.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{option.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(option.id === 'page' && !hasPageItems) || (option.id === 'group' && !hasGroupItems)
                            ? 'Chưa có dữ liệu để chọn'
                            : option.description}
                        </p>
                      </div>
                      {selectedDestination === option.id && <Check className="w-4 h-4 text-green-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(selectedDestination === 'page' || selectedDestination === 'group') && isDestinationItemsOpen && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    value={destinationSearch}
                    onChange={(e) => setDestinationSearch(e.target.value)}
                    placeholder={selectedDestination === 'page' ? 'Tìm trang...' : 'Tìm nhóm...'}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="max-h-48 space-y-1 overflow-auto">
                  {isDestinationLoading && <p className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</p>}
                  {!isDestinationLoading && filteredDestinationItems.length === 0 && (
                    <p className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">Không có dữ liệu phù hợp.</p>
                  )}
                  {!isDestinationLoading &&
                    filteredDestinationItems.map((item) => {
                      const isSelected = selectedDestination === 'page'
                        ? selectedPages.some((page) => page.id === item.id)
                        : selectedGroups.some((group) => group.id === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (selectedDestination === 'page') {
                              setSelectedPages((prev) =>
                                prev.some((page) => page.id === item.id)
                                  ? prev.filter((page) => page.id !== item.id)
                                  : [...prev, item],
                              );
                            } else {
                              setSelectedGroups((prev) =>
                                prev.some((group) => group.id === item.id)
                                  ? prev.filter((group) => group.id !== item.id)
                                  : [...prev, item],
                              );
                            }
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm flex items-start gap-2 ${
                            isSelected ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {(selectedDestination === 'group' || selectedDestination === 'page') && (
                            <span
                              className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border ${
                                isSelected ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                              }`}
                            >
                              {isSelected ? <Check className="h-3 w-3" /> : null}
                            </span>
                          )}
                          <span className="block">
                            <p className="font-medium">{item.name}</p>
                            {item.description ? <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p> : null}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">Quyền riêng tư</p>
                <div className="flex items-center justify-between text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="inline-flex items-center gap-2">
                    <selectedPrivacyOption.icon className="w-5 h-5" />
                    {selectedPrivacy === 'FRIENDS_EXCEPT'
                      ? `${selectedPrivacyOption.label} (${excludedFriendIds.length})`
                      : selectedPrivacyOption.label}
                  </span>
                  <ChevronDown className={`w-6 h-6 transition-transform ${isPrivacyOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isPrivacyOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm dark:shadow-none overflow-hidden">
                  {privacyOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedPrivacy(option.id);
                          setIsPrivacyOpen(false);
                          if (option.id === 'FRIENDS_EXCEPT') {
                            setPendingExcludedFriendIds(excludedFriendIds);
                            setIsExceptEditorOpen(true);
                          } else {
                            setIsExceptEditorOpen(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                      >
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{option.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                        </div>
                        {selectedPrivacy === option.id && <Check className="w-4 h-4 text-green-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedPrivacy === 'FRIENDS_EXCEPT' && isExceptEditorOpen && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    placeholder="Tìm bạn bè..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>
                <div className="max-h-44 space-y-1 overflow-auto">
                  {isFriendsLoading && <p className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">Đang tải bạn bè...</p>}
                  {!isFriendsLoading && filteredFriends.length === 0 && (
                    <p className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">Không có bạn bè phù hợp.</p>
                  )}
                  {!isFriendsLoading &&
                    filteredFriends.map((friend) => {
                      const isChecked = pendingExcludedFriendIds.includes(friend.userId);
                      return (
                        <button
                          key={friend.userId}
                          type="button"
                          onClick={() =>
                            setPendingExcludedFriendIds((prev) =>
                              prev.includes(friend.userId)
                                ? prev.filter((id) => id !== friend.userId)
                                : [...prev, friend.userId],
                            )
                          }
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2 ${
                            isChecked ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                              isChecked ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                          >
                            {isChecked ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="truncate">{friend.fullName || friend.username}</span>
                        </button>
                      );
                    })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingExcludedFriendIds(excludedFriendIds);
                      setIsExceptEditorOpen(false);
                    }}
                    className="flex-1 rounded-lg bg-gray-200 dark:bg-gray-700 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExcludedFriendIds(pendingExcludedFriendIds);
                      setIsExceptEditorOpen(false);
                    }}
                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white"
                  >
                    Luu
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {leftMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base font-semibold ${
                    item.active ? 'bg-green-50 text-gray-900 dark:text-gray-100' : 'hover:bg-muted text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <span
                    className={`h-11 w-11 rounded-full flex items-center justify-center ${
                      item.active ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/live/video')}
              className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 py-2.5 text-base font-semibold text-gray-900 dark:text-gray-100"
            >
              Quay lại
            </button>
            <button
              onClick={() => void handleGoLive()}
              disabled={!canGoLive || isCreatingLivePost}
              className={`flex-1 rounded-xl py-2.5 text-base font-semibold text-white transition-colors ${
                canGoLive && !isCreatingLivePost ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isCreatingLivePost ? 'Đang lưu...' : 'Phát trực tiếp'}
            </button>
          </div>
          {createLiveError && <p className="mt-2 text-xs text-red-600">{createLiveError}</p>}
          </div>
        </aside>

        <main className="flex-1 p-6">
          <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">Kiểm soát camera</h2>
                <p className="mb-4 text-base text-gray-700 dark:text-gray-300">Trước khi phát trực tiếp, hãy kiểm tra xem đầu vào camera và micrô đã hoạt động đúng cách chưa.</p>

                <div className="space-y-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCameraOpen((prev) => !prev);
                        setIsMicOpen(false);
                      }}
                      className="h-11 w-full flex items-center gap-2.5 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900 px-3"
                    >
                      <Camera className="w-5 h-5 text-green-600 shrink-0" />
                      <span
                        className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-medium"
                        style={cameraLabelMinWidth > 0 ? { minWidth: `${cameraLabelMinWidth}px` } : undefined}
                      >
                        {cameraLabel}
                      </span>
                      <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isCameraOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isCameraOpen && cameras.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
                        {cameras.map((camera) => (
                          <button
                            key={camera.deviceId}
                            type="button"
                            onClick={() => handleSelectCamera(camera)}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800 ${
                              selectedCameraId === camera.deviceId ? 'bg-green-50 text-green-700' : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{camera.label || 'Camera mặc định'}</span>
                            </span>
                            <span className="ml-2 shrink-0 text-[11px] text-right">
                              {cameraSignals[camera.deviceId] === 'checking' && 'Đang kiểm tra'}
                              {cameraSignals[camera.deviceId] === 'live' && 'Có tín hiệu'}
                              {cameraSignals[camera.deviceId] === 'no-signal' && 'Không tín hiệu'}
                            </span>
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
                      className="h-11 w-full flex items-center gap-2.5 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900 px-3"
                    >
                      <Mic className="w-5 h-5 text-green-600 shrink-0" />
                      <span
                        className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-medium"
                        style={micLabelMinWidth > 0 ? { minWidth: `${micLabelMinWidth}px` } : undefined}
                      >
                        {micLabel}
                      </span>
                      <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isMicOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isMicOpen && microphones.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
                        {microphones.map((mic) => (
                          <button
                            key={mic.deviceId}
                            type="button"
                            onClick={() => handleSelectMic(mic)}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800 ${
                              selectedMicId === mic.deviceId ? 'bg-green-50 text-green-700' : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{mic.label || 'Microphone mặc định'}</span>
                              <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">{`${micLevels[mic.deviceId] ?? 0}%`}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className="h-full rounded-full bg-green-600 transition-[width] duration-100"
                                style={{ width: `${micLevels[mic.deviceId] ?? 0}%` }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleShareScreen()}
                    disabled={isStartingShare}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-200 dark:bg-gray-700 py-2.5 text-base font-semibold hover:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <MonitorSmartphone className="w-5 h-5" />
                    {isStartingShare ? 'Đang mở chia sẻ...' : isScreenSharing ? 'Đang chia sẻ màn hình' : 'Chia sẻ màn hình'}
                  </button>
                  {!!mediaError && !isSwitchingCamera && <p className="text-xs text-gray-500 dark:text-gray-400">{mediaError}</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <h2 className="mb-3 text-2xl font-bold">Video</h2>
                <div className="relative h-[300px] rounded-xl bg-black flex items-center justify-center overflow-hidden">
                  <video
                    ref={previewRef}
                    autoPlay
                    playsInline
                    muted
                    onCanPlay={() => {
                      setHasVideoFrame(true);
                      setMediaError('');
                      setMediaHint('');
                      setIsSwitchingCamera(false);
                    }}
                    onPlaying={() => {
                      setHasVideoFrame(true);
                      setMediaError('');
                      setMediaHint('');
                      setIsSwitchingCamera(false);
                    }}
                    onLoadedData={() => {
                      setHasVideoFrame(true);
                      setMediaError('');
                      setMediaHint('');
                      setIsSwitchingCamera(false);
                    }}
                    onError={() => {
                      setMediaError('Preview video gặp lỗi khi render.');
                      setMediaHint('Hãy thử camera khác hoặc kiểm tra app virtual camera.');
                      setIsSwitchingCamera(false);
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
                <button className="mt-4 inline-flex items-center gap-3 text-base font-semibold">
                  <MessageSquare className="w-8 h-8 text-gray-600 dark:text-gray-400" /> Nhật ký sự kiện
                </button>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <h2 className="mb-4 text-2xl font-bold">Thêm chi tiết về bài viết</h2>
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Tiêu đề</label>
                    <input
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 outline-none ring-2 ring-transparent focus:border-green-400 focus:ring-green-100"
                      placeholder="Nhập tiêu đề buổi phát trực tiếp"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Mô tả</label>
                    <textarea
                      value={postDescription}
                      onChange={(e) => setPostDescription(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 outline-none ring-2 ring-transparent focus:border-green-400 focus:ring-green-100"
                      placeholder="Mô tả ngắn về nội dung buổi phát trực tiếp"
                    />
                  </div>
                </div>
                <div className="mb-1 border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center justify-center gap-16 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTagPeopleOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setPendingTaggedFriendIds(taggedFriendIds);
                          setTagFriendSearch('');
                          setIsCheckInOpen(false);
                        }
                        return next;
                      });
                    }}
                    className={`flex items-center gap-2 ${
                      isTagPeopleOpen ? 'text-green-700 font-semibold' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Users className="w-5 h-5 text-green-600" /> Gắn thẻ người khác
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckInOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setCheckInDetailDraft(checkInDetail);
                          setCheckInError('');
                          setCheckInSuggestions([]);
                          setSelectedCheckInSuggestion('');
                          setIsCheckInSuggestionsOpen(false);
                          setIsTagPeopleOpen(false);
                        }
                        return next;
                      });
                    }}
                    className={`flex items-center gap-2 ${
                      isCheckInOpen ? 'text-green-700 font-semibold' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <MapPin className="w-5 h-5 text-green-600" /> Check in
                  </button>
                </div>
                {(taggedFriends.length > 0 || checkInLocation.trim()) && (
                  <div className="mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2.5 space-y-2">
                    {taggedFriends.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Đã gắn thẻ</p>
                        <div className="flex flex-wrap gap-1.5">
                          {taggedFriends.slice(0, 3).map((friend) => (
                            <span
                              key={friend.userId}
                              className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-300"
                            >
                              <span className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                {friend.avatarUrl ? (
                                  <img src={friend.avatarUrl} alt={friend.fullName || friend.username} className="h-full w-full object-cover" />
                                ) : (
                                  <UserRound className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                )}
                              </span>
                              <span className="max-w-[140px] truncate">{friend.fullName || friend.username}</span>
                            </span>
                          ))}
                          {taggedFriends.length > 3 && (
                            <span className="inline-flex items-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
                              +{taggedFriends.length - 3} người khác
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {checkInLocation.trim() && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Check in</p>
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-300">
                          <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          <span className="truncate">{checkInLocation.trim()}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {isTagPeopleOpen && (
                  <div className="mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <input
                        value={tagFriendSearch}
                        onChange={(e) => setTagFriendSearch(e.target.value)}
                        placeholder="Tìm bạn bè để gắn thẻ..."
                        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>
                    <div className="h-64 space-y-1 overflow-y-auto pr-1">
                      {isFriendsLoading && <p className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">Đang tải bạn bè...</p>}
                      {!isFriendsLoading && filteredTagFriends.length === 0 && (
                        <p className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">Không có bạn bè phù hợp.</p>
                      )}
                      {!isFriendsLoading &&
                        orderedTagFriends.map((friend) => {
                          const isChecked = pendingTaggedFriendIds.includes(friend.userId);
                          return (
                            <button
                              key={friend.userId}
                              type="button"
                              onClick={() =>
                                setPendingTaggedFriendIds((prev) =>
                                  prev.includes(friend.userId)
                                    ? prev.filter((id) => id !== friend.userId)
                                    : [...prev, friend.userId],
                                )
                              }
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2 ${
                                isChecked ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                              }`}
                            >
                              <span
                                className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                                  isChecked ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                                }`}
                              >
                                {isChecked ? <Check className="h-3 w-3" /> : null}
                              </span>
                              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                {friend.avatarUrl ? (
                                  <img src={friend.avatarUrl} alt={friend.fullName || friend.username} className="h-full w-full object-cover" />
                                ) : (
                                  <UserRound className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                )}
                              </span>
                              <span className="truncate">{friend.fullName || friend.username}</span>
                            </button>
                          );
                        })}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingTaggedFriendIds(taggedFriendIds);
                          setIsTagPeopleOpen(false);
                        }}
                        className="flex-1 rounded-lg bg-gray-200 dark:bg-gray-700 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTaggedFriendIds([...new Set(pendingTaggedFriendIds)]);
                          setIsTagPeopleOpen(false);
                        }}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                )}

                {isCheckInOpen && (
                  <div className="mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleGetCurrentCheckInLocation}
                        disabled={isDetectingCheckInLocation}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LocateFixed className="h-4 w-4 text-green-600" />
                        {isDetectingCheckInLocation ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSuggestCheckInLocations()}
                        disabled={isDetectingCheckInLocation || isSuggestingCheckIn}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Lightbulb className="h-4 w-4 text-green-600" />
                        {isSuggestingCheckIn ? 'Đang gợi ý...' : 'Gợi ý vị trí'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Tỉnh/Thành phố</label>
                        <select
                          value={selectedCheckInProvince?.code ?? ''}
                          onChange={(e) => {
                            void handleCheckInProvinceChange(e.target.value);
                          }}
                          disabled={isCheckInLocationLoading}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-green-400 disabled:cursor-not-allowed disabled:bg-gray-100"
                        >
                          <option value="">Chọn tỉnh/thành phố</option>
                          {checkInProvinces.map((province) => (
                            <option key={province.code} value={province.code}>{province.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Xã/Phường</label>
                        <select
                          value={selectedCheckInWard?.code ?? ''}
                          onChange={(e) => {
                            const ward = checkInWards.find((item) => item.code === e.target.value) ?? null;
                            setSelectedCheckInWard(ward);
                            setSelectedCheckInSuggestion('');
                          }}
                          disabled={!selectedCheckInProvince || isCheckInLocationLoading}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-green-400 disabled:cursor-not-allowed disabled:bg-gray-100"
                        >
                          <option value="">Chọn xã/phường</option>
                          {checkInWards.map((ward) => (
                            <option key={ward.code} value={ward.code}>{ward.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Địa chỉ chi tiết (tùy chọn)</label>
                      <input
                        value={checkInDetailDraft}
                        maxLength={255}
                        onChange={(e) => {
                          setCheckInDetailDraft(e.target.value);
                          setSelectedCheckInSuggestion('');
                        }}
                        placeholder="Ví dụ: 123 Trần Hưng Đạo"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-400"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Tối đa 255 ký tự</p>
                    </div>
                    {checkInError && <p className="text-xs text-red-600">{checkInError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckInDetailDraft(checkInDetail);
                          setIsCheckInOpen(false);
                        }}
                        className="flex-1 rounded-lg bg-gray-200 dark:bg-gray-700 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextLocation = selectedCheckInSuggestion.trim()
                            ? selectedCheckInSuggestion.trim()
                            : composeCheckInLocation(checkInDetailDraft, selectedCheckInWard, selectedCheckInProvince);
                          setCheckInDetail(checkInDetailDraft.trim());
                          setCheckInLocation(nextLocation);
                          setIsCheckInOpen(false);
                        }}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                )}

                {isCheckInOpen && isCheckInSuggestionsOpen && (
                  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl">
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Gợi ý vị trí check in</h3>
                        <button
                          type="button"
                          onClick={() => setIsCheckInSuggestionsOpen(false)}
                          className="rounded-full p-1 text-gray-500 dark:text-gray-400 hover:bg-muted"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-3 p-4">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <Search className="h-4 w-4 text-gray-400" />
                          <input
                            value={checkInSuggestionSearch}
                            onChange={(e) => setCheckInSuggestionSearch(e.target.value)}
                            placeholder="Tìm vị trí check in..."
                            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                          />
                        </div>

                        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                          {isSuggestingCheckIn && (
                            <p className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">Đang tải gợi ý vị trí...</p>
                          )}
                          {!isSuggestingCheckIn && filteredCheckInSuggestions.length === 0 && (
                            <p className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">Không có địa điểm phù hợp gần đây.</p>
                          )}
                          {!isSuggestingCheckIn && filteredCheckInSuggestions.length > 0 && (
                            <div className="space-y-1">
                              {filteredCheckInSuggestions.map((item) => (
                                <button
                                  key={item.locationText}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCheckInSuggestion(item.locationText);
                                    setCheckInDetailDraft(item.locationText);
                                    setIsCheckInSuggestionsOpen(false);
                                  }}
                                  className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm ${
                                    selectedCheckInSuggestion === item.locationText
                                      ? 'border-green-600 bg-green-50 text-green-700'
                                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  <MapPin className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{item.locationText}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <h2 className="mb-3 text-2xl font-bold">Bình luận ghim sẵn</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">Bình luận này sẽ tự động được ghim trong đoạn chat của tất cả video trực tiếp mà bạn đăng.</p>
                <div className="my-4 flex items-center justify-between border-y border-gray-200 dark:border-gray-700 py-2.5">
                  <p className="text-sm font-semibold">Bật bình luận ghim sẵn</p>
                  <button
                    type="button"
                    disabled={isPinnedLoading}
                    onClick={() => {
                      void savePinnedComment(!pinnedEnabled, pinnedCommentText);
                    }}
                    className={`h-7 w-14 rounded-full p-1 transition-colors ${
                      pinnedEnabled ? 'bg-green-600' : 'bg-gray-400'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white dark:bg-gray-800 transition-transform ${pinnedEnabled ? 'translate-x-7' : ''}`} />
                  </button>
                </div>
                <p className="mb-3 text-sm font-semibold">Xem trước</p>
                <div className="mb-3 flex items-center gap-2 text-green-600 text-sm"><Pin className="w-4 h-4" /> Bình luận ghim</div>
                <div className="rounded-2xl bg-gray-100 dark:bg-gray-900 p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <UserRound className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{currentUserName}</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{pinnedCommentText}</p>
                    </div>
                  </div>
                </div>
                {isPinnedEditMode ? (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={pinnedDraftText}
                      onChange={(e) => setPinnedDraftText(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-green-400"
                      placeholder="Nhập nội dung bình luận ghim..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPinnedDraftText(pinnedCommentText);
                          setIsPinnedEditMode(false);
                        }}
                        className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={isPinnedLoading}
                        onClick={async () => {
                          const ok = await savePinnedComment(pinnedEnabled, pinnedDraftText);
                          if (ok) {
                            setIsPinnedEditMode(false);
                          }
                        }}
                        className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white disabled:bg-gray-400"
                      >
                        {isPinnedLoading ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedDraftText(pinnedCommentText);
                      setIsPinnedEditMode(true);
                    }}
                    className="mt-4 w-full rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Chỉnh sửa
                  </button>
                )}
                {pinnedError && <p className="mt-2 text-xs text-red-600">{pinnedError}</p>}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}




