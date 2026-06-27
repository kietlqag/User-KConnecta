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
import { toast } from 'sonner';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveSessionRealtimeEvent, type LiveSessionResponse, type LiveSessionStatsResponse, type LiveSessionToolStateResponse } from '@/services/liveService';
import { postService, type PostResponse } from '@/services/postService';
import { LiveCommentPanel } from '../components/LiveCommentPanel';
import {
  buildProducerStateForHost,
  getLiveViewerPreviewUrl,
  isLiveSessionHost,
  LIVE_PRODUCER_STATE_KEY,
  persistProducerState,
  type ProducerLocationState,
} from '../utils/navigateToLiveSession';
import { useLiveSessionSocket } from '../hooks/useLiveSessionSocket';

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

const rankCamera = (device: MediaDeviceInfo) => {
  const name = (device.label || '').toLowerCase();
  if (name.includes('integrated') || name.includes('built-in') || name.includes('webcam')) return 0;
  if (name.includes('droidcam') || name.includes('iriun') || name.includes('camo') || name.includes('obs')) return 1;
  if (name.includes('virtual')) return 2;
  return 3;
};

const getSupportedRecordingMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ].find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
};

function LiveTimer({ startedAt, paused = false }: { startedAt?: string | null; paused?: boolean }) {
  const formatElapsed = useCallback((at: string) => {
    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / 1000));
    const hours = Math.floor(elapsedSec / 3600);
    const minutes = Math.floor((elapsedSec % 3600) / 60);
    const seconds = elapsedSec % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const formatted = useMemo(() => {
    if (!startedAt) return '00:00:00';
    return formatElapsed(startedAt);
  }, [formatElapsed, startedAt]);

  const [display, setDisplay] = useState(formatted);

  useEffect(() => {
    setDisplay(formatted);
  }, [formatted]);

  useEffect(() => {
    if (paused || !startedAt) return;

    const tick = () => setDisplay(formatElapsed(startedAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [formatElapsed, paused, startedAt]);

  return <span>{display}</span>;
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
      const raw = window.sessionStorage.getItem(LIVE_PRODUCER_STATE_KEY);
      return raw ? (JSON.parse(raw) as ProducerLocationState) : null;
    } catch {
      return null;
    }
  }, []);
  const producerState = routeState?.sessionId ? routeState : storedProducerState;
  const querySessionId = new URLSearchParams(location.search).get('sessionId')?.trim() || '';
  const preferredCameraId = producerState?.selectedCameraId?.trim() || '';
  const preferredMicId = producerState?.selectedMicId?.trim() || '';
  const preferredVideoSourceMode = producerState?.videoSourceMode ?? 'camera';
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
  const [videoSourceMode, setVideoSourceMode] = useState<'camera' | 'screen'>(preferredVideoSourceMode);
  const [isStartingScreenShare, setIsStartingScreenShare] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [liveStatus, setLiveStatus] = useState(hostToken ? 'Đang kết nối LiveKit...' : 'Thiếu token LiveKit cho phiên live.');
  const [liveError, setLiveError] = useState('');
  const [isEndingLive, setIsEndingLive] = useState(false);
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
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
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionPrivacy, setSessionPrivacy] = useState<LiveSessionResponse['privacy']>('PUBLIC');
  const [mediaStats, setMediaStats] = useState<MediaStats>({
    videoBitrateKbps: null,
    audioBitrateKbps: null,
    fps: null,
    width: null,
    height: null,
  });
  const [localStreamVersion, setLocalStreamVersion] = useState(0);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const miniVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef<Room | null>(null);
  const publishedTracksRef = useRef<MediaStreamTrack[]>([]);
  const previousTrackStatsRef = useRef<PreviousTrackStats>({});
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const allRecordingChunksRef = useRef<BlobPart[]>([]);
  const liveRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingMimeTypeRef = useRef('');
  const toolFormDirtyRef = useRef(false);
  const commentCount = postMetrics?.commentCount ?? 0;
  const shareCount = postMetrics?.shareCount ?? 0;
  const reactionCount = liveStats?.totalReactionCount ?? 0;
  const peakViewerCount = liveStats?.peakViewerCount ?? viewerCount;
  const hasFeaturedLink = Boolean(toolState?.featuredLinkTitle && toolState?.featuredLinkUrl);
  const viewerUrl = useMemo(() => {
    if (!sessionId) return '';
    return `${window.location.origin}/live/viewer?sessionId=${encodeURIComponent(sessionId)}`;
  }, [sessionId]);

  const applyToolState = useCallback((data: LiveSessionToolStateResponse, forceSyncForm = false) => {
    setToolState(data);
    if (!forceSyncForm && toolFormDirtyRef.current) {
      return;
    }
    setPollEnabled(data.pollEnabled);
    setPollQuestion(data.pollQuestion ?? '');
    setPollOptions(data.pollOptions.length >= 2 ? data.pollOptions : ['', '']);
    setFeaturedLinkTitle(data.featuredLinkTitle ?? '');
    setFeaturedLinkUrl(data.featuredLinkUrl ?? '');
    setHostNotice(data.hostNotice ?? '');
  }, []);

  const handleLiveEvent = useCallback((event: LiveSessionRealtimeEvent) => {
    if (event.session) {
      setViewerCount(event.session.viewerCount);
      setLiveStats({
        sessionId: event.session.id,
        viewerCount: event.session.viewerCount,
        peakViewerCount: event.session.peakViewerCount,
        totalReactionCount: event.session.totalReactionCount,
      });
      if (event.type === 'LIVE_ENDED') {
        setLiveStatus('Live đã kết thúc.');
      }
      if (event.session.startedAt) {
        setSessionStartedAt(event.session.startedAt);
      }
      if (event.session.privacy) {
        setSessionPrivacy(event.session.privacy);
      }
    } else if (event.viewerCount != null || event.totalReactionCount != null) {
      setViewerCount((prev) => event.viewerCount ?? prev);
      setLiveStats((prev) => ({
        sessionId,
        viewerCount: event.viewerCount ?? prev?.viewerCount ?? 0,
        peakViewerCount: event.peakViewerCount ?? prev?.peakViewerCount ?? 0,
        totalReactionCount: event.totalReactionCount ?? prev?.totalReactionCount ?? 0,
      }));
    }
    if (event.tools) {
      applyToolState(event.tools);
    }
  }, [applyToolState, sessionId]);

  useLiveSessionSocket(sessionId, Boolean(currentUser), handleLiveEvent);

  useEffect(() => {
    if (!sessionId) {
      navigate('/live/setup', { replace: true });
      return;
    }
    void liveService.getSession(sessionId)
      .then((session) => {
        setSessionStartedAt(session.startedAt);
        setSessionPrivacy(session.privacy);
      })
      .catch(() => undefined);
  }, [navigate, sessionId]);

  useEffect(() => {
    if (!routeState?.sessionId) return;
    persistProducerState(routeState);
  }, [routeState]);

  useEffect(() => {
    if (hostToken || !sessionId || !currentUser?.id) return;

    let cancelled = false;
    const recoverHostSession = async () => {
      setIsRecoveringSession(true);
      try {
        const session = await liveService.getSession(sessionId);
        if (cancelled || !isLiveSessionHost(session, currentUser.id)) return;

        const recoveredState = await buildProducerStateForHost(session, currentUser.id, {
          selectedCameraId: preferredCameraId || undefined,
          selectedMicId: preferredMicId || undefined,
        });
        if (cancelled) return;

        persistProducerState(recoveredState);
        navigate(`/live/producer?sessionId=${encodeURIComponent(sessionId)}`, {
          state: recoveredState,
          replace: true,
        });
      } catch (error) {
        if (!cancelled) {
          setLiveError(error instanceof Error ? error.message : 'Không thể khôi phục phiên live của host.');
        }
      } finally {
        if (!cancelled) setIsRecoveringSession(false);
      }
    };

    void recoverHostSession();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, hostToken, navigate, preferredCameraId, preferredMicId, sessionId]);

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

  const flushRecordingSegment = useCallback(async () => {
    const recorder = liveRecorderRef.current;
    if (!recorder) {
      return;
    }

    if (recorder.state === 'recording' || recorder.state === 'paused') {
      recorder.requestData();
      await new Promise<void>((resolve) => {
        recorder.addEventListener('stop', () => resolve(), { once: true });
        recorder.stop();
      });
    } else if (recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.addEventListener('stop', () => resolve(), { once: true });
        recorder.stop();
      });
    }

    liveRecorderRef.current = null;
    if (recordingChunksRef.current.length > 0) {
      allRecordingChunksRef.current.push(...recordingChunksRef.current);
      recordingChunksRef.current = [];
    }
  }, []);

  const startLiveRecording = useCallback((stream: MediaStream) => {
    if (typeof MediaRecorder === 'undefined') return;
    if (!stream.getVideoTracks().length) return;

    try {
      const mimeType = getSupportedRecordingMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType
          ? { mimeType, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 }
          : { videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 },
      );
      recordingChunksRef.current = [];
      if (recordingStartedAtRef.current == null) {
        recordingStartedAtRef.current = Date.now();
      }
      recordingMimeTypeRef.current = recorder.mimeType || mimeType || 'video/webm';
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.start(1000);
      liveRecorderRef.current = recorder;
    } catch {
      liveRecorderRef.current = null;
      recordingStartedAtRef.current = null;
      recordingChunksRef.current = [];
    }
  }, []);

  const stopLiveRecording = useCallback(async () => {
    await flushRecordingSegment();

    if (allRecordingChunksRef.current.length === 0) {
      return null;
    }

    const blob = new Blob(allRecordingChunksRef.current, {
      type: recordingMimeTypeRef.current || 'video/webm',
    });
    allRecordingChunksRef.current = [];
    return blob;
  }, [flushRecordingSegment]);

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
    if (videoSourceMode === 'camera' && !selectedCameraId && !selectedMicId) return;
    let cancelled = false;
    const applyStream = async () => {
      try {
        let stream: MediaStream;
        if (videoSourceMode === 'screen') {
          if (!navigator.mediaDevices?.getDisplayMedia) {
            setMediaError('Trình duyệt không hỗ trợ chia sẻ màn hình.');
            return;
          }
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
          });
          screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
            if (!cancelled) setVideoSourceMode('camera');
          });
          stream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
            audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
          });
        }
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
        setMediaError(videoSourceMode === 'screen'
          ? 'Không thể chia sẻ màn hình. Vui lòng thử lại hoặc chọn camera.'
          : 'Không thể mở camera/microphone đã chọn.');
        if (videoSourceMode === 'screen') {
          setVideoSourceMode('camera');
        }
      }
    };
    void applyStream();
    return () => {
      cancelled = true;
    };
  }, [selectedCameraId, selectedMicId, videoSourceMode, bindStreamToPreview]);

  useEffect(() => {
    let cancelled = false;
    const syncRecording = async () => {
      const stream = localStreamRef.current;
      if (!sessionId || !isMediaReady || !stream) return;

      await flushRecordingSegment();
      if (cancelled) return;
      startLiveRecording(stream);
    };

    void syncRecording();
    return () => {
      cancelled = true;
    };
  }, [flushRecordingSegment, isMediaReady, localStreamVersion, sessionId, startLiveRecording]);

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
          const isScreenVideo = track.kind === 'video' && (
            videoSourceMode === 'screen' || Boolean(track.getSettings().displaySurface)
          );
          await room.localParticipant.publishTrack(track, {
            source: isScreenVideo
              ? Track.Source.ScreenShare
              : track.kind === 'video'
                ? Track.Source.Camera
                : Track.Source.Microphone,
          });
          publishedTracksRef.current.push(track);
        }
        setLiveError('');
      } catch (err) {
        setLiveError(err instanceof Error ? err.message : 'Không thể publish camera/microphone.');
      }
    };

    void publish();
  }, [localStreamVersion, liveStatus, videoSourceMode]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    void bindStreamToPreview(localStreamRef.current);
  }, [mainSection, bindStreamToPreview]);

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
        applyToolState(data);
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
  }, [applyToolState, sessionId]);

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

  const showToolMessage = (message: string) => {
    setToolError('');
    setToolMessage(message);
    window.setTimeout(() => setToolMessage(''), 2200);
  };

  const markToolFormDirty = () => {
    toolFormDirtyRef.current = true;
  };

  const handleSavePoll = async () => {
    if (!sessionId) return;
    try {
      const data = await liveService.upsertPoll(sessionId, {
        enabled: pollEnabled,
        question: pollQuestion,
        options: pollOptions,
      });
      toolFormDirtyRef.current = false;
      applyToolState(data, true);
      showToolMessage('Đã lưu cuộc thăm dò ý kiến cho phiên live.');
    } catch (err) {
      setToolMessage('');
      setToolError(err instanceof Error ? err.message : 'Không thể lưu cuộc thăm dò ý kiến.');
    }
  };

  const handleClearPoll = async () => {
    if (!sessionId) return;
    try {
      const data = await liveService.upsertPoll(sessionId, { enabled: false, question: null, options: [] });
      toolFormDirtyRef.current = false;
      applyToolState(data, true);
      showToolMessage('Đã xóa cuộc thăm dò ý kiến.');
    } catch (err) {
      setToolMessage('');
      setToolError(err instanceof Error ? err.message : 'Không thể xóa thăm dò.');
    }
  };

  const handleSaveFeaturedLink = async () => {
    if (!sessionId) return;
    try {
      const data = await liveService.upsertFeaturedLink(sessionId, {
        title: featuredLinkTitle,
        url: featuredLinkUrl,
      });
      toolFormDirtyRef.current = false;
      applyToolState(data, true);
      showToolMessage('Đã lưu liên kết đáng chú ý.');
    } catch (err) {
      setToolMessage('');
      setToolError(err instanceof Error ? err.message : 'Không thể lưu liên kết.');
    }
  };

  const handleClearFeaturedLink = async () => {
    if (!sessionId) return;
    try {
      const data = await liveService.upsertFeaturedLink(sessionId, { title: null, url: null });
      toolFormDirtyRef.current = false;
      applyToolState(data, true);
      showToolMessage('Đã xóa liên kết đáng chú ý.');
    } catch (err) {
      setToolMessage('');
      setToolError(err instanceof Error ? err.message : 'Không thể xóa liên kết.');
    }
  };

  const handleSaveHostNotice = async () => {
    if (!sessionId) return;
    try {
      const data = await liveService.upsertHostNotice(sessionId, { notice: hostNotice });
      toolFormDirtyRef.current = false;
      applyToolState(data, true);
      showToolMessage('Đã lưu thông báo host.');
    } catch (err) {
      setToolMessage('');
      setToolError(err instanceof Error ? err.message : 'Không thể lưu thông báo.');
    }
  };

  const handleEndLive = async () => {
    if (isEndingLive) return;
    setIsEndingLive(true);
    setLiveError('');

    try {
      if (sessionId) {
        const recording = await stopLiveRecording();
        roomRef.current?.disconnect();
        localStreamRef.current?.getTracks().forEach((track) => track.stop());

        await liveService.endSession(sessionId);

        if (recording && recording.size > 0 && currentUser?.id) {
          const startedAt = recordingStartedAtRef.current;
          const durationSec = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : undefined;
          try {
            await liveService.uploadRecording(sessionId, recording, durationSec);
            toast.success('Đã lưu bản ghi phát lại live.');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tải bản ghi live lên server';
            await liveService.markRecordingFailed(sessionId, message).catch(() => undefined);
            toast.error(message || 'Không thể lưu bản ghi live. Vui lòng kiểm tra cấu hình Cloudinary trên server.');
          }
        } else if (currentUser?.id) {
          await liveService.markRecordingFailed(
            sessionId,
            'Không ghi được video từ phiên live. Vui lòng kiểm tra quyền camera/micro và thử lại.',
          ).catch(() => undefined);
        }
      }
      navigate('/live');
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : 'Không thể kết thúc phiên live.');
      setIsEndingLive(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-14 flex min-w-0">
        <aside className="w-[300px] shrink-0 border-r border-border bg-card h-[calc(100vh-56px)] sticky top-14 overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground leading-tight">Bảng điều khiển phát trực tiếp</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Hiện tại, khi phát trực tiếp, bạn có thể xem thông tin chi tiết tức thì hoặc thêm công cụ để tăng khả năng phân phối/tương tác.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm"><span className="font-semibold text-foreground">{currentUserName}</span> đang phát trực tiếp.</p>
                <p className="text-xs text-muted-foreground">Vừa xong</p>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <button onClick={() => setMainSection('dashboard')} className={`w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 ${mainSection === 'dashboard' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-foreground' : 'hover:bg-muted text-foreground'}`}>
              <span className={`h-10 w-10 rounded-full flex items-center justify-center ${mainSection === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground'}`}>
                <Monitor className="w-5 h-5" />
              </span>
              Bảng điều khiển
            </button>

            <button onClick={() => setMainSection('details')} className={`w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 ${mainSection === 'details' ? 'bg-emerald-50 text-foreground' : 'hover:bg-muted text-foreground'}`}>
              <span className={`h-10 w-10 rounded-full flex items-center justify-center ${mainSection === 'details' ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground'}`}>
                <ChartNoAxesColumn className="w-5 h-5" />
              </span>
              Thông tin chi tiết
            </button>

            <div>
              <button onClick={() => setMainSection('settings')} className={`w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 ${mainSection === 'settings' ? 'bg-emerald-50 text-foreground' : 'hover:bg-muted text-foreground'}`}>
                <span className={`h-10 w-10 rounded-full flex items-center justify-center ${mainSection === 'settings' ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground'}`}>
                  <Settings className="w-5 h-5" />
                </span>
                Cài đặt
                <ChevronDown className="ml-auto w-5 h-5 text-muted-foreground" />
              </button>

              {mainSection === 'settings' && (
                <div className="ml-14 mt-1 space-y-1">
                  <button onClick={() => setSettingsSub('video')} className={`block w-full text-left rounded-lg px-3 py-2 font-medium ${settingsSub === 'video' ? 'bg-emerald-50 text-foreground' : 'hover:bg-muted text-foreground'}`}>Video đang phát</button>
                </div>
              )}
            </div>

            <button onClick={() => setMainSection('dashboard')} className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-muted text-foreground">
              <span className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><Sparkles className="w-5 h-5" /></span>
              Tương tác
            </button>
            <button onClick={() => setMainSection('dashboard')} className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-muted text-foreground">
              <span className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><Activity className="w-5 h-5" /></span>
              Phân phối
            </button>
            <button onClick={() => setMainSection('details')} className="w-full rounded-xl px-3 py-3 text-left font-semibold flex items-center gap-3 hover:bg-muted text-foreground">
              <span className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><Bell className="w-5 h-5" /></span>
              Báo cáo sự cố
            </button>
          </div>

          <div className="p-4 mt-2 border-t border-border sticky bottom-0 bg-card">
            <div className="flex items-center gap-2 text-red-500 font-semibold text-sm mb-3">
              <span className={`h-2 w-2 rounded-full bg-red-500 ${isEndingLive ? '' : 'animate-pulse'}`} />
              <LiveTimer startedAt={sessionStartedAt} paused={isEndingLive} />
            </div>
            <button
              onClick={() => void handleEndLive()}
              disabled={isEndingLive}
              className="w-full rounded-xl bg-red-600 text-white font-semibold py-2.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isEndingLive ? 'Đang kết thúc...' : 'Kết thúc video trực tiếp'}
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-5 xl:p-6">
          {(toolMessage || toolError || isRecoveringSession) && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${ toolError ? 'bg-red-50 text-red-700' : isRecoveringSession ? 'bg-emerald-50 text-emerald-700' : 'bg-green-50 text-green-700' }`}>
              {toolError || (isRecoveringSession ? 'Đang khôi phục phiên live của host...' : toolMessage)}
            </div>
          )}

          {mainSection === 'dashboard' && (
            <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
              <div className="min-w-0 space-y-4">
                <section className="rounded-2xl border border-border bg-card p-4">
                  <div className="relative aspect-video rounded-xl bg-black overflow-hidden">
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
                  <div className="mt-3 text-base font-semibold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-foreground" /> {liveStatus}</div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Hoạt động trong Live</h3>
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-background p-3 text-center">
                      <p className="text-xs text-muted-foreground">Số người đang xem</p>
                      <p className="text-2xl font-bold mt-1">{viewerCount}</p>
                    </div>
                    <div className="rounded-xl bg-background p-3 text-center">
                      <p className="text-xs text-muted-foreground">Số bình luận hiện tại</p>
                      <p className="text-2xl font-bold mt-1">{commentCount}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Thông tin chi tiết</h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 rounded-xl bg-background p-3">
                      <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xl font-bold leading-none">{viewerCount}</p>
                        <p className="text-xs text-muted-foreground truncate">Người xem</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-background p-3">
                      <MessageCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xl font-bold leading-none">{commentCount}</p>
                        <p className="text-xs text-muted-foreground truncate">Bình luận</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-background p-3">
                      <ThumbsUp className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xl font-bold leading-none">{reactionCount}</p>
                        <p className="text-xs text-muted-foreground truncate">Cảm xúc</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-background p-3">
                      <Share2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xl font-bold leading-none">{shareCount}</p>
                        <p className="text-xs text-muted-foreground truncate">Lượt chia sẻ</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setMainSection('details')} className="w-full rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold py-2">Xem thông tin chi tiết</button>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Số liệu về video đang phát</h3>
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-background p-3">
                      <p className="text-xs text-muted-foreground">Tốc độ bit video</p>
                      <p className="mt-1 text-lg font-bold">{mediaStats.videoBitrateKbps == null ? 'Đang đo' : `${mediaStats.videoBitrateKbps} Kbps`}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mediaStats.width && mediaStats.height ? `${mediaStats.width}×${mediaStats.height}` : 'Chưa có độ phân giải'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-background p-3">
                      <p className="text-xs text-muted-foreground">Tỷ lệ khung hình</p>
                      <p className="mt-1 text-lg font-bold">{mediaStats.fps == null ? 'Đang đo' : `${mediaStats.fps} fps`}</p>
                      <p className="mt-1 text-xs text-muted-foreground">WebRTC / camera</p>
                    </div>
                    <div className="rounded-xl bg-background p-3 sm:col-span-1">
                      <p className="text-xs text-muted-foreground">Tốc độ bit âm thanh</p>
                      <p className="mt-1 text-lg font-bold">{mediaStats.audioBitrateKbps == null ? 'Đang đo' : `${mediaStats.audioBitrateKbps} Kbps`}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Cập nhật ~2 giây</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-4">
                <section className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="text-lg font-bold mb-3">Bình luận</h3>
                  <LiveCommentPanel
                    postId={postId || undefined}
                    sessionId={sessionId}
                    hostUserId={currentUser?.id}
                    isHost
                    toolState={toolState}
                    onToolStateChange={setToolState}
                  />
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="text-lg font-bold text-foreground mb-3">Chi tiết bài viết</h3>

                  <div className="rounded-xl border border-border bg-gradient-to-br from-slate-50 to-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {currentUserAvatar ? (
                          <img src={currentUserAvatar} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                          <UserRound className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground leading-tight">{currentUserName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground">
                            <Globe className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            {sessionPrivacy === 'PRIVATE' ? 'Chỉ mình tôi' : sessionPrivacy === 'FRIENDS' ? 'Bạn bè' : 'Công khai'}
                          </div>
                          <p className="text-xs text-muted-foreground">Đang phát trực tiếp</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-base font-semibold text-foreground leading-tight">{liveTitle}</p>
                      {liveDescription && <p className="mt-1 text-sm text-foreground leading-snug">{liveDescription}</p>}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Cuộc thăm dò ý kiến</h3>
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={pollEnabled}
                        onChange={(event) => {
                          markToolFormDirty();
                          setPollEnabled(event.target.checked);
                        }}
                      />
                      Bật thăm dò ý kiến cho phiên live
                    </label>
                    <input
                      value={pollQuestion}
                      onChange={(event) => {
                        markToolFormDirty();
                        setPollQuestion(event.target.value);
                      }}
                      className="w-full rounded-xl bg-background px-4 py-2.5 outline-none"
                      placeholder="Câu hỏi"
                    />
                    {pollOptions.map((option, index) => (
                      <input
                        key={index}
                        value={option}
                        onChange={(event) => {
                          markToolFormDirty();
                          setPollOptions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)));
                        }}
                        className="w-full rounded-xl bg-background px-4 py-2.5 outline-none"
                        placeholder={`Lựa chọn ${index + 1}`}
                      />
                    ))}
                    <button
                      onClick={() => {
                        markToolFormDirty();
                        setPollOptions((prev) => (prev.length >= 6 ? prev : [...prev, '']));
                      }}
                      className="w-full rounded-xl border border-dashed border-emerald-500 text-emerald-600 py-2.5 font-medium"
                    >
                      Thêm lựa chọn
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => void handleClearPoll()} className="rounded-xl bg-muted text-foreground py-2.5 font-semibold">Xóa</button>
                      <button onClick={() => void handleSavePoll()} className="rounded-xl bg-emerald-600 text-white py-2.5 font-semibold">Lưu thăm dò</button>
                    </div>
                    {toolState?.pollQuestion && toolState.pollOptions.length > 0 && (
                      <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 space-y-2">
                        <p>
                          {toolState.pollEnabled
                            ? `Thăm dò đang bật: ${toolState.pollQuestion}`
                            : `Kết quả thăm dò: ${toolState.pollQuestion}`}
                        </p>
                        {toolState.pollOptionCounts && toolState.pollOptions.length > 0 && (
                          <div className="space-y-2">
                            {toolState.pollOptions.map((option, index) => {
                              const count = toolState.pollOptionCounts?.[index] ?? 0;
                              const total = toolState.pollOptionCounts?.reduce((sum, value) => sum + value, 0) ?? 0;
                              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                              return (
                                <div key={`${option}-${index}`} className="rounded-lg bg-card px-3 py-2 text-foreground">
                                  <div className="flex items-center justify-between text-sm font-medium">
                                    <span>{option}</span>
                                    <span>{percent}% ({count})</span>
                                  </div>
                                  <div className="mt-1 h-2 rounded-full bg-muted">
                                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Thông báo</h3>
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    <textarea
                      value={hostNotice}
                      onChange={(event) => {
                        markToolFormDirty();
                        setHostNotice(event.target.value);
                      }}
                      className="min-h-[110px] w-full resize-none rounded-xl bg-background px-4 py-3 outline-none"
                      placeholder="Ghi chú/thông báo cho host hoặc người kiểm duyệt..."
                    />
                    <button onClick={() => void handleSaveHostNotice()} className="w-full rounded-xl bg-emerald-50 text-emerald-700 font-semibold py-2.5">Lưu thông báo</button>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Liên kết đáng chú ý</h3>
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    <input
                      value={featuredLinkTitle}
                      onChange={(event) => {
                        markToolFormDirty();
                        setFeaturedLinkTitle(event.target.value);
                      }}
                      className="w-full rounded-xl bg-background px-4 py-2.5 outline-none"
                      placeholder="Tiêu đề liên kết"
                    />
                    <input
                      value={featuredLinkUrl}
                      onChange={(event) => {
                        markToolFormDirty();
                        setFeaturedLinkUrl(event.target.value);
                      }}
                      className="w-full rounded-xl bg-background px-4 py-2.5 outline-none"
                      placeholder="https://..."
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => void handleClearFeaturedLink()} className="rounded-xl bg-muted text-foreground py-2.5 font-semibold">Xóa</button>
                      <button onClick={() => void handleSaveFeaturedLink()} className="rounded-xl bg-emerald-50 text-emerald-700 font-semibold py-2.5">Lưu liên kết</button>
                    </div>
                    {hasFeaturedLink && (
                      <a href={toolState?.featuredLinkUrl ?? '#'} target="_blank" rel="noreferrer" className="block rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                        {toolState?.featuredLinkTitle}
                      </a>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Liên kết xem trước</h3>
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-foreground mb-3">Xem trước giao diện người xem (không tính vào lượt xem).</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-background px-4 py-2 truncate">{viewerUrl || 'Chưa có liên kết xem trước'}</div>
                    <button onClick={() => navigate(getLiveViewerPreviewUrl(sessionId))} className="rounded-xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2">Xem như người xem</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {mainSection === 'details' && (
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">Thông tin chi tiết</h2>
              <p className="text-muted-foreground">Một số thông tin chi tiết có thể hiển thị chậm hơn so với những gì bạn đang thấy.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold">Số người đang xem</p><p className="text-4xl font-bold mt-2">{viewerCount}</p></div>
                <div className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold">Số người xem đồng thời cao nhất</p><p className="text-4xl font-bold mt-2">{peakViewerCount}</p></div>
                <div className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold">Tổng số bình luận</p><p className="text-4xl font-bold mt-2">{commentCount}</p></div>
                <div className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold">Tổng cảm xúc live</p><p className="text-4xl font-bold mt-2">{reactionCount}</p></div>
                <div className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold">Lượt chia sẻ bài viết</p><p className="text-4xl font-bold mt-2">{shareCount}</p></div>
                <div className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold">Video bitrate</p><p className="text-4xl font-bold mt-2">{mediaStats.videoBitrateKbps == null ? '—' : mediaStats.videoBitrateKbps}</p><p className="text-sm text-muted-foreground">Kbps</p></div>
              </div>
            </div>
          )}

          {mainSection === 'settings' && settingsSub === 'video' && (
            <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-2xl font-bold mb-4">Cài đặt phát trực tiếp</h3>
                <p className="font-semibold mb-1">Độ trễ của video trực tiếp</p>
                <p className="text-muted-foreground mb-6">Độ trễ đang phụ thuộc vào LiveKit/WebRTC và môi trường mạng. UI này chỉ hiển thị trạng thái, chưa đổi cấu hình server.</p>

                <div className="space-y-4">
                  <div className="border-b border-border pb-3"><p className="font-semibold">LiveKit WebRTC</p><p className="text-muted-foreground">Luồng camera/mic được publish trực tiếp vào room LiveKit.</p></div>
                  <div className="border-b border-border pb-3"><p className="font-semibold">Người xem hiện tại</p><p className="text-muted-foreground">{viewerCount} người đang kết nối vào phiên live.</p></div>
                  <div><p className="font-semibold">Chất lượng gửi lên</p><p className="text-muted-foreground">{mediaStats.videoBitrateKbps == null ? 'Đang đo bitrate video.' : `${mediaStats.videoBitrateKbps} Kbps video`}</p></div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-2xl font-bold mb-4">Kiểm soát camera</h3>
                <p className="text-muted-foreground mb-4">Trước khi phát trực tiếp, hãy kiểm tra xem đầu vào camera và micrô đã hoạt động đúng cách chưa.</p>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-foreground">Camera</label>
                  <div className="relative">
                    <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm"
                    >
                      {cameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || 'Camera mặc định'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="block text-sm font-semibold text-foreground">Microphone</label>
                  <div className="relative">
                    <Mic className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={selectedMicId}
                      onChange={(e) => setSelectedMicId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm"
                    >
                      {microphones.map((mic) => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label || 'Microphone mặc định'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={isStartingScreenShare}
                    onClick={() => {
                      setIsStartingScreenShare(true);
                      if (videoSourceMode === 'screen') {
                        setVideoSourceMode('camera');
                        setIsStartingScreenShare(false);
                        return;
                      }
                      setVideoSourceMode('screen');
                      setIsStartingScreenShare(false);
                    }}
                    className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${ videoSourceMode === 'screen' ? 'bg-emerald-600 text-white' : 'bg-background text-foreground' }`}
                  >
                    <Monitor className="h-4 w-4" />
                    {videoSourceMode === 'screen' ? 'Đang chia sẻ màn hình — chuyển về camera' : 'Chia sẻ màn hình'}
                  </button>
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
