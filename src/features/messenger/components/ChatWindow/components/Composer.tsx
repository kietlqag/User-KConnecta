import React, { useEffect, useRef, useState } from 'react';
import { Mic, ImageIcon, Camera, FileUp, Smile, Send, Trash2, Pause, X } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Message } from '../../../types/message.types';

interface ComposerProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  connected: boolean;
  isRecordingVoice: boolean;
  isSendingVoice: boolean;
  isSendingImage: boolean;
  isSendingFile: boolean;
  isOpeningCamera: boolean;
  hasPendingImages: boolean;
  hasPendingFiles: boolean;
  onStartVoice: () => void;
  onStopAndSendVoice: () => void;
  onCancelVoice: () => void;
  onImageClick: () => void;
  onFileClick: () => void;
  onCameraClick: () => void;
  onEmojiClick: () => void;
  replyToMessage: Message | null;
  onCancelReply: () => void;
  voiceRecordingSec: number;
  formatVoiceDuration: (sec: number) => string;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  cooldownSeconds?: number;
  isDuplicateBlocked?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  inputText,
  setInputText,
  onSend,
  connected,
  isRecordingVoice,
  isSendingVoice,
  isSendingImage,
  isSendingFile,
  isOpeningCamera,
  hasPendingImages,
  hasPendingFiles,
  onStartVoice,
  onStopAndSendVoice,
  onCancelVoice,
  onImageClick,
  onFileClick,
  onCameraClick,
  onEmojiClick,
  replyToMessage,
  onCancelReply,
  voiceRecordingSec,
  formatVoiceDuration,
  imageInputRef,
  fileInputRef,
  handleImageSelect,
  handleFileSelect,
  onPaste,
  cooldownSeconds = 0,
  isDuplicateBlocked = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const canSend =
    connected &&
    cooldownSeconds === 0 &&
    !isDuplicateBlocked &&
    (Boolean(inputText.trim()) || hasPendingImages || hasPendingFiles) &&
    !isSendingImage &&
    !isSendingFile;

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [inputText]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!emojiPickerRef.current) return;
      if (emojiPickerRef.current.contains(event.target as Node)) return;
      setShowEmojiPicker(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji: { native?: string }) => {
    const selectedEmoji = emoji.native;
    if (!selectedEmoji) return;

    const textarea = textareaRef.current;
    if (!textarea) {
      setInputText(`${inputText}${selectedEmoji}`);
      return;
    }

    const selectionStart = textarea.selectionStart ?? inputText.length;
    const selectionEnd = textarea.selectionEnd ?? inputText.length;
    const nextText = `${inputText.slice(0, selectionStart)}${selectedEmoji}${inputText.slice(selectionEnd)}`;

    setInputText(nextText);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaretPosition = selectionStart + selectedEmoji.length;
      textarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  };

  return (
    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      {cooldownSeconds > 0 && (
        <div className="mb-2 px-1 text-[11px] font-medium text-red-600">
          Tạm dừng gửi tin — thử lại sau {cooldownSeconds}s
        </div>
      )}

      {replyToMessage && (
        <div className="mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-xl border-l-4 border-blue-500 flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Đang trả lời</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{replyToMessage.text}</p>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-full cursor-pointer">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {isRecordingVoice || isSendingVoice ? (
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onCancelVoice}
              disabled={isSendingVoice}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 cursor-pointer"
              title="Hủy ghi âm"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex-1 h-10 flex items-center gap-2 rounded-full bg-blue-600 px-3 text-white">
              <button
                type="button"
                onClick={onStopAndSendVoice}
                disabled={isSendingVoice}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-blue-600 cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
              <div className="flex-1 flex items-center gap-[3px] overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-white dark:bg-gray-800/90" />
                ))}
              </div>
              <span className="text-[11px] font-medium tabular-nums">
                {isSendingVoice ? '...' : formatVoiceDuration(voiceRecordingSec)}
              </span>
            </div>
            <button
              type="button"
              onClick={onStopAndSendVoice}
              disabled={isSendingVoice}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 cursor-pointer"
              title="Gửi ghi âm"
            >
              <Send className="w-6 h-6 fill-current" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={onStartVoice}
                disabled={!connected || isSendingVoice}
                className="p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                title="Gửi tin nhắn thoại"
              >
                <Mic className="w-5 h-5 text-blue-600" />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              <button
                type="button"
                onClick={onImageClick}
                disabled={!connected || isSendingImage}
                className="p-2 hover:bg-muted rounded-full text-blue-600 disabled:opacity-50 cursor-pointer"
                title="Đính kèm ảnh"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onCameraClick}
                disabled={!connected || isOpeningCamera}
                className="p-2 hover:bg-muted rounded-full text-blue-600 disabled:opacity-50 cursor-pointer"
                title="Chụp ảnh"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.zip,.rar,.7z,.json,.xml,.mp3,.wav,.m4a,.mp4,.mov,.avi,.mkv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={onFileClick}
                disabled={!connected || isSendingFile}
                className="p-2 hover:bg-muted rounded-full text-blue-600 disabled:opacity-50 cursor-pointer"
                title="Gửi file"
              >
                <FileUp className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 rounded-2xl">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                }}
                onPaste={onPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                    e.currentTarget.style.height = 'auto';
                  }
                }}
                placeholder={!connected ? 'Đang kết nối...' : cooldownSeconds > 0 ? `Thử lại sau ${cooldownSeconds}s...` : 'Aa'}
                disabled={!connected || cooldownSeconds > 0 || isSendingImage || isSendingFile}
                rows={1}
                className="w-full pl-3 pr-11 py-2 bg-transparent outline-none transition-all text-sm disabled:opacity-50 resize-none min-h-[36px] max-h-[120px] leading-relaxed block"
                style={{ height: 'auto' }}
              />
              <div ref={emojiPickerRef} className="absolute right-2 bottom-1.5">
                {showEmojiPicker && (
                  <div className="absolute bottom-10 right-0 z-50 shadow-xl rounded-lg overflow-hidden">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="light"
                      locale="vi"
                      previewPosition="none"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onEmojiClick();
                    setShowEmojiPicker((prev) => !prev);
                  }}
                  className="cursor-pointer rounded-full p-1.5 text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-gray-700"
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>
            </div>

            <button
              onClick={onSend}
              disabled={!canSend}
              className={`cursor-pointer rounded-full p-2 transition-all ${
                canSend ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-blue-300'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

