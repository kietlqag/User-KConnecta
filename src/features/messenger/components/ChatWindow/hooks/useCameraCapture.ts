import { useState, useRef, useEffect } from 'react';

const MAX_PENDING_IMAGES = 6;

export function useCameraCapture(connected: boolean, setReportNotice: (msg: string | null) => void, addPendingImage: (file: File) => void) {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    const video = cameraVideoRef.current;
    if (!video || !cameraStream) return;
    video.srcObject = cameraStream;
    void video.play().catch(() => {});
  }, [cameraStream, showCamera]);

  const openCamera = async () => {
    if (!connected || isOpeningCamera) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setReportNotice('Trình duyệt không hỗ trợ camera.');
      window.setTimeout(() => setReportNotice(null), 1800);
      return;
    }

    setIsOpeningCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
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
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setShowCamera(false);
  };

  const captureCameraPhoto = async () => {
    const video = cameraVideoRef.current;
    if (!video || !cameraStream) return;

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

  return {
    showCamera,
    cameraStream,
    isOpeningCamera,
    cameraVideoRef,
    openCamera,
    closeCamera,
    captureCameraPhoto,
  };
}
