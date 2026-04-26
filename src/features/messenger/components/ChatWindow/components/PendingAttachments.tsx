import React from 'react';
import { X, FileText } from 'lucide-react';
import { PendingImage, PendingFile } from '../hooks/useAttachments';

interface PendingAttachmentsProps {
  pendingImages: PendingImage[];
  pendingFiles: PendingFile[];
  removePendingImage: (id: string) => void;
  removePendingFile: (id: string) => void;
}

export const PendingAttachments: React.FC<PendingAttachmentsProps> = ({
  pendingImages,
  pendingFiles,
  removePendingImage,
  removePendingFile,
}) => {
  if (pendingImages.length === 0 && pendingFiles.length === 0) return null;

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="flex flex-wrap gap-2">
        {pendingImages.map((img) => (
          <div key={img.id} className="relative w-20 h-20 group">
            <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
            <button
              onClick={() => removePendingImage(img.id)}
              className="absolute -top-2 -right-2 p-1 bg-gray-800 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {pendingFiles.map((f) => (
          <div key={f.id} className="relative flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 group pr-8">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium truncate max-w-[120px]">{f.file.name}</span>
            <button
              onClick={() => removePendingFile(f.id)}
              className="absolute top-1/2 -right-1 -translate-y-1/2 p-1 bg-gray-200 text-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
