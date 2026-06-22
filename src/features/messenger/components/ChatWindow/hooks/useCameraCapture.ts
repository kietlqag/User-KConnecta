import { useState, useRef, useEffect, useCallback } from 'react';
import { chatService } from '@/services/chatService';

const VIDEO_MESSAGE_PREFIX = '__VIDEO_MSG__:';
const MAX_VIDEO_RECORDING_SEC = 60;

export type CameraMode = 'photo' | 'video';

function getSupportedVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

function getVideoFileExtension(mimeType: string) {
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

function formatRecordingTime(totalSec: number) {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function useCameraCapture(
  connected: boolean,
  onSendMessage: (content: string) => void,
  setReportNotice: (msg: string | null) => void,
  addPendingImage: (file: File) => void,
) {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('photo');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isSendingVideo, setIsSendingVideo] = useState(false);
  const [videoRecordingSec, setVideoRecordingSec] = useState(0);

  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoStartedAtRef = useRef(0);
  const videoTimerRef = useRef<number | null>(null);

  const stopCameraStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const resetVideoRecording = useCallback(() => {
    if (videoTimerRef.current) {
      window.clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    videoRecorderRef.current = null;
    videoChunksRef.current = [];
    videoStartedAtRef.current = 0;
    setVideoRecordingSec(0);
    setIsRecordingVideo(false);
  }, []);

  const requestCameraStream = useCallback(async (withAudio: boolean) => {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: withAudio,
    });
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream(cameraStream);
      if (videoTimerRef.current) window.clearInterval(videoTimerRef.current);
    };
  }, [cameraStream, stopCameraStream]);

  useEffect(() => {
    const video = cameraVideoRef.current;
    if (!video || !cameraStream) return;
    setIsCameraReady(false);
    video.srcObject = cameraStream;
    void video.play().catch(() => {});
  }, [cameraStream, showCamera]);

  const openCamera = async () => {
    if (!connected || isOpeningCamera || isRecordingVideo || isSendingVideo) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setReportNotice('Trình duyệt không hỗ trợ camera.');
      window.setTimeout(() => setReportNotice(null), 1800);
      return;
    }

    setIsOpeningCamera(true);
    setCameraMode('photo');
    try {
      const stream = await requestCameraStream(false);
      setCameraStream(stream);
      setShowCamera(true);
    } catch {
      setReportNotice('Không thể truy cập camera.');
      window.setTimeout(() => setReportNotice(null), 1800);
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const closeCamera = () => {
    if (isRecordingVideo) {
      const recorder = videoRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      resetVideoRecording();
    }
    stopCameraStream(cameraStream);
    setCameraStream(null);
    setShowCamera(false);
    setIsCameraReady(false);
    setCameraMode('photo');
  };

  const switchCameraMode = async (mode: CameraMode) => {
    if (mode === cameraMode || isRecordingVideo || isSendingVideo || isOpeningCamera) return;

    setIsOpeningCamera(true);
    setIsCameraReady(false);
    const previousStream = cameraStream;
    stopCameraStream(previousStream);
    setCameraStream(null);

    try {
      const stream = await requestCameraStream(mode === 'video');
      setCameraStream(stream);
      setCameraMode(mode);
    } catch {
      setReportNotice(mode === 'video' ? 'Không thể truy cập micro.' : 'Không thể truy cập camera.');
      window.setTimeout(() => setReportNotice(null), 1800);
      try {
        const fallbackStream = await requestCameraStream(false);
        setCameraStream(fallbackStream);
        setCameraMode('photo');
      } catch {
        closeCamera();
      }
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const captureCameraPhoto = async () => {
    const video = cameraVideoRef.current;
    if (!video || !cameraStream || isRecordingVideo || isSendingVideo) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setReportNotice('Không thể chụp ảnh.');
      window.setTimeout(() => setReportNotice(null), 1800);
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    addPendingImage(file);
    closeCamera();
  };

  const startVideoRecording = async () => {
    if (!connected || !cameraStream || cameraMode !== 'video' || isRecordingVideo || isSendingVideo) return;
    if (typeof MediaRecorder === 'undefined') {
      setReportNotice('Trình duyệt không hỗ trợ quay video.');
      window.setTimeout(() => setReportNotice(null), 1800);
      return;
    }

    const mimeType = getSupportedVideoMimeType();
    if (!mimeType) {
      setReportNotice('Trình duyệt không hỗ trợ định dạng video.');
      window.setTimeout(() => setReportNotice(null), 1800);
      return;
    }

    try {
      const recorder = new MediaRecorder(cameraStream, { mimeType });
      videoChunksRef.current = [];
      videoStartedAtRef.current = Date.now();
      videoRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = videoChunksRef.current;
        const durationSec = Math.max(1, Math.round((Date.now() - videoStartedAtRef.current) / 1000));
        const finalMimeType = recorder.mimeType || mimeType;
        if (videoTimerRef.current) {
          window.clearInterval(videoTimerRef.current);
          videoTimerRef.current = null;
        }
        setIsRecordingVideo(false);
        setIsSendingVideo(true);

        try {
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: finalMimeType });
            const file = new File([blob], `camera-video-${Date.now()}.${getVideoFileExtension(finalMimeType)}`, {
              type: finalMimeType,
            });
            const uploaded = await chatService.uploadChatVideo(file, durationSec);
            onSendMessage(
              `${VIDEO_MESSAGE_PREFIX}${JSON.stringify({
                videoUrl: uploaded.videoUrl,
                durationSec: uploaded.durationSec ?? durationSec,
                mimeType: uploaded.mimeType ?? finalMimeType,
              })}`,
            );
            closeCamera();
          }
        } catch {
          setReportNotice('Không thể gửi video.');
          window.setTimeout(() => setReportNotice(null), 1800);
        } finally {
          setIsSendingVideo(false);
          resetVideoRecording();
        }
      };

      recorder.start(250);
      setIsRecordingVideo(true);
      setVideoRecordingSec(0);
      videoTimerRef.current = window.setInterval(() => {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - videoStartedAtRef.current) / 1000));
        setVideoRecordingSec(elapsedSec);
        if (elapsedSec >= MAX_VIDEO_RECORDING_SEC && recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 500);
    } catch {
      setReportNotice('Không thể bắt đầu quay video.');
      window.setTimeout(() => setReportNotice(null), 1800);
      resetVideoRecording();
    }
  };

  const stopVideoRecording = () => {
    const recorder = videoRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resetVideoRecording();
      return;
    }
    recorder.stop();
  };

  return {
    showCamera,
    cameraMode,
    cameraStream,
    isOpeningCamera,
    isCameraReady,
    isRecordingVideo,
    isSendingVideo,
    videoRecordingSec,
    videoRecordingLabel: formatRecordingTime(videoRecordingSec),
    cameraVideoRef,
    openCamera,
    closeCamera,
    switchCameraMode,
    captureCameraPhoto,
    startVideoRecording,
    stopVideoRecording,
    onCameraReady: () => setIsCameraReady(true),
  };
}
