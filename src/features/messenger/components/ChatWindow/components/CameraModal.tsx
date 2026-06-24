import React from 'react';
import { Camera, Loader2, Square, Video, X } from 'lucide-react';
import type { CameraMode } from '../hooks/useCameraCapture';

interface CameraModalProps {
  show: boolean;
  mode: CameraMode;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraReady: boolean;
  isOpeningCamera: boolean;
  isRecording: boolean;
  isSending: boolean;
  recordingLabel: string;
  onClose: () => void;
  onModeChange: (mode: CameraMode) => void;
  onCapture: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCameraReady: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  show,
  mode,
  videoRef,
  isCameraReady,
  isOpeningCamera,
  isRecording,
  isSending,
  recordingLabel,
  onClose,
  onModeChange,
  onCapture,
  onStartRecording,
  onStopRecording,
  onCameraReady,
}) => {
  if (!show) return null;

  const title = mode === 'photo' ? 'Chụp ảnh' : 'Quay video';
  const busy = isOpeningCamera || isSending;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <h4 className="text-[17px] font-bold text-gray-900 dark:text-gray-100">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            disabled={isRecording || isSending}
            className="rounded-full bg-gray-100 dark:bg-gray-900 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <button
            type="button"
            onClick={() => onModeChange('photo')}
            disabled={busy || isRecording}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
              mode === 'photo'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Ảnh
          </button>
          <button
            type="button"
            onClick={() => onModeChange('video')}
            disabled={busy || isRecording}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
              mode === 'video'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Video
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            playsInline
            muted
            onLoadedMetadata={onCameraReady}
          />
          {(!isCameraReady || isOpeningCamera) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-10 w-10 animate-spin text-white/90" />
            </div>
          )}
          {isRecording && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-sm font-semibold text-white">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {recordingLabel}
            </div>
          )}
          {isSending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
              Đang gửi video...
            </div>
          )}
        </div>

        <div className="flex justify-center bg-gray-50 dark:bg-gray-900 py-6">
          {mode === 'photo' ? (
            <button
              type="button"
              onClick={onCapture}
              disabled={!isCameraReady || busy || isSending}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-emerald-600 shadow-lg ring-4 ring-emerald-600/10 hover:scale-105 active:scale-95 transition-transform cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
            >
              <Camera className="h-8 w-8" />
            </button>
          ) : isRecording ? (
            <button
              type="button"
              onClick={onStopRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-4 ring-red-600/20 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Square className="h-7 w-7 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecording}
              disabled={!isCameraReady || busy || isSending}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-red-600 shadow-lg ring-4 ring-red-600/15 hover:scale-105 active:scale-95 transition-transform cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
            >
              <Video className="h-8 w-8" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
