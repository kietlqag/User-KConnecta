import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, ImageIcon, Camera, FileUp, Smile, Send, Trash2, X } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { computeEmojiPickerPosition, type EmojiPickerPosition } from '@/utils/emojiPickerPosition';
import { Message } from '../../../types/message.types';
import { VoiceWaveform } from '../../VoiceWaveform/VoiceWaveform';

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
  voiceLevels?: number[];
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
  voiceLevels,
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
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos] = useState<EmojiPickerPosition>({
    top: 0,
    right: 0,
    maxHeight: 435,
  });

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
      const target = event.target as Node;
      const insidePicker = emojiPickerRef.current?.contains(target);
      const insideButton = emojiButtonRef.current?.contains(target);
      if (!insidePicker && !insideButton) setShowEmojiPicker(false);
    };

    const handleReposition = () => {
      if (emojiButtonRef.current) {
        setEmojiPickerPos(
          computeEmojiPickerPosition(emojiButtonRef.current.getBoundingClientRect()),
        );
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleReposition);
    };
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
    <div className="p-3 bg-card border-t border-border">
      {cooldownSeconds > 0 && (
        <div className="mb-2 px-1 text-[11px] font-medium text-red-600">
          Tạm dừng gửi tin — thử lại sau {cooldownSeconds}s
        </div>
      )}

      {replyToMessage && (
        <div className="mb-2 px-3 py-2 bg-background rounded-xl border-l-4 border-emerald-500 flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Đang trả lời</p>
            <p className="text-sm text-muted-foreground truncate">{replyToMessage.text}</p>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-muted rounded-full cursor-pointer">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {isRecordingVoice || isSendingVoice ? (
          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={onCancelVoice}
              disabled={isSendingVoice}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 cursor-pointer dark:hover:bg-red-950/40"
              title="Hủy ghi âm"
            >
              <Trash2 className="h-5 w-5" />
            </button>

            <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 shadow-[0_8px_24px_rgba(37,99,235,0.28)]">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>

              <VoiceWaveform
                heights={voiceLevels}
                isActive={isRecordingVoice && !isSendingVoice}
                variant="recording"
                className="min-w-0"
              />

              <span className="shrink-0 text-xs font-semibold tabular-nums text-white">
                {isSendingVoice ? 'Đang gửi...' : formatVoiceDuration(voiceRecordingSec)}
              </span>
            </div>

            <button
              type="button"
              onClick={onStopAndSendVoice}
              disabled={isSendingVoice}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-transform hover:scale-105 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              title="Gửi ghi âm"
            >
              <Send className="h-5 w-5 fill-current" />
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
                <Mic className="w-5 h-5 text-emerald-600" />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              <button
                type="button"
                onClick={onImageClick}
                disabled={!connected || isSendingImage}
                className="p-2 hover:bg-muted rounded-full text-emerald-600 disabled:opacity-50 cursor-pointer"
                title="Đính kèm ảnh"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onCameraClick}
                disabled={!connected || isOpeningCamera}
                className="p-2 hover:bg-muted rounded-full text-emerald-600 disabled:opacity-50 cursor-pointer"
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
                className="p-2 hover:bg-muted rounded-full text-emerald-600 disabled:opacity-50 cursor-pointer"
                title="Gửi file"
              >
                <FileUp className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative bg-background rounded-2xl">
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
              <div className="absolute right-2 bottom-1.5">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => {
                    if (!showEmojiPicker && emojiButtonRef.current) {
                      setEmojiPickerPos(
                        computeEmojiPickerPosition(emojiButtonRef.current.getBoundingClientRect()),
                      );
                    }
                    onEmojiClick();
                    setShowEmojiPicker((prev) => !prev);
                  }}
                  className="cursor-pointer rounded-full p-1.5 text-emerald-600 hover:bg-muted"
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>
            </div>

            <button
              onClick={onSend}
              disabled={!canSend}
              className={`cursor-pointer rounded-full p-2 transition-all ${ canSend ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-emerald-300' }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {showEmojiPicker &&
        createPortal(
          <div
            ref={emojiPickerRef}
            className="fixed z-[200] overflow-y-auto rounded-lg shadow-xl sidebar-scrollbar"
            style={{
              top: emojiPickerPos.top,
              right: emojiPickerPos.right,
              maxHeight: emojiPickerPos.maxHeight,
            }}
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
              locale="vi"
              previewPosition="none"
            />
          </div>,
          document.body,
        )}
    </div>
  );
};

