import {
  Activity,
  Bell,
  Camera,
  ChartNoAxesColumn,
  ChevronDown,
  Eye,
  Globe,
  MessageCircle,
  Mic,
  Monitor,
  MoreHorizontal,
  Settings,
  Share2,
  Sparkles,
  ThumbsUp,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveSessionStatsResponse, type LiveSessionToolStateResponse } from '@/services/liveService';
import { postService, type PostCommentResponse, type PostResponse } from '@/services/postService';

type MainSection = 'dashboard' | 'details' | 'settings';
type SettingsSub = 'video';
type MediaStats = {
  videoBitrateKbps: number | null;
  audioBitrateKbps: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
};
type PreviousTrackStats = Record<string, { timestamp: number; bytesSent: number; framesEncoded?: number }>;
interface ProducerLocationState {
  postId?: string;
  sessionId?: string;
  roomName?: string;
  livekitUrl?: string | null;
  hostToken?: string | null;
  title?: string;
  description?: string;
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
  const storedProducerState = useMemo<ProducerLocationState | null>(() => {
    try {
      const raw = window.sessionStorage.getItem('kconnecta.liveProducerState');
      return raw ? (JSON.parse(raw) as ProducerLocationState) : null;
    } catch {
      return null;
    }
  }, []);
  const producerState = routeState?.sessionId ? routeState : storedProducerState;
  const querySessionId = new URLSearchParams(location.search).get('sessionId')?.trim() || '';
  const preferredCameraId = producerState?.selectedCameraId?.trim() || '';
  const preferredMicId = producerState?.selectedMicId?.trim() || '';
  const sessionId = producerState?.sessionId?.trim() || querySessionId;
  const postId = producerState?.postId?.trim() || '';
  const livekitUrl = producerState?.livekitUrl?.trim() || '';
  const hostToken = producerState?.hostToken?.trim() || '';
  const liveTitle = producerState?.title?.trim() || 'Video trực tiếp';
  const liveDescription = producerState?.description?.trim() || '';
  const [mainSection, setMainSection] = useState<MainSection>('dashboard');
  const [settingsSub, setSettingsSub] = useState<SettingsSub>('video');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState(preferredCameraId);
  const [selectedMicId, setSelectedMicId] = useState(preferredMicId);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [liveStatus, setLiveStatus] = useState(hostToken ? 'Đang kết nối LiveKit...' : 'Thiếu token LiveKit cho phiên live.');
  const [liveError, setLiveError] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [liveStats, setLiveStats] = useState<LiveSessionStatsResponse | null>(null);
  const [toolState, setToolState] = useState<LiveSessionToolStateResponse | null>(null);
  const [toolError, setToolError] = useState('');
  const [toolMessage, setToolMessage] = useState('');
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [featuredLinkTitle, setFeaturedLinkTitle] = useState('');
  const [featuredLinkUrl, setFeaturedLinkUrl] = useState('');
  const [hostNotice, setHostNotice] = useState('');
  const [postMetrics, setPostMetrics] = useState<PostResponse | null>(null);
  const [mediaStats, setMediaStats] = useState<MediaStats>({
    videoBitrateKbps: null,
    audioBitrateKbps: null,
    fps: null,
    width: null,
    height: null,
  });
  const [comments, setComments] = useState<PostCommentResponse[]>([]);
  const [localStreamVersion, setLocalStreamVersion] = useState(0);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const miniVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef<Room | null>(null);
  const publishedTracksRef = useRef<MediaStreamTrack[]>([]);
  const previousTrackStatsRef = useRef<PreviousTrackStats>({});
  const commentCount = postMetrics?.commentCount ?? comments.length;
  const shareCount = postMetrics?.shareCount ?? 0;
  const reactionCount = liveStats?.totalReactionCount ?? 0;
  const peakViewerCount = liveStats?.peakViewerCount ?? viewerCount;
  const hasFeaturedLink = Boolean(toolState?.featuredLinkTitle && toolState?.featuredLinkUrl);
  const viewerUrl = useMemo(() => {
    if (!sessionId) return '';
    return `${window.location.origin}/live/viewer?sessionId=${encodeURIComponent(sessionId)}`;
  }, [sessionId]);

  useEffect(() => {
    if (!routeState?.sessionId) return;
    window.sessionStorage.setItem('kconnecta.liveProducerState', JSON.stringify(routeState));
  }, [routeState]);

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
        setLocalStreamVersion((prev) => prev + 1);
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
    if (!livekitUrl || !hostToken) return;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    const updateParticipants = () => {
      setViewerCount(room.remoteParticipants.size);
    };

    room
      .on(RoomEvent.ParticipantConnected, updateParticipants)
      .on(RoomEvent.ParticipantDisconnected, updateParticipants)
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) setLiveStatus('Đã ngắt kết nối LiveKit.');
      });

    const connect = async () => {
      try {
        await room.connect(livekitUrl, hostToken);
        if (cancelled) return;
        setLiveStatus('Đang phát trực tiếp.');
        updateParticipants();
      } catch (err) {
        if (!cancelled) {
          setLiveError(err instanceof Error ? err.message : 'Không thể kết nối LiveKit.');
          setLiveStatus('Kết nối LiveKit thất bại.');
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      publishedTracksRef.current = [];
      room.disconnect();
      roomRef.current = null;
    };
  }, [hostToken, livekitUrl]);

  useEffect(() => {
    const room = roomRef.current;
    const stream = localStreamRef.current;
    if (!room || room.state !== 'connected' || !stream) return;

    const publish = async () => {
      try {
        for (const track of publishedTracksRef.current) {
          await room.localParticipant.unpublishTrack(track);
        }
        publishedTracksRef.current = [];

        const tracks = [...stream.getVideoTracks(), ...stream.getAudioTracks()];
        for (const track of tracks) {
          await room.localParticipant.publishTrack(track, {
            source: track.kind === 'video' ? Track.Source.Camera : Track.Source.Microphone,
          });
          publishedTracksRef.current.push(track);
        }
        setLiveError('');
      } catch (err) {
        setLiveError(err instanceof Error ? err.message : 'Không thể publish camera/microphone.');
      }
    };

    void publish();
  }, [localStreamVersion, liveStatus]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    void bindStreamToPreview(localStreamRef.current);
  }, [mainSection, bindStreamToPreview]);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    const loadComments = async () => {
      try {
        const data = await postService.getComments(postId, 0, 30, currentUser?.id);
        if (!cancelled) setComments(data.content);
      } catch {
        if (!cancelled) setComments([]);
      }
    };
    void loadComments();
    const interval = window.setInterval(() => void loadComments(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentUser?.id, postId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const loadLiveStats = async () => {
      try {
        const stats = await liveService.getStats(sessionId);
        if (cancelled) return;
        setLiveStats(stats);
        setViewerCount(stats.viewerCount);
      } catch {
        // Keep LiveKit participant count as fallback.
      }
    };
    void loadLiveStats();
    const interval = window.setInterval(() => void loadLiveStats(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const loadTools = async () => {
      try {
        const data = await liveService.getTools(sessionId);
        if (cancelled) return;
        setToolState(data);
        setPollEnabled(data.pollEnabled);
        setPollQuestion(data.pollQuestion ?? '');
        setPollOptions(data.pollOptions.length >= 2 ? data.pollOptions : ['', '']);
        setFeaturedLinkTitle(data.featuredLinkTitle ?? '');
        setFeaturedLinkUrl(data.featuredLinkUrl ?? '');
        setHostNotice(data.hostNotice ?? '');
      } catch {
        if (!cancelled) setToolError('Không thể tải công cụ live.');
      }
    };
    void loadTools();
    const interval = window.setInterval(() => void loadTools(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    const loadPostMetrics = async () => {
      try {
        const data = await postService.getPostById(postId, currentUser?.id);
        if (!cancelled) setPostMetrics(data);
      } catch {
        // Metrics remain at their last known values.
      }
    };
    void loadPostMetrics();
    const interval = window.setInterval(() => void loadPostMetrics(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentUser?.id, postId]);

  useEffect(() => {
    const measureMediaStats = async () => {
      const room = roomRef.current;
      const stream = localStreamRef.current;
      if (!room || !stream) return;

      const videoSettings = stream.getVideoTracks()[0]?.getSettings();
      const nextStats: MediaStats = {
        videoBitrateKbps: null,
        audioBitrateKbps: null,
        fps: videoSettings?.frameRate ? Math.round(videoSettings.frameRate) : null,
        width: videoSettings?.width ?? null,
        height: videoSettings?.height ?? null,
      };

      const publications = Array.from(room.localParticipant.trackPublications.values());
      for (const publication of publications) {
        const track = publication.track as unknown as {
          sid?: string;
          kind?: string;
          mediaStreamTrack?: MediaStreamTrack;
          getRTCStatsReport?: () => Promise<RTCStatsReport | undefined>;
        } | null;
        if (!track?.getRTCStatsReport) continue;
        const report = await track.getRTCStatsReport();
        if (!report) continue;

        report.forEach((entry) => {
          const outbound = entry as RTCOutboundRtpStreamStats & {
            framesEncoded?: number;
            isRemote?: boolean;
            kind?: string;
            mediaType?: string;
          };
          if (outbound.type !== 'outbound-rtp' || outbound.isRemote) return;
          const mediaKind = outbound.kind ?? outbound.mediaType ?? track.kind ?? track.mediaStreamTrack?.kind;
          const bytesSent = typeof outbound.bytesSent === 'number' ? outbound.bytesSent : null;
          const timestamp = typeof outbound.timestamp === 'number' ? outbound.timestamp : null;
          if (bytesSent == null || timestamp == null) return;

          const key = `${mediaKind}-${outbound.id}`;
          const previous = previousTrackStatsRef.current[key];
          if (previous) {
            const elapsedSeconds = (timestamp - previous.timestamp) / 1000;
            if (elapsedSeconds > 0) {
              const kbps = Math.max(0, Math.round(((bytesSent - previous.bytesSent) * 8) / elapsedSeconds / 1000));
              if (mediaKind === 'video') nextStats.videoBitrateKbps = kbps;
              if (mediaKind === 'audio') nextStats.audioBitrateKbps = kbps;

              if (mediaKind === 'video' && typeof outbound.framesEncoded === 'number') {
                const frameDelta = outbound.framesEncoded - (previous.framesEncoded ?? outbound.framesEncoded);
                nextStats.fps = Math.max(0, Math.round(frameDelta / elapsedSeconds));
              }
            }
          }

          previousTrackStatsRef.current[key] = {
            timestamp,
            bytesSent,
            framesEncoded: typeof outbound.framesEncoded === 'number' ? outbound.framesEncoded : undefined,
          };
        });
      }

      setMediaStats(nextStats);
    };

    void measureMediaStats();
    const interval = window.setInterval(() => void measureMediaStats(), 2000);
    return () => window.clearInterval(interval);
  }, []);

  const handleCopyViewerUrl = useCallback(async () => {
    if (!viewerUrl) return;
    try {
      await navigator.clipboard.writeText(viewerUrl);
    } catch {
      const input = document.createElement('input');
      input.value = viewerUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  }, [viewerUrl]);

  const showToolMessage = (message: string) => {
    setToolError('');
    setToolMessage(message);
    window.setTimeout(() => setToolMessage(''), 2200);
  };

  const handleSavePoll = async () => {
    if (!sessionId) return;
    try {
      const data = await liveService.upsertPoll(sessionId, {
        enabled: pollEnabled,
        question: pollQuestion,
        options: pollOptions,
      });
      setToolState(data);
      showToolMessage('Đã lưu cuộc thăm dò ý kiến cho phiên live.');
    } catch (err) {
      setToolMessage('');
      setToolError(err instanceof Error ? err.message : 'Không thể lưu cuộc thăm dò ý kiến.');
    }
  };

  const handleClearPoll = async () => {
    if (!sessionId) return;
    const data = await liveService.upsertPoll(sessionId, { enabled: false, question: null, options: [] });
    setToolState(data);
    setPollEnabled(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    showToolMessage('Đã xóa cuộc thăm dò ý kiến.');
  };

  const handleSaveFeaturedLink = async () => {
    if (!sessionId) return;
    try {
      const data = await liveService.upsertFeaturedLink(sessionId, {
        title: featuredLinkTitle,
        url: featuredLinkUrl,
      });
      setToolState(data);
      showToolMessage('Đã lưu liên kết đáng chú ý.');
    } catch (err) {
      setToolMessage('');
      setToolError(err instanceof Error ? err.message : 'Không thể lưu liên kết.');
    }
  };

  const handleClearFeaturedLink = async () => {
    if (!sessionId) return;
    const data = await liveService.upsertFeaturedLink(sessionId, { title: null, url: null });
    setToolState(data);
    setFeaturedLinkTitle('');
    setFeaturedLinkUrl('');
    showToolMessage('Đã xóa liên kết đáng chú ý.');
  };

  const handleSaveHostNotice = async () => {
    if (!sessionId) return;
    const data = await liveService.upsertHostNotice(sessionId, { notice: hostNotice });
    setToolState(data);
    showToolMessage('Đã lưu thông báo host.');
  };

  const handleEndLive = async () => {
    try {
      if (sessionId) {
        await liveService.endSession(sessionId);
      }
    } finally {
      roomRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      navigate('/live');
    }
  };

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
                </div>
              )}
            </div>

            <button onClick={() => setMainSection('dashboard')} className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-gray-100 text-gray-900">
              <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center"><Sparkles className="w-5 h-5" /></span>
              Tương tác
            </button>
            <button onClick={() => setMainSection('dashboard')} className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-gray-100 text-gray-900">
              <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center"><Activity className="w-5 h-5" /></span>
              Phân phối
            </button>
            <button onClick={() => setMainSection('details')} className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-gray-100 text-gray-900">
              <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center"><Bell className="w-5 h-5" /></span>
              Báo cáo sự cố
            </button>
          </div>

          <div className="p-4 mt-2 border-t border-gray-200 sticky bottom-0 bg-white">
            <div className="flex items-center gap-2 text-red-500 font-semibold text-sm mb-3">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <LiveTimer />
            </div>
            <button onClick={() => void handleEndLive()} className="w-full rounded-xl bg-red-600 text-white font-semibold py-2.5 hover:bg-red-700">Kết thúc video trực tiếp</button>
          </div>
        </aside>

        <main className="flex-1 p-6">
          {(toolMessage || toolError) && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${toolError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {toolError || toolMessage}
            </div>
          )}

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
                    {liveError && (
                      <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-red-600/90 px-3 py-2 text-sm text-white">
                        {liveError}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xl font-semibold flex items-center gap-2"><MessageCircle className="w-6 h-6 text-gray-700" /> {liveStatus}</div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Hoạt động trong Live</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-100 p-3">
                      <p className="text-sm text-gray-600">Số người đang xem</p>
                      <p className="text-4xl font-bold mt-1">{viewerCount}</p>
                    </div>
                    <div className="rounded-xl bg-gray-100 p-3">
                      <p className="text-sm text-gray-600">Số bình luận hiện tại</p>
                      <p className="text-4xl font-bold mt-1">{commentCount}</p>
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
                        <p className="text-3xl font-bold leading-none">{viewerCount}</p>
                        <p className="text-gray-600">Người xem</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageCircle className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <p className="text-3xl font-bold leading-none">{commentCount}</p>
                        <p className="text-gray-600">Bình luận</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ThumbsUp className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="text-3xl font-bold leading-none">{reactionCount}</p>
                        <p className="text-gray-600">Cảm xúc</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Share2 className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="text-3xl font-bold leading-none">{shareCount}</p>
                        <p className="text-gray-600">Lượt chia sẻ</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setMainSection('details')} className="w-full rounded-xl bg-blue-50 text-blue-700 font-semibold py-2.5">Xem thông tin chi tiết</button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Số liệu về video đang phát</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-600">Tốc độ bit của video</p>
                      <p className="mt-1 text-3xl font-bold">{mediaStats.videoBitrateKbps == null ? 'Đang đo' : `${mediaStats.videoBitrateKbps} Kbps`}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {mediaStats.width && mediaStats.height ? `${mediaStats.width}×${mediaStats.height}` : 'Chưa có độ phân giải'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-600">Tỷ lệ khung hình</p>
                      <p className="mt-1 text-3xl font-bold">{mediaStats.fps == null ? 'Đang đo' : `${mediaStats.fps} fps`}</p>
                      <p className="mt-1 text-xs text-gray-500">Lấy từ WebRTC sender stats hoặc camera settings</p>
                    </div>
                    <div className="rounded-xl bg-gray-100 p-4">
                      <p className="text-sm text-gray-600">Tốc độ bit của âm thanh</p>
                      <p className="mt-1 text-3xl font-bold">{mediaStats.audioBitrateKbps == null ? 'Đang đo' : `${mediaStats.audioBitrateKbps} Kbps`}</p>
                      <p className="mt-1 text-xs text-gray-500">Cập nhật khoảng mỗi 2 giây khi đang publish</p>
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
                    <div className="flex-1 rounded-full bg-gray-100 px-4 py-2 truncate">{viewerUrl || 'Chưa có liên kết xem live'}</div>
                    <button onClick={() => void handleCopyViewerUrl()} disabled={!viewerUrl} className="rounded-xl bg-blue-50 text-blue-700 font-semibold px-4 py-2 disabled:text-gray-400 disabled:cursor-not-allowed">Sao chép</button>
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 min-h-[520px]">
                  <h3 className="text-2xl font-bold mb-4">Bình luận</h3>
                  <div className="rounded-xl bg-gray-100 p-4 text-gray-700 min-h-[320px] max-h-[420px] overflow-y-auto">
                    {comments.length === 0 ? (
                      <div className="flex min-h-[280px] flex-col justify-center text-center text-gray-500">
                        <MessageCircle className="w-7 h-7 mx-auto mb-2" />
                        <p className="font-semibold">Chưa có bình luận</p>
                        <p className="text-sm">Bình luận của đối tượng sẽ hiển thị ở đây.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div key={comment.id} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                            <p className="text-sm font-semibold text-gray-900">{comment.userFullName || comment.username || 'Người dùng'}</p>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
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
                      <p className="text-xl font-semibold text-gray-900 leading-tight">{liveTitle}</p>
                      {liveDescription && <p className="mt-1.5 text-lg text-gray-700 leading-tight">{liveDescription}</p>}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Cuộc thăm dò ý kiến</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input type="checkbox" checked={pollEnabled} onChange={(event) => setPollEnabled(event.target.checked)} />
                      Bật thăm dò ý kiến cho phiên live
                    </label>
                    <input
                      value={pollQuestion}
                      onChange={(event) => setPollQuestion(event.target.value)}
                      className="w-full rounded-xl bg-gray-100 px-4 py-2.5 outline-none"
                      placeholder="Câu hỏi"
                    />
                    {pollOptions.map((option, index) => (
                      <input
                        key={index}
                        value={option}
                        onChange={(event) => setPollOptions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                        className="w-full rounded-xl bg-gray-100 px-4 py-2.5 outline-none"
                        placeholder={`Lựa chọn ${index + 1}`}
                      />
                    ))}
                    <button
                      onClick={() => setPollOptions((prev) => (prev.length >= 6 ? prev : [...prev, '']))}
                      className="w-full rounded-xl border border-dashed border-blue-500 text-blue-600 py-2.5 font-medium"
                    >
                      Thêm lựa chọn
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => void handleClearPoll()} className="rounded-xl bg-gray-200 text-gray-700 py-2.5 font-semibold">Xóa</button>
                      <button onClick={() => void handleSavePoll()} className="rounded-xl bg-blue-600 text-white py-2.5 font-semibold">Lưu thăm dò</button>
                    </div>
                    {toolState?.pollEnabled && (
                      <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                        Thăm dò đang bật: {toolState.pollQuestion}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Thông báo</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="space-y-3">
                    <textarea
                      value={hostNotice}
                      onChange={(event) => setHostNotice(event.target.value)}
                      className="min-h-[110px] w-full resize-none rounded-xl bg-gray-100 px-4 py-3 outline-none"
                      placeholder="Ghi chú/thông báo cho host hoặc người kiểm duyệt..."
                    />
                    <button onClick={() => void handleSaveHostNotice()} className="w-full rounded-xl bg-blue-50 text-blue-700 font-semibold py-2.5">Lưu thông báo</button>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Liên kết đáng chú ý</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="space-y-3">
                    <input
                      value={featuredLinkTitle}
                      onChange={(event) => setFeaturedLinkTitle(event.target.value)}
                      className="w-full rounded-xl bg-gray-100 px-4 py-2.5 outline-none"
                      placeholder="Tiêu đề liên kết"
                    />
                    <input
                      value={featuredLinkUrl}
                      onChange={(event) => setFeaturedLinkUrl(event.target.value)}
                      className="w-full rounded-xl bg-gray-100 px-4 py-2.5 outline-none"
                      placeholder="https://..."
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => void handleClearFeaturedLink()} className="rounded-xl bg-gray-200 text-gray-700 py-2.5 font-semibold">Xóa</button>
                      <button onClick={() => void handleSaveFeaturedLink()} className="rounded-xl bg-blue-50 text-blue-700 font-semibold py-2.5">Lưu liên kết</button>
                    </div>
                    {hasFeaturedLink && (
                      <a href={toolState?.featuredLinkUrl ?? '#'} target="_blank" rel="noreferrer" className="block rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">
                        {toolState?.featuredLinkTitle}
                      </a>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Liên kết xem trước</h3>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-gray-700 mb-3">Nhấp vào liên kết bên dưới để xem những gì người xem nhìn thấy</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-gray-100 px-4 py-2 truncate">{viewerUrl || 'Chưa có liên kết xem trước'}</div>
                    <button onClick={() => navigate(`/live/viewer?sessionId=${encodeURIComponent(sessionId)}`)} className="rounded-xl bg-blue-50 text-blue-700 font-semibold px-4 py-2">Xem bài viết</button>
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
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Số người đang xem</p><p className="text-4xl font-bold mt-2">{viewerCount}</p></div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Số người xem đồng thời cao nhất</p><p className="text-4xl font-bold mt-2">{peakViewerCount}</p></div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Tổng số bình luận</p><p className="text-4xl font-bold mt-2">{commentCount}</p></div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Tổng cảm xúc live</p><p className="text-4xl font-bold mt-2">{reactionCount}</p></div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Lượt chia sẻ bài viết</p><p className="text-4xl font-bold mt-2">{shareCount}</p></div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="font-semibold">Video bitrate</p><p className="text-4xl font-bold mt-2">{mediaStats.videoBitrateKbps == null ? '—' : mediaStats.videoBitrateKbps}</p><p className="text-sm text-gray-500">Kbps</p></div>
              </div>
            </div>
          )}

          {mainSection === 'settings' && settingsSub === 'video' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="text-2xl font-bold mb-4">Cài đặt phát trực tiếp</h3>
                <p className="font-semibold mb-1">Độ trễ của video trực tiếp</p>
                <p className="text-gray-600 mb-6">Độ trễ đang phụ thuộc vào LiveKit/WebRTC và môi trường mạng. UI này chỉ hiển thị trạng thái, chưa đổi cấu hình server.</p>

                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-3"><p className="font-semibold">LiveKit WebRTC</p><p className="text-gray-600">Luồng camera/mic được publish trực tiếp vào room LiveKit.</p></div>
                  <div className="border-b border-gray-200 pb-3"><p className="font-semibold">Người xem hiện tại</p><p className="text-gray-600">{viewerCount} người đang kết nối vào phiên live.</p></div>
                  <div><p className="font-semibold">Chất lượng gửi lên</p><p className="text-gray-600">{mediaStats.videoBitrateKbps == null ? 'Đang đo bitrate video.' : `${mediaStats.videoBitrateKbps} Kbps video`}</p></div>
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
