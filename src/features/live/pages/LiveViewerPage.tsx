import { MoreHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import Hls from 'hls.js';
import { toast } from 'sonner';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveSessionRealtimeEvent, type LiveSessionResponse, type LiveSessionToolStateResponse, type UpsertLiveReactionRequest } from '@/services/liveService';
import { LiveCommentPanel } from '../components/LiveCommentPanel';
import { LiveSidebarInfoCard } from '../components/LiveSidebarInfoCard';
import { LiveFloatingReactions, useLiveReactionBursts } from '../components/LiveFloatingReactions';
import { isLiveSessionHost, navigateToLiveSession } from '../utils/navigateToLiveSession';
import { useLiveSessionSocket } from '../hooks/useLiveSessionSocket';
import { useLiveHlsPlayback } from '../hooks/useLiveHlsPlayback';
import { LiveViewerScrubBar } from '../components/LiveViewerScrubBar';

const LIVE_EDGE_THRESHOLD_SEC = 2;

const reactions: Array<{ label: string; value: NonNullable<UpsertLiveReactionRequest['reactionType']> }> = [
  { label: '👍', value: 'LIKE' },
  { label: '❤️', value: 'LOVE' },
  { label: '😆', value: 'HAHA' },
  { label: '😮', value: 'WOW' },
  { label: '😢', value: 'SAD' },
  { label: '😡', value: 'ANGRY' },
];

const isPlayableUrl = (value?: string | null) => /^https?:\/\//i.test(value?.trim() ?? '');

async function isHlsPlaylistReachable(url: string) {
  try {
    const response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store' });
    if (!response.ok) return false;
    const text = await response.text();
    return text.includes('#EXTM3U');
  } catch {
    return false;
  }
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const safe = Math.floor(seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatLiveElapsed(startedAt?: string | null) {
  if (!startedAt) return '00:00';
  const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSec / 3600);
  const minutes = Math.floor((elapsedSec % 3600) / 60);
  const seconds = elapsedSec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LiveViewerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get('sessionId') ?? '';
  const isViewerPreview = params.get('preview') === '1';
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id ?? '';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState<LiveSessionResponse | null>(null);
  const [status, setStatus] = useState('Đang tải phiên live...');
  const [error, setError] = useState('');
  const [activeReaction, setActiveReaction] = useState<UpsertLiveReactionRequest['reactionType']>(null);
  const [toolState, setToolState] = useState<LiveSessionToolStateResponse | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerSectionRef = useRef<HTMLElement | null>(null);
  const [liveElapsed, setLiveElapsed] = useState('00:00');
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const [isReacting, setIsReacting] = useState(false);
  const [isVotingPoll, setIsVotingPoll] = useState(false);
  const { bursts, pushBurst } = useLiveReactionBursts();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<RemoteTrack | null>(null);
  const audioTrackRef = useRef<RemoteTrack | null>(null);
  const replayVideoRef = useRef<HTMLVideoElement | null>(null);
  const replayScrubbingRef = useRef(false);
  const playbackSourceRef = useRef<'hls' | 'webrtc'>('webrtc');
  const intentionalDisconnectRef = useRef(false);
  const [replayCurrentSeconds, setReplayCurrentSeconds] = useState(0);
  const [replayDurationSeconds, setReplayDurationSeconds] = useState(0);
  const [isReplayPaused, setIsReplayPaused] = useState(false);
  const [hlsVodReady, setHlsVodReady] = useState(false);
  const [resolvedReplayUrl, setResolvedReplayUrl] = useState('');
  const [hlsLoadFailed, setHlsLoadFailed] = useState(false);
  const [isDvrMode, setIsDvrMode] = useState(false);

  const isLiveEnded = session?.status === 'ENDED' || session?.status === 'CANCELED';
  const candidateReplayUrl = isLiveEnded && isPlayableUrl(session?.playbackUrl) ? session?.playbackUrl?.trim() ?? '' : '';
  const isHlsVodCandidate = /\.m3u8(\?|$)/i.test(candidateReplayUrl);
  const replayUrl = isHlsVodCandidate ? (hlsVodReady && resolvedReplayUrl ? resolvedReplayUrl : '') : candidateReplayUrl;
  const isReplay = Boolean(replayUrl);
  const isInitialSessionLoading = !session && !error;
  const isReplayExperience = isInitialSessionLoading || isLiveEnded;
  const isHlsReplay = useMemo(() => /\.m3u8(\?|$)/i.test(replayUrl), [replayUrl]);
  const isActiveLiveSession = Boolean(session && !isLiveEnded && !isReplay && session.status === 'LIVE');
  const hlsPlaybackUrl = isPlayableUrl(session?.hlsPlaybackUrl) ? session?.hlsPlaybackUrl?.trim() : '';
  const useHlsPlayback = isActiveLiveSession && Boolean(hlsPlaybackUrl) && !hlsLoadFailed;

  const hlsPlayback = useLiveHlsPlayback({
    enabled: useHlsPlayback,
    hlsUrl: hlsPlaybackUrl,
    startedAt: session?.startedAt,
    onFatalError: () => setHlsLoadFailed(true),
  });

  const hlsReady = useHlsPlayback && hlsPlayback.isReady;

  // Hybrid playback:
  // - Live edge: phát WebRTC để gần real-time, không bị độ trễ HLS.
  // - DVR/tua lại: phát HLS playback.m3u8 để tua được từ đầu buổi live.
  // HLS vẫn chạy nền khi ở WebRTC để giữ seekable timeline cho thanh tua.
  const playbackSource: 'hls' | 'webrtc' = isDvrMode && hlsReady ? 'hls' : 'webrtc';
  playbackSourceRef.current = playbackSource;

  const isAtLiveEdge = playbackSource === 'webrtc';
  const playbackSeconds = hlsReady
    ? (isDvrMode ? hlsPlayback.playbackSeconds : hlsPlayback.bufferedSeconds)
    : 0;
  const bufferedSeconds = hlsReady ? hlsPlayback.bufferedSeconds : 0;
  // Egress HLS bắt đầu trễ vài giây sau lúc phát nên DVR (bufferedSeconds) ngắn hơn
  // thời gian thật của buổi live. Cộng offset = khoảng trống đó để NHÃN trên thanh
  // tua hiển thị theo giờ buổi live (khớp đồng hồ "TRỰC TIẾP" góc phải). Toạ độ seek
  // vẫn giữ theo timeline HLS nên logic tua không đổi.
  const displayOffsetSeconds = hlsReady
    ? Math.max(0, liveElapsedSeconds - hlsPlayback.bufferedSeconds)
    : 0;
  const canScrub = hlsReady ? hlsPlayback.canScrub : false;

  // Nhãn đồng hồ:
  // - Live edge (đang xem WebRTC, gần real-time): dùng đồng hồ tường (now - startedAt)
  //   để KHỚP với đồng hồ của người phát. Trước đây dùng bufferedSeconds (timeline
  //   HLS) nên trễ ~5s + bắt đầu muộn → nhìn như lệch ~10s dù video chỉ trễ ~1s.
  // - DVR (đang tua lại bằng HLS): hiển thị đúng vị trí phát trên timeline HLS.
  const liveTimerLabel = isDvrMode && hlsReady
    ? formatClock(hlsPlayback.playbackSeconds + displayOffsetSeconds)
    : liveElapsed;

  useEffect(() => {
    setHlsLoadFailed(false);
  }, [hlsPlaybackUrl]);

  useEffect(() => {
    if (!hlsReady) {
      setIsDvrMode(false);
    }
  }, [hlsReady]);

  // Gắn/tháo track WebRTC theo nguồn đang phát. Khi dùng HLS thì tháo track WebRTC
  // (không phát tiếng song song gây vọng), nhưng vẫn giữ room kết nối để fallback.
  useEffect(() => {
    if (playbackSource === 'webrtc') {
      if (videoTrackRef.current && videoRef.current) {
        videoTrackRef.current.attach(videoRef.current);
      }
      if (audioTrackRef.current && audioRef.current) {
        audioTrackRef.current.attach(audioRef.current);
      }
      return;
    }
    videoTrackRef.current?.detach();
    audioTrackRef.current?.detach();
  }, [playbackSource]);

  const hostLabel = useMemo(() => {
    if (!session) return 'Người dùng';
    return session.title || 'Video trực tiếp';
  }, [session]);

  const handleLiveEvent = useCallback((event: LiveSessionRealtimeEvent) => {
    if (event.session) {
      setSession(event.session);
    } else if (event.viewerCount != null || event.totalReactionCount != null) {
      setSession((prev) => prev ? {
        ...prev,
        viewerCount: event.viewerCount ?? prev.viewerCount,
        peakViewerCount: event.peakViewerCount ?? prev.peakViewerCount,
        totalReactionCount: event.totalReactionCount ?? prev.totalReactionCount,
      } : prev);
    }
    if (event.type === 'REACTION_UPDATED') {
      if (event.reactedUserId === currentUserId) {
        setActiveReaction(event.reactionType ?? null);
      }
      if (event.reactionType) {
        pushBurst(event.reactionType);
      }
    }
    if (event.tools) {
      setToolState(event.tools);
    }
    if (event.type === 'LIVE_ENDED') {
      intentionalDisconnectRef.current = true;
      roomRef.current?.disconnect();
      setStatus('Live đã kết thúc.');
      setError('');
      if (!isViewerPreview && currentUserId && sessionId) {
        void liveService.leaveSession(sessionId).catch(() => undefined);
      }
    }
  }, [currentUserId, isViewerPreview, pushBurst, sessionId]);

  useLiveSessionSocket(sessionId, Boolean(currentUser), handleLiveEvent);

  useEffect(() => {
    if (!sessionId || !currentUserId) {
      setError('Thiếu sessionId hoặc người dùng chưa đăng nhập.');
      setStatus('Không thể mở live.');
      return;
    }

    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    const attachTrack = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        videoTrackRef.current = track;
        if (playbackSourceRef.current === 'webrtc' && videoRef.current) {
          track.attach(videoRef.current);
        }
      }
      if (track.kind === Track.Kind.Audio) {
        audioTrackRef.current = track;
        if (playbackSourceRef.current === 'webrtc' && audioRef.current) {
          track.attach(audioRef.current);
        }
      }
    };

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.Disconnected, () => {
      if (cancelled || intentionalDisconnectRef.current) {
        return;
      }
      setStatus('Live đã ngắt kết nối.');
    });

    const connect = async () => {
      try {
        const liveSession = await liveService.getSession(sessionId);
        if (cancelled) return;
        if (!isViewerPreview && isLiveSessionHost(liveSession, currentUserId)) {
          await navigateToLiveSession(liveSession, currentUserId, navigate);
          return;
        }
        setSession(liveSession);
        if (liveSession.status === 'ENDED' || liveSession.status === 'CANCELED') {
          if (liveSession.recordingStatus === 'PROCESSING' && !isPlayableUrl(liveSession.playbackUrl)) {
            setStatus('Bản ghi live đang được xử lý...');
            return;
          }
          if (liveSession.recordingStatus === 'FAILED' && !isPlayableUrl(liveSession.playbackUrl)) {
            setStatus('Không thể tạo bản ghi phát lại cho phiên live này.');
            return;
          }
          setStatus('Live đã kết thúc.');
          return;
        }
        if (liveSession.status === 'SCHEDULED') {
          setStatus('Live đã được lên lịch. Chờ host bắt đầu phát.');
          return;
        }
        if (!isViewerPreview) {
          const joinedSession = await liveService.joinSession(sessionId);
          if (!cancelled) setSession(joinedSession);
        }
        try {
          const reaction = await liveService.getReaction(sessionId);
          if (!cancelled) setActiveReaction(reaction.reactionType ?? null);
        } catch {
          // Reaction state is optional on first load.
        }
        const token = await liveService.getToken({ sessionId, userId: currentUserId, role: 'VIEWER' });
        await room.connect(token.livekitUrl, token.token);
        if (cancelled) return;
        setStatus('Đang xem trực tiếp.');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không thể tham gia live.');
          setStatus('Không thể mở live.');
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      intentionalDisconnectRef.current = true;
      room.disconnect();
      roomRef.current = null;
      if (!isViewerPreview) {
        void liveService.leaveSession(sessionId).catch(() => undefined);
      }
    };
  }, [currentUserId, isViewerPreview, navigate, sessionId]);

  useEffect(() => {
    if (!sessionId || !currentUserId || isLiveEnded || isViewerPreview) return;
    const sendHeartbeat = async () => {
      try {
        const updated = await liveService.heartbeat(sessionId);
        setSession(updated);
      } catch {
        try {
          const updated = await liveService.getSession(sessionId);
          setSession(updated);
        } catch {
          // The main LiveKit connection handles visible errors.
        }
      }
    };
    const interval = window.setInterval(() => void sendHeartbeat(), 15000);
    return () => window.clearInterval(interval);
  }, [currentUserId, isLiveEnded, isViewerPreview, sessionId]);

  useEffect(() => {
    if (!sessionId || !isActiveLiveSession || hlsPlaybackUrl) return;
    let cancelled = false;
    const pollHls = async () => {
      try {
        const updated = await liveService.getSession(sessionId);
        if (cancelled) return;
        if (isPlayableUrl(updated.hlsPlaybackUrl)) {
          setSession(updated);
        }
      } catch {
        // Retry on next interval.
      }
    };
    void pollHls();
    const interval = window.setInterval(() => void pollHls(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hlsPlaybackUrl, isActiveLiveSession, sessionId]);

  useEffect(() => {
    if (!candidateReplayUrl || !isHlsVodCandidate) {
      setHlsVodReady(false);
      setResolvedReplayUrl('');
      return;
    }

    const urlsToTry = [candidateReplayUrl];
    const livePlaylistUrl = isPlayableUrl(session?.hlsPlaybackUrl) ? session!.hlsPlaybackUrl!.trim() : '';
    if (livePlaylistUrl && livePlaylistUrl !== candidateReplayUrl) {
      urlsToTry.push(livePlaylistUrl);
    }

    let cancelled = false;
    const pollPlaylist = async () => {
      for (const url of urlsToTry) {
        if (cancelled) return;
        if (await isHlsPlaylistReachable(url)) {
          setResolvedReplayUrl(url);
          setHlsVodReady(true);
          return;
        }
      }
    };

    void pollPlaylist();
    const interval = window.setInterval(() => void pollPlaylist(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [candidateReplayUrl, isHlsVodCandidate, session?.hlsPlaybackUrl]);

  useEffect(() => {
    if (!isLiveEnded) return;
    if (session?.recordingStatus === 'FAILED') {
      setStatus(session.recordingError || 'Không thể tạo bản ghi phát lại cho phiên live này.');
      setError('');
      return;
    }
    if (isHlsVodCandidate && !hlsVodReady) {
      setStatus('Đang lưu bản ghi HLS lên R2...');
      setError('');
      return;
    }
    if (isPlayableUrl(replayUrl)) {
      setStatus('Phát lại bản ghi live.');
      setError('');
      return;
    }
    setStatus('Live đã kết thúc.');
  }, [hlsVodReady, isHlsVodCandidate, isLiveEnded, replayUrl, session?.recordingError, session?.recordingStatus]);

  useEffect(() => {
    if (!isLiveEnded) return;
    roomRef.current?.disconnect();
  }, [isLiveEnded]);

  useEffect(() => {
    if (!sessionId) return;
    if (!isLiveEnded) return;
    if (isPlayableUrl(replayUrl)) return;
    if (session?.recordingStatus !== 'PROCESSING') return;

    let cancelled = false;
    const pollRecording = async () => {
      try {
        const updated = await liveService.getSession(sessionId);
        if (cancelled) return;
        setSession(updated);
        if (isPlayableUrl(updated.playbackUrl)) {
          if (/\.m3u8(\?|$)/i.test(updated.playbackUrl ?? '')) {
            const ready = await isHlsPlaylistReachable(updated.playbackUrl!.trim());
            if (ready) setHlsVodReady(true);
          }
          setStatus('Phát lại bản ghi live.');
          setError('');
        } else if (updated.recordingStatus === 'FAILED') {
          setStatus(updated.recordingError || 'Không thể tạo bản ghi phát lại cho phiên live này.');
        }
      } catch {
        // Keep polling until upload completes or user leaves.
      }
    };

    void pollRecording();
    const interval = window.setInterval(() => void pollRecording(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isLiveEnded, replayUrl, session?.recordingStatus, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const loadTools = async () => {
      try {
        const data = await liveService.getTools(sessionId);
        if (!cancelled) setToolState(data);
      } catch {
        if (!cancelled) setToolState(null);
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
    if (!session?.startedAt || isLiveEnded) return;
    const startMs = new Date(session.startedAt).getTime();
    const updateElapsed = () => {
      setLiveElapsed(formatLiveElapsed(session.startedAt));
      setLiveElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [isLiveEnded, session?.startedAt]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted || playbackSource !== 'webrtc';
      audioRef.current.volume = volume;
    }
    if (hlsPlayback.videoRef.current) {
      hlsPlayback.videoRef.current.muted = isMuted;
      hlsPlayback.videoRef.current.volume = volume;
    }
    if (replayVideoRef.current) {
      replayVideoRef.current.muted = isMuted;
      replayVideoRef.current.volume = volume;
    }
  }, [hlsPlayback.videoRef, isMuted, volume, playbackSource]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!isReplay) return;
    const video = replayVideoRef.current;
    if (!video) return;

    setReplayCurrentSeconds(0);
    setReplayDurationSeconds(0);

    let hls: Hls | null = null;

    const finiteEnd = (ranges: TimeRanges) => {
      if (ranges.length === 0) return 0;
      const end = ranges.end(ranges.length - 1);
      return Number.isFinite(end) && end > 0 ? end : 0;
    };

    const resolveDuration = () => {
      // Ưu tiên duration chuẩn; nếu Infinity/NaN (blob MediaRecorder, HLS đang ghi)
      // thì lấy mốc cuối seekable/buffered hoặc currentTime làm thời lượng tạm.
      if (Number.isFinite(video.duration) && video.duration > 0) {
        return video.duration;
      }
      const seekableEnd = finiteEnd(video.seekable);
      if (seekableEnd > 0) return seekableEnd;
      const bufferedEnd = finiteEnd(video.buffered);
      if (bufferedEnd > 0) return bufferedEnd;
      if (Number.isFinite(video.currentTime) && video.currentTime > 0) {
        return video.currentTime;
      }
      return 0;
    };
    const syncDuration = () => {
      const next = resolveDuration();
      if (!Number.isFinite(next) || next <= 0) return;
      // Chỉ tăng (không tụt) để thanh tua không nhảy lùi khi buffer chưa đủ.
      setReplayDurationSeconds((prev) => Math.max(prev, Math.floor(next)));
    };
    const onTimeUpdate = () => {
      syncDuration();
      if (!replayScrubbingRef.current && Number.isFinite(video.currentTime)) {
        setReplayCurrentSeconds(Math.floor(video.currentTime));
      }
    };
    const onPlay = () => setIsReplayPaused(false);
    const onPause = () => setIsReplayPaused(true);

    if (isHlsReplay && Hls.isSupported()) {
      // startPosition: 0 buộc replay phát từ đầu thay vì nhảy về live edge
      // (hls.js mặc định bắt đầu ở cuối nếu playlist chưa có #EXT-X-ENDLIST).
      hls = new Hls({ enableWorker: true, startPosition: 0 });
      hls.loadSource(replayUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        try {
          video.currentTime = 0;
        } catch {
          /* chưa seekable, bỏ qua */
        }
        void video.play().catch(() => undefined);
        syncDuration();
      });
    } else if (isHlsReplay && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari/native HLS: ép về đầu khi đã có metadata.
      video.src = replayUrl;
      const seekToStart = () => {
        try {
          video.currentTime = 0;
        } catch {
          /* bỏ qua */
        }
        video.removeEventListener('loadedmetadata', seekToStart);
      };
      video.addEventListener('loadedmetadata', seekToStart);
    } else {
      // mp4/webm (src gắn qua JSX). Bản ghi từ MediaRecorder thường có
      // duration === Infinity nên không tính được tổng thời lượng. Seek tới cuối
      // một lần để buộc trình duyệt tính duration hữu hạn rồi quay về đầu.
      const fixDuration = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          syncDuration();
          return;
        }
        replayScrubbingRef.current = true;
        const onFixed = () => {
          video.removeEventListener('durationchange', onFixed);
          video.removeEventListener('timeupdate', onFixed);
          // Sau khi seek tới cuối, currentTime thường là mốc cuối thật dù duration vẫn Infinity.
          const estimate = resolveDuration();
          if (Number.isFinite(estimate) && estimate > 0) {
            setReplayDurationSeconds(Math.floor(estimate));
          }
          try {
            video.currentTime = 0;
          } catch {
            /* bỏ qua */
          }
          replayScrubbingRef.current = false;
          void video.play().catch(() => undefined);
        };
        video.addEventListener('durationchange', onFixed, { once: true });
        video.addEventListener('timeupdate', onFixed, { once: true });
        try {
          video.currentTime = 1e101;
        } catch {
          /* bỏ qua */
        }
      };
      if (video.readyState >= 1) {
        fixDuration();
      } else {
        video.addEventListener('loadedmetadata', fixDuration, { once: true });
      }
    }

    syncDuration();
    video.addEventListener('loadedmetadata', syncDuration);
    video.addEventListener('durationchange', syncDuration);
    video.addEventListener('progress', syncDuration);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('loadedmetadata', syncDuration);
      video.removeEventListener('durationchange', syncDuration);
      video.removeEventListener('progress', syncDuration);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      hls?.destroy();
    };
  }, [isHlsReplay, isReplay, replayUrl]);

  const handleReplayTogglePlay = useCallback(() => {
    const video = replayVideoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  // Hybrid scrub: live edge dùng WebRTC; khi người dùng kéo tua thì chuyển sang HLS
  // DVR. Thả gần mép live sẽ quay lại WebRTC để giữ độ trễ thấp.
  const handleLiveSeekStart = () => {
    if (!hlsReady) return;
    setIsDvrMode(true);
    hlsPlayback.setScrubbing(true);
  };

  const handleLiveSeek = (seconds: number) => {
    if (!hlsReady) return;
    setIsDvrMode(true);
    hlsPlayback.previewScrub(seconds);
  };

  const handleScrubEnd = (seconds: number) => {
    if (!hlsReady) return;
    hlsPlayback.setScrubbing(false);
    if (seconds >= bufferedSeconds - LIVE_EDGE_THRESHOLD_SEC) {
      hlsPlayback.goToLive();
      setIsDvrMode(false);
    } else {
      setIsDvrMode(true);
      hlsPlayback.commitScrub(seconds);
    }
  };

  const handleGoLive = () => {
    if (hlsReady) {
      hlsPlayback.goToLive();
    }
    setIsDvrMode(false);
  };

  const handleReaction = async (reactionType: NonNullable<UpsertLiveReactionRequest['reactionType']>) => {
    if (!sessionId || !currentUserId || isLiveEnded || isReacting) return;
    const previousReaction = activeReaction;
    const nextReaction = activeReaction === reactionType ? null : reactionType;
    setActiveReaction(nextReaction);
    setIsReacting(true);
    try {
      const updated = await liveService.react(sessionId, { reactionType: nextReaction });
      setSession(updated);
      if (nextReaction) {
        pushBurst(nextReaction);
      }
    } catch (err) {
      setActiveReaction(previousReaction);
      toast.error(err instanceof Error ? err.message : 'Không thể gửi cảm xúc live.');
    } finally {
      setIsReacting(false);
    }
  };

  const handleVotePoll = async (optionIndex: number) => {
    if (!sessionId || isViewerPreview || isLiveEnded || !currentUserId) return;
    setIsVotingPoll(true);
    try {
      const updated = await liveService.votePoll(sessionId, { optionIndex });
      setToolState(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể bình chọn.');
    } finally {
      setIsVotingPoll(false);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolume(clamped);
    if (clamped > 0) setIsMuted(false);
    if (clamped === 0) setIsMuted(true);
  };

  const handleToggleFullscreen = async () => {
    const el = playerSectionRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* trình duyệt có thể chặn fullscreen */
    }
  };

  const handleReplaySeek = useCallback((seconds: number) => {
    const video = replayVideoRef.current;
    const max = Math.max(replayDurationSeconds, video?.duration || 0, 1);
    const clamped = Math.max(0, Math.min(seconds, max));
    setReplayCurrentSeconds(clamped);
    if (video && !replayScrubbingRef.current) {
      video.currentTime = clamped;
    }
  }, [replayDurationSeconds]);

  const handleReplaySeekEnd = useCallback((seconds: number) => {
    replayScrubbingRef.current = false;
    const video = replayVideoRef.current;
    const max = Math.max(replayDurationSeconds, video?.duration || 0, 1);
    const clamped = Math.max(0, Math.min(seconds, max));
    if (video) {
      video.currentTime = clamped;
      void video.play().catch(() => undefined);
    }
    setReplayCurrentSeconds(clamped);
  }, [replayDurationSeconds]);

  const handleCopyLiveLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setIsMenuOpen(false);
  };

  const handleCloseLive = () => {
    if (session?.postId) {
      navigate(`/home?post=${encodeURIComponent(session.postId)}`);
      return;
    }
    navigate('/live');
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      <Header />

      <div className={`mt-14 grid h-[calc(100vh-3.5rem)] grid-cols-1 gap-0 overflow-hidden ${isReplayExperience ? '' : 'xl:grid-cols-[1.35fr_380px]'}`}>
        <section
          ref={playerSectionRef}
          className="group/player relative h-full bg-black"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onFocus={() => setShowControls(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setShowControls(false);
            }
          }}
        >
          <button
            onClick={handleCloseLive}
            className={`absolute left-4 top-4 z-10 rounded-full bg-black/30 p-1 text-white/90 transition-opacity duration-200 hover:bg-black/50 hover:text-white ${ showControls ? 'opacity-100' : 'pointer-events-none opacity-0' }`}
            aria-label="Đóng"
          >
            <X className="w-8 h-8" />
          </button>

          {!isLiveEnded && isAtLiveEdge && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <span className="rounded-md bg-black/70 px-2 py-1 font-mono text-xs tabular-nums text-white shadow">
                {liveTimerLabel}
              </span>
              <span className="rounded-md bg-red-600 px-2 py-1 text-sm font-semibold text-white">TRỰC TIẾP</span>
            </div>
          )}
          {!isReplayExperience && !isAtLiveEdge && canScrub && (
            <div className="absolute top-4 right-4 rounded-md bg-card/15 text-white text-sm font-semibold px-2 py-1 backdrop-blur-sm">
              TUA LẠI
            </div>
          )}

          <div className={`flex items-center justify-center ${isReplayExperience ? 'h-[calc(100vh-56px)] flex-col' : 'h-[calc(100vh-160px)]'}`}>
            {isReplay ? (
              <>
                <div className="relative flex min-h-0 w-full flex-1 flex-col">
                  <video
                    ref={replayVideoRef}
                    src={isHlsReplay ? undefined : replayUrl}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="min-h-0 w-full flex-1 cursor-pointer object-contain"
                    onClick={handleReplayTogglePlay}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-10">
                    <LiveViewerScrubBar
                      mode="replay"
                      bufferedSeconds={replayDurationSeconds}
                      playbackSeconds={replayCurrentSeconds}
                      isAtLiveEdge={false}
                      canScrub={replayDurationSeconds > 0}
                      isMuted={isMuted}
                      volume={volume}
                      onVolumeChange={handleVolumeChange}
                      isFullscreen={isFullscreen}
                      onToggleFullscreen={handleToggleFullscreen}
                      showControls
                      isPaused={isReplayPaused}
                      onTogglePlay={handleReplayTogglePlay}
                      onSeek={handleReplaySeek}
                      onSeekStart={() => { replayScrubbingRef.current = true; }}
                      onSeekEnd={handleReplaySeekEnd}
                      onGoLive={() => undefined}
                      onToggleMute={handleToggleMute}
                    />
                  </div>
                </div>
              </>
            ) : isReplayExperience ? (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-white">
                <div className="max-w-md rounded-2xl bg-black/40 px-6 py-5 backdrop-blur-sm">
                  <p className="text-lg font-semibold">
                    {isInitialSessionLoading
                      ? 'Đang tải phiên live'
                      : session?.recordingStatus === 'FAILED'
                        ? 'Không thể tạo bản phát lại'
                        : 'Đang chuẩn bị bản phát lại'}
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    {isInitialSessionLoading
                      ? status
                      : session?.recordingStatus === 'FAILED'
                      ? (session.recordingError || 'Bản ghi HLS chưa được tạo thành công.')
                      : status}
                  </p>
                </div>
              </div>
            ) : isActiveLiveSession ? (
              <div className="relative h-full w-full">
                {/* Cả 2 video cùng mounted & buffer nền (KHÔNG dùng sr-only 1x1px vì
                    trình duyệt có thể throttle/không nạp segment video bị thu nhỏ →
                    seekable trống → thanh tua trắng). Ẩn bằng opacity, giữ full-size. */}
                {useHlsPlayback && (
                  <video
                    ref={hlsPlayback.videoRef}
                    autoPlay
                    playsInline
                    muted={playbackSource === 'hls' ? isMuted : true}
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity ${playbackSource === 'hls' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                    aria-hidden={playbackSource !== 'hls'}
                  />
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={`absolute inset-0 h-full w-full object-contain transition-opacity ${playbackSource === 'webrtc' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  aria-hidden={playbackSource !== 'webrtc'}
                />
                <audio ref={audioRef} autoPlay />
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
                <audio ref={audioRef} autoPlay />
              </>
            )}
            {!isReplayExperience && isAtLiveEdge && (error || status !== 'Đang xem trực tiếp.') && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-5 text-center text-white/80">
                <div>
                  <p className="text-lg font-semibold">{error || status}</p>
                  {isLiveEnded && <p className="mt-2 text-sm text-white/70">Bạn có thể quay lại bài viết để xem tương tác của buổi live.</p>}
                </div>
              </div>
            )}
          </div>

          <LiveFloatingReactions bursts={bursts} />

          {!isReplayExperience && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-10">
            {isActiveLiveSession && (
              <LiveViewerScrubBar
                bufferedSeconds={bufferedSeconds}
                playbackSeconds={playbackSeconds}
                displayOffsetSeconds={displayOffsetSeconds}
                isAtLiveEdge={isAtLiveEdge}
                canScrub={canScrub}
                isMuted={isMuted}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
                showControls={showControls}
                onSeek={handleLiveSeek}
                onSeekStart={handleLiveSeekStart}
                onSeekEnd={handleScrubEnd}
                onGoLive={handleGoLive}
                onToggleMute={handleToggleMute}
                fullSession={false}
              />
            )}
            {!isActiveLiveSession && (
              <div
                className={`mb-2 flex items-center gap-3 text-sm text-white transition-opacity duration-200 ${ showControls ? 'opacity-100' : 'pointer-events-none opacity-0' }`}
              >
                <span>{status}</span>
                <span className="min-w-[44px] text-right text-xs text-white/80">{liveElapsed}</span>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="rounded-full p-1 hover:bg-card/10"
                  aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              </div>
            )}
            <div
              className={`flex items-center gap-2 text-3xl transition-opacity duration-200 ${ showControls ? 'opacity-100' : 'pointer-events-none opacity-0' }`}
            >
              {reactions.map((reaction) => (
                <button
                  key={reaction.value}
                  type="button"
                  disabled={isLiveEnded || isReacting}
                  onClick={() => void handleReaction(reaction.value)}
                  className={`rounded-full px-1 transition-transform hover:scale-125 disabled:cursor-not-allowed disabled:opacity-40 ${ activeReaction === reaction.value ? 'bg-card/25 ring-2 ring-white/60 scale-110' : '' }`}
                  aria-label={`Bày tỏ cảm xúc ${reaction.value}`}
                  aria-pressed={activeReaction === reaction.value}
                >
                  {reaction.label}
                </button>
              ))}
            </div>
          </div>
          )}
        </section>

        {!isReplayExperience && (
        <aside className="relative flex h-full flex-col overflow-hidden border-l border-border bg-card p-4">
          <div className="flex shrink-0 items-start gap-3 border-b border-border pb-4">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 min-w-0">
              <p className="text-xl font-semibold text-foreground">{hostLabel}</p>
              <p className="text-sm text-muted-foreground">
                {!session
                  ? 'Đang tải...'
                  : isReplay
                    ? `Phát lại livestream${session.totalReactionCount ? ` · ${session.totalReactionCount} cảm xúc` : ''}`
                    : `${session.viewerCount} người đang xem · ${session.totalReactionCount} cảm xúc`}
              </p>
            </div>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Tùy chọn"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>

          {isMenuOpen && (
            <div className="absolute right-4 top-20 z-20 w-[360px] rounded-xl border border-border bg-card p-2 shadow-xl">
              <button onClick={() => void handleCopyLiveLink()} className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted">
                <p className="font-semibold text-foreground">Sao chép liên kết</p>
              </button>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted">
                <p className="font-semibold text-foreground">Tắt thông báo về bài viết này</p>
              </button>
            </div>
          )}

          {(toolState?.hostNotice || toolState?.featuredLinkUrl || toolState?.pollEnabled) && (
            <div className="mt-4 shrink-0 space-y-3">
              {toolState.hostNotice && (
                <LiveSidebarInfoCard variant="notice">
                  {toolState.hostNotice}
                </LiveSidebarInfoCard>
              )}
              {toolState.featuredLinkUrl && (
                <LiveSidebarInfoCard variant="link">
                  <a
                    href={toolState.featuredLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {toolState.featuredLinkTitle || toolState.featuredLinkUrl}
                  </a>
                </LiveSidebarInfoCard>
              )}
              {toolState.pollEnabled && toolState.pollQuestion && (
                <div className="rounded-xl bg-background p-3">
                  <p className="font-semibold text-foreground">{toolState.pollQuestion}</p>
                  <div className="mt-2 space-y-2">
                    {toolState.pollOptions.map((option, index) => {
                      const count = toolState.pollOptionCounts?.[index] ?? 0;
                      const totalVotes = toolState.pollOptionCounts?.reduce((sum, value) => sum + value, 0) ?? 0;
                      const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                      const isSelected = toolState.myPollOptionIndex === index;
                      const canVote = !isViewerPreview && !isLiveEnded && Boolean(currentUserId);
                      return (
                        <button
                          key={`${option}-${index}`}
                          type="button"
                          disabled={!canVote || isVotingPoll}
                          onClick={() => void handleVotePoll(index)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${ isSelected ? 'bg-emerald-600 text-white' : 'bg-card text-foreground hover:bg-emerald-50' } ${!canVote ? 'cursor-default' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{option}</span>
                            {totalVotes > 0 && (
                              <span className={isSelected ? 'text-emerald-100' : 'text-muted-foreground'}>
                                {percent}% ({count})
                              </span>
                            )}
                          </div>
                          {totalVotes > 0 && (
                            <div className={`mt-1 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-muted'}`}>
                              <div
                                className={`h-1.5 rounded-full ${isSelected ? 'bg-card' : 'bg-emerald-600'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {isLiveEnded && !isViewerPreview && (
                    <p className="mt-2 text-xs text-muted-foreground">Thăm dò đã đóng cùng phiên live.</p>
                  )}
                  {isViewerPreview && (
                    <p className="mt-2 text-xs text-muted-foreground">Chế độ xem trước — không thể bình chọn.</p>
                  )}
                  {!currentUserId && !isViewerPreview && !isLiveEnded && (
                    <p className="mt-2 text-xs text-muted-foreground">Đăng nhập để tham gia bình chọn.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <LiveCommentPanel
            postId={session?.postId ?? undefined}
            sessionId={sessionId}
            hostUserId={session?.hostUserId}
            isHost={Boolean(currentUserId && session?.hostUserId === currentUserId)}
            disabled={isLiveEnded}
            toolState={toolState}
            onToolStateChange={setToolState}
            className="mt-4 min-h-0 flex-1 overflow-hidden"
          />
        </aside>
        )}
      </div>
    </div>
  );
}
