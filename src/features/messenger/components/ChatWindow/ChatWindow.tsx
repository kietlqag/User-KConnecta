import { useState, useMemo } from 'react';
import { ChatUser, Message } from '../../types/message.types';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { PendingAttachments } from './components/PendingAttachments';
import { Composer } from './components/Composer';
import { CameraModal } from './components/CameraModal';
import { useChatScroll } from './hooks/useChatScroll';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { useAttachments } from './hooks/useAttachments';
import { useCameraCapture } from './hooks/useCameraCapture';

const REPLY_PREFIX = '__REPLY__:';

interface ChatWindowProps {
  user: ChatUser;
  messages: Message[];
  loading?: boolean;
  loadingOlder?: boolean;
  hasOlder?: boolean;
  connected: boolean;
  onSendMessage: (content: string) => void;
  onLoadOlder?: () => Promise<void> | void;
  onReactMessage?: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => Promise<boolean> | boolean;
  onClose: () => void;
  onMinimize?: () => void;
  fullScreen?: boolean;
  callStatus?: 'idle' | 'calling' | 'ringing' | 'connecting' | 'in_call' | 'ended' | 'error';
  callMediaType?: 'audio' | 'video';
  isMuted?: boolean;
  canStartVoiceCall?: boolean;
  canStartVideoCall?: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onEndVoiceCall?: () => void;
  onToggleMute?: () => void;
  onCallAgain?: (mediaType?: 'audio' | 'video') => void;
}

function formatVoiceDuration(totalSec: number) {
  const safeTotal = Math.max(0, Math.floor(totalSec));
  const min = Math.floor(safeTotal / 60);
  const sec = safeTotal % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export const ChatWindow = ({
  user,
  messages,
  loading = false,
  loadingOlder = false,
  hasOlder = false,
  connected,
  onSendMessage,
  onLoadOlder,
  onReactMessage,
  onDeleteMessage,
  onReportMessage,
  onClose,
  fullScreen,
  callStatus = 'idle',
  callMediaType = 'audio',
  isMuted = false,
  canStartVoiceCall = true,
  canStartVideoCall = true,
  onStartVoiceCall,
  onStartVideoCall,
  onEndVoiceCall,
  onToggleMute,
}: ChatWindowProps) => {
  const [inputText, setInputText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const { messageListRef, showJumpToLatest, scrollToBottom, handleListScroll } = useChatScroll(
    messages.length,
    loading,
    user.id,
    onLoadOlder,
    hasOlder,
    loadingOlder
  );

  const {
    isRecordingVoice,
    isSendingVoice,
    voiceRecordingSec,
    startVoiceRecording,
    stopAndSendVoiceRecording,
    cancelVoiceRecording,
  } = useVoiceRecorder(connected, onSendMessage, setReportNotice);

  const {
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
    sendPendingImages,
    sendPendingFiles,
  } = useAttachments(connected, onSendMessage, setReportNotice);

  const {
    showCamera,
    isOpeningCamera,
    cameraVideoRef,
    openCamera,
    closeCamera,
    captureCameraPhoto,
  } = useCameraCapture(connected, setReportNotice, (file) => {
    // Manually add to pending images
    const event = { target: { files: [file], value: '' } } as any;
    handleImageSelect(event);
  });

  const handleSend = () => {
    const text = inputText.trim();
    if ((!text && pendingImages.length === 0 && pendingFiles.length === 0) || !connected || isRecordingVoice || isSendingVoice || isSendingImage || isSendingFile) {
      return;
    }

    if (pendingImages.length > 0) {
      void sendPendingImages(text || undefined);
      setInputText('');
      setReplyToMessage(null);
      return;
    }

    if (pendingFiles.length > 0) {
      void sendPendingFiles();
      setInputText('');
      setReplyToMessage(null);
      return;
    }

    const payload = replyToMessage
      ? `${REPLY_PREFIX}${JSON.stringify({
          text,
          replyToMessageId: replyToMessage.id,
          replyPreview: replyToMessage.text.slice(0, 120),
        })}`
      : text;
    onSendMessage(payload);
    setInputText('');
    setReplyToMessage(null);
  };

  const jumpToMessage = async (messageId: string) => {
    if (!messageId) return;
    const scrollToTarget = () => {
      const target = document.getElementById(`chat-message-${messageId}`);
      if (!target) return false;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      window.setTimeout(() => setHighlightedMessageId(prev => prev === messageId ? null : prev), 1300);
      return true;
    };

    if (scrollToTarget()) return;
    if (!onLoadOlder) return;

    for (let i = 0; i < 6; i++) {
      await Promise.resolve(onLoadOlder());
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      if (scrollToTarget() || !hasOlder) return;
    }
  };

  const handleReport = async (message: Message) => {
    const excerpt = message.text.slice(0, 40);
    const ok = await Promise.resolve(onReportMessage?.(message.id) ?? true);
    setReportNotice(ok ? `Đã báo cáo: "${excerpt}..."` : 'Không thể báo cáo lúc này');
    window.setTimeout(() => setReportNotice(null), 1800);
  };

  const hasActiveVoiceCall = callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'in_call';
  const isStartingVoiceCall = callStatus === 'calling' || callStatus === 'connecting';
  const isVideoCall = hasActiveVoiceCall && callMediaType === 'video';

  return (
    <div className={`
      ${fullScreen 
        ? 'w-full h-full flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden' 
        : 'fixed bottom-0 right-6 w-[360px] h-[520px] rounded-t-xl shadow-2xl z-50'}
      relative flex flex-col
    `}>
      <ChatHeader 
        user={user}
        connected={connected}
        fullScreen={fullScreen}
        onClose={onClose}
        hasActiveVoiceCall={hasActiveVoiceCall}
        isStartingVoiceCall={isStartingVoiceCall}
        isVideoCall={isVideoCall}
        onEndVoiceCall={onEndVoiceCall}
        onStartVoiceCall={onStartVoiceCall}
        onStartVideoCall={onStartVideoCall}
        canStartVoiceCall={canStartVoiceCall}
        canStartVideoCall={canStartVideoCall}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
      />

      <MessageList 
        ref={messageListRef}
        messages={messages}
        loadingOlder={loadingOlder}
        hasOlder={hasOlder}
        highlightedMessageId={highlightedMessageId}
        showJumpToLatest={showJumpToLatest}
        scrollToBottom={scrollToBottom}
        onJumpToMessage={jumpToMessage}
        onReactMessage={onReactMessage}
        onDeleteMessage={onDeleteMessage}
        onReplyMessage={setReplyToMessage}
        onForwardMessage={(msg) => setInputText(prev => prev ? `${prev}\n${msg.text}` : msg.text)}
        onReportMessage={handleReport}
        onScroll={handleListScroll}
      />

      <PendingAttachments 
        pendingImages={pendingImages}
        pendingFiles={pendingFiles}
        removePendingImage={removePendingImage}
        removePendingFile={removePendingFile}
      />

      <Composer 
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        connected={connected}
        isRecordingVoice={isRecordingVoice}
        isSendingVoice={isSendingVoice}
        isSendingImage={isSendingImage}
        isSendingFile={isSendingFile}
        isOpeningCamera={isOpeningCamera}
        onStartVoice={startVoiceRecording}
        onStopAndSendVoice={stopAndSendVoiceRecording}
        onCancelVoice={cancelVoiceRecording}
        onImageClick={() => imageInputRef.current?.click()}
        onFileClick={() => fileInputRef.current?.click()}
        onCameraClick={openCamera}
        onEmojiClick={() => setShowEmojiPicker(!showEmojiPicker)}
        replyToMessage={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
        voiceRecordingSec={voiceRecordingSec}
        formatVoiceDuration={formatVoiceDuration}
        imageInputRef={imageInputRef}
        fileInputRef={fileInputRef}
        handleImageSelect={handleImageSelect}
        handleFileSelect={handleFileSelect}
      />

      <CameraModal 
        show={showCamera}
        videoRef={cameraVideoRef}
        onClose={closeCamera}
        onCapture={captureCameraPhoto}
      />

      {reportNotice && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-gray-800/90 text-white text-sm rounded-lg shadow-xl z-[200] animate-in fade-in zoom-in duration-200">
          {reportNotice}
        </div>
      )}
    </div>
  );
};
