import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';

const LIVE_EDGE_THRESHOLD_SEC = 10;

type UseLiveHlsPlaybackOptions = {
  enabled: boolean;
  hlsUrl?: string | null;
  startedAt?: string | null;
  onFatalError?: () => void;
};

function getSeekableRange(video: HTMLVideoElement) {
  if (video.seekable.length === 0) {
    return { start: 0, end: 0 };
  }
  const start = video.seekable.start(0);
  const end = video.seekable.end(video.seekable.length - 1);
  return { start, end: Math.max(start, end) };
}

export function useLiveHlsPlayback({ enabled, hlsUrl, startedAt, onFatalError }: UseLiveHlsPlaybackOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isScrubbingRef = useRef(false);
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [bufferedSeconds, setBufferedSeconds] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Giữ callback trong ref để identity của nó KHÔNG làm effect chính chạy lại.
  const onFatalErrorRef = useRef(onFatalError);
  useEffect(() => {
    onFatalErrorRef.current = onFatalError;
  }, [onFatalError]);

  // Chỉ dùng làm độ dài dự phòng KHI seekable chưa sẵn sàng (vài giây đầu).
  const getSessionElapsed = useCallback(() => {
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  }, [startedAt]);

  // Toàn bộ thời gian (live edge + vị trí phát) đều bám theo seekable range THẬT của
  // video.
  const updateFromVideo = useCallback((video: HTMLVideoElement) => {
    const { start, end } = getSeekableRange(video);
    const duration = Math.max(end - start, 0);
    const buffer = duration > 0 ? duration : getSessionElapsed();
    const relative = Math.max(0, Math.min(video.currentTime - start, buffer));
    const atEdge = buffer - relative <= LIVE_EDGE_THRESHOLD_SEC;

    setBufferedSeconds(Math.floor(buffer));
    if (!isScrubbingRef.current) {
      setPlaybackSeconds(Math.floor(atEdge ? buffer : relative));
      setIsAtLiveEdge(atEdge);
    }
  }, [getSessionElapsed]);

  const resumePlayback = useCallback((video: HTMLVideoElement) => {
    const play = () => {
      void video.play().catch(() => undefined);
    };
    play();
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      video.addEventListener('canplay', play, { once: true });
    }
  }, []);

  useEffect(() => {
    if (!enabled || !hlsUrl) {
      setIsReady(false);
      return undefined;
    }

    const video = videoRef.current;
    if (!video) return undefined;

    let hls: Hls | null = null;
    let becameReady = false;
    let recovering = false;
    let manifestRetries = 0;
    const MAX_MANIFEST_RETRIES = 40;
    let retryTimer = 0;
    setIsReady(false);

    const scheduleReload = () => {
      if (retryTimer) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = 0;
        if (!hls) return;
        try {
          hls.loadSource(hlsUrl);
          hls.startLoad();
        } catch {
          /* hls đã destroy */
        }
      }, 1500);
    };

    const onTimeUpdate = () => updateFromVideo(video);
    const onLoadedMetadata = () => {
      setIsReady(true);
      updateFromVideo(video);
    };
    const onWaiting = () => {
      if (!isScrubbingRef.current && !video.paused) {
        resumePlayback(video);
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: Infinity,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 600,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        becameReady = true;
        manifestRetries = 0;
        setIsReady(true);
        resumePlayback(video);
        updateFromVideo(video);
      });
      hls.on(Hls.Events.LEVEL_UPDATED, () => updateFromVideo(video));
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || !hls) return;

        if (!becameReady) {
          manifestRetries += 1;
          if (manifestRetries <= MAX_MANIFEST_RETRIES) {
            scheduleReload();
            return;
          }
          onFatalErrorRef.current?.();
          return;
        }
        if (recovering) return;
        recovering = true;
        window.setTimeout(() => { recovering = false; }, 3000);

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      const loadNative = () => {
        video.src = hlsUrl;
        resumePlayback(video);
      };
      const onNativeError = () => {
        if (becameReady) return;
        manifestRetries += 1;
        if (manifestRetries <= MAX_MANIFEST_RETRIES) {
          window.setTimeout(loadNative, 1500);
          return;
        }
        onFatalErrorRef.current?.();
      };
      video.addEventListener('loadedmetadata', () => { becameReady = true; onLoadedMetadata(); });
      video.addEventListener('error', onNativeError);
      loadNative();
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('waiting', onWaiting);
    const tick = window.setInterval(() => updateFromVideo(video), 1000);

    return () => {
      window.clearInterval(tick);
      if (retryTimer) window.clearTimeout(retryTimer);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [enabled, hlsUrl, resumePlayback, updateFromVideo]);

  /** Chỉ cập nhật nhãn khi đang kéo — không seek video (tránh giật khi rê chuột). */
  const previewScrub = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, bufferedSeconds));
    setPlaybackSeconds(Math.floor(clamped));
    setIsAtLiveEdge(bufferedSeconds - clamped <= LIVE_EDGE_THRESHOLD_SEC);
  }, [bufferedSeconds]);

  /**
   * Seek thật khi thả chuột. Chỉ set video.currentTime trong seekable range —
   * hls.js tự nạp đúng segment ở vị trí đó. KHÔNG gọi stopLoad/startLoad (gây đứng hình).
   */
  const commitScrub = useCallback((seconds: number) => {
    isScrubbingRef.current = false;
    const video = videoRef.current;
    if (!video) return;

    const { start, end } = getSeekableRange(video);
    const duration = Math.max(end - start, 0);
    const clamped = Math.max(0, Math.min(seconds, duration));
    const atEdge = duration - clamped <= LIVE_EDGE_THRESHOLD_SEC;

    try {
      video.currentTime = start + clamped;
    } catch {
      /* seekable chưa sẵn sàng */
    }

    setPlaybackSeconds(Math.floor(clamped));
    setIsAtLiveEdge(atEdge);
    resumePlayback(video);
  }, [resumePlayback]);

  const seekTo = useCallback((seconds: number) => {
    commitScrub(seconds);
  }, [commitScrub]);

  const goToLive = useCallback(() => {
    isScrubbingRef.current = false;
    const video = videoRef.current;
    if (!video) return;

    const { start, end } = getSeekableRange(video);
    const target = end > start ? Math.max(end - 0.5, start) : end;

    try {
      video.currentTime = target;
    } catch {
      /* ignored */
    }

    setPlaybackSeconds(Math.floor(Math.max(0, target - start)));
    setIsAtLiveEdge(true);
    resumePlayback(video);
  }, [resumePlayback]);

  const setScrubbing = useCallback((scrubbing: boolean) => {
    isScrubbingRef.current = scrubbing;
  }, []);

  return {
    videoRef,
    isReady,
    isAtLiveEdge,
    playbackSeconds,
    bufferedSeconds,
    canScrub: isReady && bufferedSeconds > 0,
    previewScrub,
    commitScrub,
    seekTo,
    goToLive,
    setScrubbing,
  };
}
