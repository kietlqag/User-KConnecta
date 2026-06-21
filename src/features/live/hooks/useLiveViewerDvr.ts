import { useCallback, useEffect, useRef, useState } from 'react';

const LIVE_EDGE_THRESHOLD_SEC = 2;
const BUFFER_REFRESH_MS = 4000;

const getSupportedRecordingMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ].find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
};

export function useLiveViewerDvr(enabled: boolean) {
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [bufferedSeconds, setBufferedSeconds] = useState(0);
  const [dvrUrl, setDvrUrl] = useState<string | null>(null);

  const chunksRef = useRef<BlobPart[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sourceStreamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const mimeTypeRef = useRef('video/webm');
  const dvrUrlRef = useRef<string | null>(null);
  const isScrubbingRef = useRef(false);

  const getElapsedSeconds = useCallback(() => {
    if (startedAtRef.current == null) return 0;
    return Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
  }, []);

  const revokeDvrUrl = useCallback(() => {
    if (dvrUrlRef.current) {
      URL.revokeObjectURL(dvrUrlRef.current);
      dvrUrlRef.current = null;
    }
  }, []);

  const refreshDvrUrl = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'video/webm' });
    revokeDvrUrl();
    const nextUrl = URL.createObjectURL(blob);
    dvrUrlRef.current = nextUrl;
    setDvrUrl(nextUrl);
  }, [revokeDvrUrl]);

  const stopRecorder = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    if (recorder.state === 'recording' || recorder.state === 'paused') {
      recorder.requestData();
      await new Promise<void>((resolve) => {
        recorder.addEventListener('stop', () => resolve(), { once: true });
        recorder.stop();
      });
    }
    recorderRef.current = null;
    refreshDvrUrl();
  }, [refreshDvrUrl]);

  const setSourceStream = useCallback((stream: MediaStream | null) => {
    sourceStreamRef.current = stream;
    if (!enabled || !stream || stream.getVideoTracks().length === 0) {
      void stopRecorder();
      return;
    }

    void (async () => {
      await stopRecorder();
      if (sourceStreamRef.current !== stream) return;

      if (typeof MediaRecorder === 'undefined') return;
      const mimeType = getSupportedRecordingMimeType();
      try {
        const recorder = new MediaRecorder(
          stream,
          mimeType
            ? { mimeType, videoBitsPerSecond: 1_800_000, audioBitsPerSecond: 128_000 }
            : { videoBitsPerSecond: 1_800_000, audioBitsPerSecond: 128_000 },
        );
        mimeTypeRef.current = recorder.mimeType || mimeType || 'video/webm';
        chunksRef.current = [];
        startedAtRef.current = Date.now();
        setBufferedSeconds(0);
        setPlaybackSeconds(0);
        setIsAtLiveEdge(true);
        revokeDvrUrl();
        setDvrUrl(null);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
            if (chunksRef.current.length === 1) {
              refreshDvrUrl();
            }
          }
        };
        recorder.start(2000);
        recorderRef.current = recorder;
      } catch {
        recorderRef.current = null;
      }
    })();
  }, [enabled, refreshDvrUrl, revokeDvrUrl, stopRecorder]);

  const seekTo = useCallback((seconds: number) => {
    const max = getElapsedSeconds();
    const clamped = Math.max(0, Math.min(seconds, max));
    const atEdge = max <= LIVE_EDGE_THRESHOLD_SEC || clamped >= max - LIVE_EDGE_THRESHOLD_SEC;
    setBufferedSeconds(max);
    setPlaybackSeconds(clamped);
    setIsAtLiveEdge(atEdge);
  }, [getElapsedSeconds]);

  const goToLive = useCallback(() => {
    isScrubbingRef.current = false;
    const max = getElapsedSeconds();
    setBufferedSeconds(max);
    setPlaybackSeconds(max);
    setIsAtLiveEdge(true);
  }, [getElapsedSeconds]);

  const setScrubbing = useCallback((scrubbing: boolean) => {
    isScrubbingRef.current = scrubbing;
  }, []);

  const syncPlaybackFromVideo = useCallback((currentTime: number) => {
    if (isScrubbingRef.current) return;
    const max = getElapsedSeconds();
    setBufferedSeconds(max);
    setPlaybackSeconds(Math.max(0, Math.min(currentTime, max)));
    if (max - currentTime <= LIVE_EDGE_THRESHOLD_SEC) {
      goToLive();
    }
  }, [getElapsedSeconds, goToLive]);

  useEffect(() => {
    if (!enabled) {
      void stopRecorder();
      setIsAtLiveEdge(true);
      setPlaybackSeconds(0);
      setBufferedSeconds(0);
      return;
    }

    const tick = () => {
      const elapsed = getElapsedSeconds();
      setBufferedSeconds(elapsed);
      if (isAtLiveEdge && !isScrubbingRef.current) {
        setPlaybackSeconds(elapsed);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, getElapsedSeconds, isAtLiveEdge, stopRecorder]);

  useEffect(() => {
    if (!enabled || !isAtLiveEdge) return;

    const interval = window.setInterval(() => {
      refreshDvrUrl();
    }, BUFFER_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [enabled, isAtLiveEdge, refreshDvrUrl]);

  useEffect(() => () => {
    void stopRecorder();
    revokeDvrUrl();
  }, [revokeDvrUrl, stopRecorder]);

  const canScrub = bufferedSeconds > 0 && Boolean(dvrUrl);

  return {
    isAtLiveEdge,
    playbackSeconds,
    bufferedSeconds,
    dvrUrl,
    canScrub,
    seekTo,
    goToLive,
    setScrubbing,
    syncPlaybackFromVideo,
    setSourceStream,
    reset: goToLive,
  };
}
