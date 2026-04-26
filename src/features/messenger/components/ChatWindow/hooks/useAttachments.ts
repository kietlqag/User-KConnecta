import { useState, useRef, useEffect } from 'react';
import { chatService } from '@/services/chatService';

const MAX_PENDING_IMAGES = 6;
const MAX_PENDING_FILES = 6;
const MAX_CHAT_FILE_BYTES = 25 * 1024 * 1024;
const IMAGE_MESSAGE_PREFIX = '__IMAGE__:';
const FILE_MESSAGE_PREFIX = '__FILE__:';

export interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

export interface PendingFile {
  id: string;
  file: File;
}

export function useAttachments(connected: boolean, onSendMessage: (content: string) => void, setReportNotice: (msg: string | null) => void) {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSendingImage, setIsSendingImage] = useState(false);
  const [isSendingFile, setIsSendingFile] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || !connected || isSendingImage) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      setReportNotice('Vui lòng chọn file ảnh.');
      window.setTimeout(() => setReportNotice(null), 1800);
      return;
    }

    setPendingFiles([]);
    setPendingImages((prev) => {
      const availableSlots = Math.max(0, MAX_PENDING_IMAGES - prev.length);
      const nextFiles = imageFiles.slice(0, availableSlots);
      if (imageFiles.length > availableSlots) {
        setReportNotice(`Chỉ có thể gửi tối đa ${MAX_PENDING_IMAGES} ảnh một lần.`);
        window.setTimeout(() => setReportNotice(null), 1800);
      }
      return [
        ...prev,
        ...nextFiles.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ];
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || !connected || isSendingFile) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      setReportNotice('Vui lòng dùng nút ảnh để gửi hình ảnh.');
      window.setTimeout(() => setReportNotice(null), 1800);
    }

    const nonImageFiles = files.filter((file) => !file.type.startsWith('image/'));
    const validFiles = nonImageFiles.filter((file) => file.size <= MAX_CHAT_FILE_BYTES);
    if (validFiles.length !== nonImageFiles.length) {
      setReportNotice('Một số file quá lớn. Vui lòng chọn file tối đa 25 MB.');
      window.setTimeout(() => setReportNotice(null), 1800);
    }
    if (validFiles.length === 0) return;

    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    setPendingFiles((prev) => {
      const availableSlots = Math.max(0, MAX_PENDING_FILES - prev.length);
      const nextFiles = validFiles.slice(0, availableSlots);
      if (validFiles.length > availableSlots) {
        setReportNotice(`Chỉ có thể gửi tối đa ${MAX_PENDING_FILES} file một lần.`);
        window.setTimeout(() => setReportNotice(null), 1800);
      }
      return [
        ...prev,
        ...nextFiles.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
        })),
      ];
    });
  };

  const removePendingImage = (imageId: string) => {
    setPendingImages((prev) => {
      const target = prev.find((image) => image.id === imageId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((image) => image.id !== imageId);
    });
  };

  const removePendingFile = (fileId: string) => {
    setPendingFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  };

  const clearPendingFiles = () => {
    setPendingFiles([]);
  };

  const sendPendingImages = async (caption?: string) => {
    if (!connected || pendingImages.length === 0 || isSendingImage) return;

    const imagesToSend = pendingImages;
    setIsSendingImage(true);
    try {
      const uploadedImages = await Promise.all(
        imagesToSend.map(async (image) => {
          const uploaded = await chatService.uploadChatImage(image.file);
          return {
            imageUrl: uploaded.imageUrl,
            mimeType: uploaded.mimeType ?? image.file.type,
          };
        }),
      );
      onSendMessage(
        `${IMAGE_MESSAGE_PREFIX}${JSON.stringify({
          imageUrl: uploadedImages[0]?.imageUrl,
          imageUrls: uploadedImages.map((image) => image.imageUrl),
          mimeTypes: uploadedImages.map((image) => image.mimeType),
          caption,
        })}`,
      );
      imagesToSend.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setPendingImages([]);
    } catch {
      setReportNotice('Không thể gửi ảnh.');
      window.setTimeout(() => setReportNotice(null), 1800);
    } finally {
      setIsSendingImage(false);
    }
  };

  const sendPendingFiles = async () => {
    if (!connected || pendingFiles.length === 0 || isSendingFile) return;

    const filesToSend = pendingFiles;
    setIsSendingFile(true);
    try {
      const uploadedFiles = await Promise.all(
        filesToSend.map(async ({ file }) => {
          const uploaded = await chatService.uploadChatFile(file);
          return {
            fileUrl: uploaded.fileUrl,
            fileName: uploaded.fileName || file.name,
            mimeType: uploaded.mimeType || file.type,
            fileSizeBytes: uploaded.fileSizeBytes || file.size,
          };
        }),
      );
      uploadedFiles.forEach((file) => {
        onSendMessage(`${FILE_MESSAGE_PREFIX}${JSON.stringify(file)}`);
      });
      setPendingFiles([]);
    } catch {
      setReportNotice('Không thể gửi file.');
      window.setTimeout(() => setReportNotice(null), 1800);
    } finally {
      setIsSendingFile(false);
    }
  };

  return {
    pendingImages,
    pendingFiles,
    isSendingImage,
    isSendingFile,
    imageInputRef,
    fileInputRef,
    handleImageSelect,
    handleFileSelect,
    removePendingImage,
    removePendingFile,
    clearPendingImages,
    clearPendingFiles,
    sendPendingImages,
    sendPendingFiles,
  };
}
