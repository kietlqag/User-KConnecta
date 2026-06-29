import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';

const LIVE_EDGE_THRESHOLD_SEC = 2;

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

function getTimelineDuration(video: HTMLVideoElement, sessionElapsed: number) {
  const { start, end } = getSeekableRange(video);
  return Math.max(end - start, sessionElapsed, Number.isFinite(video.duration) ? video.duration : 0, 1);
}

export function useLiveHlsPlayback({ enabled, hlsUrl, startedAt, onFatalError }: UseLiveHlsPlaybackOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isScrubbingRef = useRef(false);
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [bufferedSeconds, setBufferedSeconds] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const getSessionElapsed = useCallback(() => {
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  }, [startedAt]);

  const updateFromVideo = useCallback((video: HTMLVideoElement) => {
    const { start, end } = getSeekableRange(video);
    const timelineDuration = Math.max(end - start, 0);
    const relativeTime = Math.max(0, video.currentTime - start);
    const buffer = Math.max(timelineDuration, getSessionElapsed());

    setBufferedSeconds(Math.floor(buffer));

    if (!isScrubbingRef.current) {
      setPlaybackSeconds(Math.floor(relativeTime));
      setIsAtLiveEdge(buffer - relativeTime <= LIVE_EDGE_THRESHOLD_SEC);
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
    setIsReady(false);

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
        // DVR tua lại cần buffer đủ dài; lowLatencyMode gây đứng hình sau seek.
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveBackBufferLength: 0,
        backBufferLength: 120,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        resumePlayback(video);
        updateFromVideo(video);
      });
      hls.on(Hls.Events.LEVEL_UPDATED, () => updateFromVideo(video));
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          onFatalError?.();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', () => onFatalError?.(), { once: true });
      resumePlayback(video);
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('waiting', onWaiting);
    const tick = window.setInterval(() => updateFromVideo(video), 1000);

    return () => {
      window.clearInterval(tick);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [enabled, hlsUrl, onFatalError, resumePlayback, updateFromVideo]);

  /** Chỉ cập nhật UI khi đang kéo thanh tua — không seek video (tránh HLS đứng hình). */
  const previewScrub = useCallback((seconds: number) => {
    const video = videoRef.current;
    const buffer = video
      ? Math.max(getTimelineDuration(video, getSessionElapsed()), getSessionElapsed())
      : Math.max(bufferedSeconds, getSessionElapsed(), 1);
    const clamped = Math.max(0, Math.min(seconds, buffer));
    setPlaybackSeconds(Math.floor(clamped));
    setBufferedSeconds(Math.floor(buffer));
    setIsAtLiveEdge(buffer - clamped <= LIVE_EDGE_THRESHOLD_SEC);
  }, [bufferedSeconds, getSessionElapsed]);

  /** Seek thật khi thả chuột — phát tiếp từ vị trí đã chọn. */
  const commitScrub = useCallback((seconds: number) => {
    isScrubbingRef.current = false;
    const video = videoRef.current;
    if (!video) return;

    const sessionElapsed = getSessionElapsed();
    const { start } = getSeekableRange(video);
    const timelineDuration = getTimelineDuration(video, sessionElapsed);
    const clamped = Math.max(0, Math.min(seconds, timelineDuration));
    const targetTime = start + clamped;
    const atEdge = timelineDuration - clamped <= LIVE_EDGE_THRESHOLD_SEC;

    const hls = hlsRef.current;
    if (hls) {
      if (atEdge) {
        hls.startLoad(-1);
      } else {
        hls.startLoad(targetTime);
      }
    }

    try {
      video.currentTime = targetTime;
    } catch {
      /* seekable range chưa sẵn sàng */
    }

    setPlaybackSeconds(Math.floor(clamped));
    setBufferedSeconds(Math.floor(Math.max(timelineDuration, sessionElapsed)));
    setIsAtLiveEdge(atEdge);
    resumePlayback(video);
  }, [getSessionElapsed, resumePlayback]);

  const seekTo = useCallback((seconds: number) => {
    previewScrub(seconds);
    commitScrub(seconds);
  }, [commitScrub, previewScrub]);

  const goToLive = useCallback(() => {
    isScrubbingRef.current = false;
    const video = videoRef.current;
    if (!video) return;

    const hls = hlsRef.current;
    if (hls) {
      hls.startLoad(-1);
    }

    const sessionElapsed = getSessionElapsed();
    const { start, end } = getSeekableRange(video);
    const timelineEnd = end > start ? end : Math.max(sessionElapsed, bufferedSeconds);
    try {
      video.currentTime = timelineEnd;
    } catch {
      /* ignored */
    }

    const relative = Math.max(0, timelineEnd - start);
    setPlaybackSeconds(Math.floor(relative));
    setBufferedSeconds(Math.floor(Math.max(relative, sessionElapsed)));
    setIsAtLiveEdge(true);
    resumePlayback(video);
  }, [bufferedSeconds, getSessionElapsed, resumePlayback]);

  const setScrubbing = useCallback((scrubbing: boolean) => {
    isScrubbingRef.current = scrubbing;
  }, []);

  return {
    videoRef,
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
