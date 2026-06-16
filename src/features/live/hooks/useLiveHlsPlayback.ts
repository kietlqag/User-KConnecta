import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';

const LIVE_EDGE_THRESHOLD_SEC = 2;

type UseLiveHlsPlaybackOptions = {
  enabled: boolean;
  hlsUrl?: string | null;
  startedAt?: string | null;
};

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
    const seekableEnd = video.seekable.length > 0
      ? video.seekable.end(video.seekable.length - 1)
      : video.currentTime;
    const buffer = Math.max(seekableEnd, getSessionElapsed());
    if (!isScrubbingRef.current) {
      setPlaybackSeconds(Math.floor(video.currentTime));
      setBufferedSeconds(Math.floor(buffer));
      setIsAtLiveEdge(buffer - video.currentTime <= LIVE_EDGE_THRESHOLD_SEC);
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
    const max = Math.max(bufferedSeconds, getSessionElapsed(), video.duration || 0, 1);
    const clamped = Math.max(0, Math.min(seconds, max));
    video.currentTime = clamped;
    setPlaybackSeconds(Math.floor(clamped));
    setIsAtLiveEdge(max - clamped <= LIVE_EDGE_THRESHOLD_SEC);
    void video.play().catch(() => undefined);
  }, [bufferedSeconds, getSessionElapsed]);

  const goToLive = useCallback(() => {
    isScrubbingRef.current = false;
    const video = videoRef.current;
    if (!video) return;
    const end = video.seekable.length > 0
      ? video.seekable.end(video.seekable.length - 1)
      : Math.max(getSessionElapsed(), bufferedSeconds);
    video.currentTime = end;
    setPlaybackSeconds(Math.floor(end));
    setBufferedSeconds(Math.floor(Math.max(end, getSessionElapsed())));
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
