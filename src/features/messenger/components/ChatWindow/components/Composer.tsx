import React from 'react';
import { Mic, ImageIcon, Camera, FileUp, Smile, Send, Trash2, Pause, X } from 'lucide-react';
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
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-3 bg-white border-t border-gray-200">
      {replyToMessage && (
        <div className="mb-2 px-3 py-2 bg-gray-50 rounded-xl border-l-4 border-blue-500 flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Đang trả lời</p>
            <p className="text-sm text-gray-600 truncate">{replyToMessage.text}</p>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 rounded-full">
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
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"
              title="Hủy ghi âm"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex-1 h-10 flex items-center gap-2 rounded-full bg-blue-600 px-3 text-white">
              <button
                type="button"
                onClick={onStopAndSendVoice}
                disabled={isSendingVoice}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-blue-600"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
              <div className="flex-1 flex items-center gap-[3px] overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-white/90" />
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
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"
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
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                title="Gửi tin nhắn thoại"
              >
                <Mic className="w-5 h-5 text-blue-600" />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              <button
                type="button"
                onClick={onImageClick}
                disabled={!connected || isSendingImage}
                className="p-2 hover:bg-gray-100 rounded-full text-blue-600 disabled:opacity-50"
                title="Đính kèm ảnh"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onCameraClick}
                disabled={!connected || isOpeningCamera}
                className="p-2 hover:bg-gray-100 rounded-full text-blue-600 disabled:opacity-50"
                title="Chụp ảnh"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              <button
                type="button"
                onClick={onFileClick}
                disabled={!connected || isSendingFile}
                className="p-2 hover:bg-gray-100 rounded-full text-blue-600 disabled:opacity-50"
                title="Gửi file"
              >
                <FileUp className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative bg-gray-100 rounded-2xl">
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                    e.currentTarget.style.height = 'auto';
                  }
                }}
                placeholder={connected ? 'Aa' : 'Đang kết nối...'}
                disabled={!connected || isSendingImage || isSendingFile}
                rows={1}
                className="w-full pl-3 pr-11 py-2 bg-transparent outline-none transition-all text-sm disabled:opacity-50 resize-none min-h-[36px] max-h-[120px] leading-relaxed block"
                style={{ height: 'auto' }}
              />
              <button
                onClick={onEmojiClick}
                className="absolute right-2 bottom-1.5 p-1.5 hover:bg-gray-200 rounded-full text-blue-600"
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={onSend}
              disabled={!inputText.trim() && !isSendingImage && !isSendingFile}
              className={`p-2 rounded-full transition-all ${
                inputText.trim() && connected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-blue-300'
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
