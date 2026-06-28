import { MoreHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { toast } from 'sonner';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveSessionRealtimeEvent, type LiveSessionResponse, type LiveSessionToolStateResponse, type UpsertLiveReactionRequest } from '@/services/liveService';
import { LiveCommentPanel } from '../components/LiveCommentPanel';
import { LiveFloatingReactions, useLiveReactionBursts } from '../components/LiveFloatingReactions';
import { isLiveSessionHost, navigateToLiveSession } from '../utils/navigateToLiveSession';
import { useLiveSessionSocket } from '../hooks/useLiveSessionSocket';
import { useLiveViewerDvr } from '../hooks/useLiveViewerDvr';
import { useLiveHlsPlayback } from '../hooks/useLiveHlsPlayback';
import { LiveViewerScrubBar } from '../components/LiveViewerScrubBar';

const reactions: Array<{ label: string; value: NonNullable<UpsertLiveReactionRequest['reactionType']> }> = [
  { label: '👍', value: 'LIKE' },
  { label: '❤️', value: 'LOVE' },
  { label: '😆', value: 'HAHA' },
  { label: '😮', value: 'WOW' },
  { label: '😢', value: 'SAD' },
  { label: '😡', value: 'ANGRY' },
];

const isPlayableUrl = (value?: string | null) => /^https?:\/\//i.test(value?.trim() ?? '');

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
  const [liveElapsed, setLiveElapsed] = useState('00:00');
  const [isReacting, setIsReacting] = useState(false);
  const [isVotingPoll, setIsVotingPoll] = useState(false);
  const { bursts, pushBurst } = useLiveReactionBursts();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<RemoteTrack | null>(null);
  const audioTrackRef = useRef<RemoteTrack | null>(null);
  const dvrVideoRef = useRef<HTMLVideoElement | null>(null);
  const replayVideoRef = useRef<HTMLVideoElement | null>(null);
  const replayScrubbingRef = useRef(false);
  const dvrDurationFixedRef = useRef<string | null>(null);
  const useHlsPlaybackRef = useRef(false);
  const [replayCurrentSeconds, setReplayCurrentSeconds] = useState(0);
  const [replayDurationSeconds, setReplayDurationSeconds] = useState(0);

  const isLiveEnded = session?.status === 'ENDED' || session?.status === 'CANCELED';
  const replayUrl = isLiveEnded && isPlayableUrl(session?.playbackUrl) ? session?.playbackUrl?.trim() : '';
  const isReplay = Boolean(replayUrl);
  const isActiveLiveSession = Boolean(session && !isLiveEnded && !isReplay && session.status === 'LIVE');
  const hlsPlaybackUrl = isPlayableUrl(session?.hlsPlaybackUrl) ? session?.hlsPlaybackUrl?.trim() : '';
  const useHlsPlayback = isActiveLiveSession && Boolean(hlsPlaybackUrl);

  const hlsPlayback = useLiveHlsPlayback({
    enabled: useHlsPlayback,
    hlsUrl: hlsPlaybackUrl,
    startedAt: session?.startedAt,
  });

  const clientDvr = useLiveViewerDvr(isActiveLiveSession && !useHlsPlayback, session?.startedAt);

  const isAtLiveEdge = useHlsPlayback ? hlsPlayback.isAtLiveEdge : clientDvr.isAtLiveEdge;
  const playbackSeconds = useHlsPlayback ? hlsPlayback.playbackSeconds : clientDvr.playbackSeconds;
  const bufferedSeconds = useHlsPlayback ? hlsPlayback.bufferedSeconds : clientDvr.bufferedSeconds;
  // HLS playlist đã bắt đầu từ đầu buổi live nên currentTime chính là giờ thật (offset 0).
  // Client DVR ghi từ lúc viewer vào nên cần cộng offset để nhãn khớp đồng hồ buổi live.
  const displayOffsetSeconds = useHlsPlayback ? 0 : clientDvr.displayOffsetSeconds;
  const canScrub = useHlsPlayback ? hlsPlayback.canScrub : clientDvr.canScrub;
  const seekTo = useHlsPlayback ? hlsPlayback.seekTo : clientDvr.seekTo;
  const goToLive = useHlsPlayback ? hlsPlayback.goToLive : clientDvr.goToLive;
  const setScrubbing = useHlsPlayback ? hlsPlayback.setScrubbing : clientDvr.setScrubbing;
  const { setSourceStream, reset: resetDvr } = clientDvr;
  const { dvrUrl } = clientDvr;
  const { syncPlaybackFromVideo } = clientDvr;

  useHlsPlaybackRef.current = useHlsPlayback;

  const syncDvrStream = useCallback(() => {
    const tracks = [
      videoTrackRef.current?.mediaStreamTrack,
      audioTrackRef.current?.mediaStreamTrack,
    ].filter((track): track is MediaStreamTrack => Boolean(track && track.readyState === 'live'));
    if (tracks.length === 0) {
      setSourceStream(null);
      return;
    }
    setSourceStream(new MediaStream(tracks));
  }, [setSourceStream]);

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
      roomRef.current?.disconnect();
      resetDvr();
      setSourceStream(null);
      setStatus('Live đã kết thúc.');
      setError('');
      if (!isViewerPreview && currentUserId && sessionId) {
        void liveService.leaveSession(sessionId).catch(() => undefined);
      }
    }
  }, [currentUserId, isViewerPreview, pushBurst, sessionId, resetDvr, setSourceStream]);

  useEffect(() => {
    if (!useHlsPlayback) return;
    roomRef.current?.disconnect();
    setSourceStream(null);
  }, [setSourceStream, useHlsPlayback]);

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
      if (useHlsPlaybackRef.current) return;
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        videoTrackRef.current = track;
        syncDvrStream();
      }
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
        audioTrackRef.current = track;
        syncDvrStream();
      }
    };

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setStatus('Live đã ngắt kết nối.');
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
      room.disconnect();
      roomRef.current = null;
      if (!isViewerPreview) {
        void liveService.leaveSession(sessionId).catch(() => undefined);
      }
    };
  }, [currentUserId, isViewerPreview, navigate, sessionId, syncDvrStream]);

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
    if (!isLiveEnded) return;
    roomRef.current?.disconnect();
    if (isPlayableUrl(session?.playbackUrl)) {
      setStatus('Phát lại bản ghi live.');
      setError('');
      return;
    }
    setStatus('Live đã kết thúc.');
  }, [isLiveEnded, session?.playbackUrl]);

  useEffect(() => {
    if (!sessionId) return;
    if (!isLiveEnded) return;
    if (isPlayableUrl(session?.playbackUrl)) return;
    if (session?.recordingStatus !== 'PROCESSING') return;

    let cancelled = false;
    const pollRecording = async () => {
      try {
        const updated = await liveService.getSession(sessionId);
        if (cancelled) return;
        setSession(updated);
        if (isPlayableUrl(updated.playbackUrl)) {
          setStatus('Phát lại bản ghi live.');
          setError('');
        } else if (updated.recordingStatus === 'FAILED') {
          setStatus('Không thể tạo bản ghi phát lại cho phiên live này.');
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
  }, [isLiveEnded, session?.playbackUrl, session?.recordingStatus, sessionId]);

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
    const updateElapsed = () => setLiveElapsed(formatLiveElapsed(session.startedAt));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [isLiveEnded, session?.startedAt]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted || !isAtLiveEdge || useHlsPlayback;
    }
    if (dvrVideoRef.current) {
      dvrVideoRef.current.muted = isMuted;
    }
    if (hlsPlayback.videoRef.current) {
      hlsPlayback.videoRef.current.muted = isMuted;
    }
    if (replayVideoRef.current) {
      replayVideoRef.current.muted = isMuted;
    }
  }, [hlsPlayback.videoRef, isMuted, isAtLiveEdge, useHlsPlayback, dvrUrl]);

  useEffect(() => {
    if (!isReplay) return;
    const video = replayVideoRef.current;
    if (!video) return;

    const syncDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setReplayDurationSeconds(Math.floor(video.duration));
      }
    };
    const onTimeUpdate = () => {
      if (!replayScrubbingRef.current) {
        setReplayCurrentSeconds(Math.floor(video.currentTime));
      }
    };

    syncDuration();
    video.addEventListener('loadedmetadata', syncDuration);
    video.addEventListener('durationchange', syncDuration);
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      video.removeEventListener('loadedmetadata', syncDuration);
      video.removeEventListener('durationchange', syncDuration);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [isReplay, replayUrl]);

  useEffect(() => {
    if (useHlsPlayback || isAtLiveEdge || !dvrUrl) return;
    const video = dvrVideoRef.current;
    if (!video) return;

    let cancelled = false;

    const playAt = (seconds: number) => {
      if (cancelled) return;
      if (Math.abs(video.currentTime - seconds) > 0.25) {
        try {
          video.currentTime = seconds;
        } catch {
          /* seeking may throw if not seekable yet; ignored */
        }
      }
      void video.play().catch(() => undefined);
    };

    // MediaRecorder blobs from an in-progress live have `duration === Infinity`,
    // which makes Chrome refuse to seek (the frame shows but playback freezes and
    // the reported time snaps back). Force the browser to compute a finite
    // duration by seeking far past the end once, then seek to the real position.
    const seekAndPlay = () => {
      if (cancelled) return;

      if (dvrDurationFixedRef.current === dvrUrl && Number.isFinite(video.duration)) {
        playAt(playbackSeconds);
        return;
      }

      if (!Number.isFinite(video.duration) || video.duration === 0) {
        // Suppress timeupdate syncing while we jump to the end to fix duration.
        setScrubbing(true);
        const onFixed = () => {
          video.removeEventListener('timeupdate', onFixed);
          video.removeEventListener('durationchange', onFixed);
          if (cancelled) return;
          dvrDurationFixedRef.current = dvrUrl;
          setScrubbing(false);
          playAt(playbackSeconds);
        };
        video.addEventListener('timeupdate', onFixed, { once: true });
        video.addEventListener('durationchange', onFixed, { once: true });
        try {
          video.currentTime = 1e101;
        } catch {
          /* ignored */
        }
        return;
      }

      dvrDurationFixedRef.current = dvrUrl;
      playAt(playbackSeconds);
    };

    if (video.src !== dvrUrl) {
      dvrDurationFixedRef.current = null;
      video.src = dvrUrl;
      video.load();
      video.addEventListener('loadedmetadata', seekAndPlay, { once: true });
    } else {
      seekAndPlay();
    }

    return () => {
      cancelled = true;
    };
  }, [dvrUrl, isAtLiveEdge, playbackSeconds, setScrubbing, useHlsPlayback]);

  useEffect(() => {
    if (useHlsPlayback || isAtLiveEdge) return;
    const video = dvrVideoRef.current;
    if (!video) return;
    const onTimeUpdate = () => syncPlaybackFromVideo(video.currentTime);
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [isAtLiveEdge, syncPlaybackFromVideo, useHlsPlayback]);

  const handleScrubEnd = (seconds: number) => {
    setScrubbing(false);
    seekTo(seconds);
    if (seconds >= bufferedSeconds - 2) {
      goToLive();
    }
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

      <div className="mt-14 grid h-[calc(100vh-3.5rem)] grid-cols-1 gap-0 overflow-hidden xl:grid-cols-[1.35fr_380px]">
        <section
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
            <div className="absolute top-4 right-4 rounded-md bg-red-600 text-white text-sm font-semibold px-2 py-1">TRỰC TIẾP</div>
          )}
          {!isLiveEnded && !isAtLiveEdge && canScrub && (
            <div className="absolute top-4 right-4 rounded-md bg-card/15 text-white text-sm font-semibold px-2 py-1 backdrop-blur-sm">
              TUA LẠI
            </div>
          )}

          <div className={`flex items-center justify-center ${isReplay ? 'h-[calc(100vh-56px)] flex-col' : 'h-[calc(100vh-160px)]'}`}>
            {isReplay ? (
              <>
                <div className="relative flex min-h-0 w-full flex-1 flex-col">
                  <video
                    ref={replayVideoRef}
                    src={replayUrl}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="min-h-0 w-full flex-1 object-contain"
                    onClick={() => {
                      const video = replayVideoRef.current;
                      if (!video) return;
                      if (video.paused) {
                        void video.play().catch(() => undefined);
                      } else {
                        video.pause();
                      }
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <LiveViewerScrubBar
                      mode="replay"
                      bufferedSeconds={replayDurationSeconds}
                      playbackSeconds={replayCurrentSeconds}
                      isAtLiveEdge={false}
                      canScrub={replayDurationSeconds > 0}
                      isMuted={isMuted}
                      showControls
                      onSeek={handleReplaySeek}
                      onSeekStart={() => { replayScrubbingRef.current = true; }}
                      onSeekEnd={handleReplaySeekEnd}
                      onGoLive={() => undefined}
                      onToggleMute={handleToggleMute}
                    />
                  </div>
                </div>
                <div className="flex w-full shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-black/80 px-4 py-3 text-3xl">
                  {reactions.map((reaction) => (
                    <button
                      key={reaction.value}
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-full px-1 opacity-40"
                      aria-label={`Cảm xúc ${reaction.value}`}
                    >
                      {reaction.label}
                    </button>
                  ))}
                </div>
              </>
            ) : useHlsPlayback ? (
              <video
                ref={hlsPlayback.videoRef}
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <>
                <div className={isAtLiveEdge ? 'h-full w-full' : 'hidden'}>
                  <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
                  <audio ref={audioRef} autoPlay />
                </div>
                {!isAtLiveEdge && dvrUrl && (
                  <video
                    ref={dvrVideoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="h-full w-full object-contain"
                  />
                )}
                {!isAtLiveEdge && !dvrUrl && canScrub && (
                  <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-white/70">
                    Đang chuẩn bị bản ghi để tua lại...
                  </div>
                )}
              </>
            )}
            {!isReplay && isAtLiveEdge && (error || status !== 'Đang xem trực tiếp.') && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-5 text-center text-white/80">
                <div>
                  <p className="text-lg font-semibold">{error || status}</p>
                  {isLiveEnded && <p className="mt-2 text-sm text-white/70">Bạn có thể quay lại bài viết để xem tương tác của buổi live.</p>}
                </div>
              </div>
            )}
          </div>

          <LiveFloatingReactions bursts={bursts} />

          {!isReplay && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            {isActiveLiveSession && (
              <LiveViewerScrubBar
                bufferedSeconds={bufferedSeconds}
                playbackSeconds={playbackSeconds}
                displayOffsetSeconds={displayOffsetSeconds}
                isAtLiveEdge={isAtLiveEdge}
                canScrub={canScrub}
                isMuted={isMuted}
                showControls={showControls}
                onSeek={seekTo}
                onSeekStart={() => setScrubbing(true)}
                onSeekEnd={handleScrubEnd}
                onGoLive={goToLive}
                onToggleMute={handleToggleMute}
                fullSession={useHlsPlayback}
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
            <div className="flex items-center gap-2 text-3xl">
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

        <aside className="relative flex h-full flex-col overflow-hidden border-l border-border bg-card p-4">
          <div className="flex shrink-0 items-start gap-3 border-b border-border pb-4">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 min-w-0">
              <p className="text-xl font-semibold text-foreground">{hostLabel}</p>
              <p className="text-sm text-muted-foreground">
                {session ? `${session.viewerCount} người đang xem · ${session.totalReactionCount} cảm xúc` : 'Đang tải...'}
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
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                  {toolState.hostNotice}
                </div>
              )}
              {toolState.featuredLinkUrl && (
                <a href={toolState.featuredLinkUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-background p-3 text-sm font-semibold text-emerald-700">
                  {toolState.featuredLinkTitle || toolState.featuredLinkUrl}
                </a>
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
      </div>
    </div>
  );
}
