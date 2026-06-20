import React from 'react';
import { Camera, X } from 'lucide-react';

interface CameraModalProps {
  show: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onCapture: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ show, videoRef, onClose, onCapture }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <h4 className="text-[17px] font-bold text-gray-900 dark:text-gray-100">Chụp ảnh</h4>
          <button onClick={onClose} className="rounded-full bg-gray-100 dark:bg-gray-900 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} className="h-full w-full object-contain" playsInline muted />
        </div>
        <div className="flex justify-center bg-gray-50 dark:bg-gray-900 py-6">
          <button
            onClick={onCapture}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-blue-600 shadow-lg ring-4 ring-blue-600/10 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <Camera className="h-8 w-8" />
          </button>
        </div>
      </div>
    </div>
  );
};
