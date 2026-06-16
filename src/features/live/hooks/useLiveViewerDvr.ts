import { useCallback, useEffect, useRef, useState } from 'react';

const getSupportedRecordingMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ].find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
};

export type LiveViewerPlaybackMode = 'live' | 'dvr';

export function useLiveViewerDvr(enabled: boolean) {
  const [playbackMode, setPlaybackMode] = useState<LiveViewerPlaybackMode>('live');
  const [dvrUrl, setDvrUrl] = useState<string | null>(null);
  const [bufferedSeconds, setBufferedSeconds] = useState(0);

  const chunksRef = useRef<BlobPart[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sourceStreamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const mimeTypeRef = useRef('video/webm');
  const dvrUrlRef = useRef<string | null>(null);

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
    if (startedAtRef.current != null) {
      setBufferedSeconds(Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)));
    }
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
        revokeDvrUrl();
        setDvrUrl(null);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        recorder.start(2000);
        recorderRef.current = recorder;
      } catch {
        recorderRef.current = null;
      }
    })();
  }, [enabled, revokeDvrUrl, stopRecorder]);

  useEffect(() => {
    if (!enabled || playbackMode !== 'live') return;

    const interval = window.setInterval(() => {
      refreshDvrUrl();
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, playbackMode, refreshDvrUrl]);

  useEffect(() => {
    if (!enabled || playbackMode !== 'dvr') return;
    refreshDvrUrl();
  }, [enabled, playbackMode, refreshDvrUrl]);

  useEffect(() => {
    if (!enabled) {
      void stopRecorder();
      setPlaybackMode('live');
    }
  }, [enabled, stopRecorder]);

  useEffect(() => () => {
    void stopRecorder();
    revokeDvrUrl();
  }, [revokeDvrUrl, stopRecorder]);

  const canRewind = bufferedSeconds >= 10 && Boolean(dvrUrl);

  return {
    playbackMode,
    setPlaybackMode,
    dvrUrl,
    bufferedSeconds,
    canRewind,
    setSourceStream,
  };
}
