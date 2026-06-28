import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';

const LIVE_EDGE_THRESHOLD_SEC = 2;

type UseLiveHlsPlaybackOptions = {
  enabled: boolean;
  hlsUrl?: string | null;
  startedAt?: string | null;
};

function getSeekableRange(video: HTMLVideoElement) {
  if (video.seekable.length === 0) {
    return { start: 0, end: 0 };
  }
  const start = video.seekable.start(0);
  const end = video.seekable.end(video.seekable.length - 1);
  return { start, end: Math.max(start, end) };
}

export function useLiveHlsPlayback({ enabled, hlsUrl, startedAt }: UseLiveHlsPlaybackOptions) {
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

    if (!isScrubbingRef.current) {
      setPlaybackSeconds(Math.floor(relativeTime));
      setBufferedSeconds(Math.floor(buffer));
      setIsAtLiveEdge(buffer - relativeTime <= LIVE_EDGE_THRESHOLD_SEC);
    } else {
      setBufferedSeconds(Math.floor(buffer));
    }
  }, [getSessionElapsed]);

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

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        void video.play().catch(() => undefined);
        updateFromVideo(video);
      });
      hls.on(Hls.Events.LEVEL_UPDATED, () => updateFromVideo(video));
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      void video.play().catch(() => undefined);
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    const tick = window.setInterval(() => updateFromVideo(video), 1000);

    return () => {
      window.clearInterval(tick);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [enabled, hlsUrl, updateFromVideo]);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const { start, end } = getSeekableRange(video);
    const timelineDuration = Math.max(end - start, getSessionElapsed(), video.duration || 0, 1);
    const clamped = Math.max(0, Math.min(seconds, timelineDuration));
    video.currentTime = start + clamped;
    setPlaybackSeconds(Math.floor(clamped));
    setIsAtLiveEdge(timelineDuration - clamped <= LIVE_EDGE_THRESHOLD_SEC);
    void video.play().catch(() => undefined);
  }, [getSessionElapsed]);

  const goToLive = useCallback(() => {
    isScrubbingRef.current = false;
    const video = videoRef.current;
    if (!video) return;
    const { start, end } = getSeekableRange(video);
    const timelineEnd = end > start ? end : Math.max(getSessionElapsed(), bufferedSeconds);
    video.currentTime = timelineEnd;
    const relative = Math.max(0, timelineEnd - start);
    setPlaybackSeconds(Math.floor(relative));
    setBufferedSeconds(Math.floor(Math.max(relative, getSessionElapsed())));
    setIsAtLiveEdge(true);
    void video.play().catch(() => undefined);
  }, [bufferedSeconds, getSessionElapsed]);

  const setScrubbing = useCallback((scrubbing: boolean) => {
    isScrubbingRef.current = scrubbing;
  }, []);

  return {
    videoRef,
    isAtLiveEdge,
    playbackSeconds,
    bufferedSeconds,
    canScrub: isReady && bufferedSeconds > 0,
    seekTo,
    goToLive,
    setScrubbing,
  };
}
