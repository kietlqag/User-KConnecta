import { useState, useMemo, useEffect, useCallback } from 'react';
import { Pin } from 'lucide-react';
import { ChatUser, Message } from '../../types/message.types';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { PendingAttachments } from './components/PendingAttachments';
import { Composer } from './components/Composer';
import { CameraModal } from './components/CameraModal';
import { PinnedMessagesModal, type PinnedChatMessage } from './components/PinnedMessagesModal';
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
  onDeleteMessageForMe?: (messageId: string) => void;
  onDeleteMessageForEveryone?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => Promise<boolean> | boolean;
  onForwardMessage?: (message: Message) => void;
  onPinMessage?: (message: Message) => void;
  pinnedMessages?: PinnedChatMessage[];
  onUnpinPinnedMessage?: (messageId: string) => void;
  currentUserId?: string | null;
  openPinnedMessagesSignal?: number;
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
  isGroupChat?: boolean;
  isGroupCreator?: boolean;
  groupCreatorName?: string;
  groupMembers?: ChatUser[];
  themeColor?: string | null;
  jumpToMessageRequest?: { messageId: string; nonce: number } | null;
  isFriend?: boolean;
  rateLimitUntil?: number | null;
  onGroupJoinLinkClick?: (token: string) => void;
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
  onDeleteMessageForMe,
  onDeleteMessageForEveryone,
  onReportMessage,
  onForwardMessage,
  onPinMessage,
  pinnedMessages = [],
  onUnpinPinnedMessage,
  currentUserId,
  openPinnedMessagesSignal = 0,
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
  isGroupChat = false,
  isGroupCreator = false,
  groupCreatorName = 'Người tạo',
  groupMembers = [],
  themeColor,
  jumpToMessageRequest = null,
  isFriend = true,
  rateLimitUntil = null,
  onGroupJoinLinkClick,
}: ChatWindowProps) => {
  const [inputText, setInputText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (!rateLimitUntil) {
      setCooldownSeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      return remaining;
    };
    if (tick() === 0) return;
    const id = window.setInterval(() => {
      if (tick() === 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [rateLimitUntil]);

  const { messageListRef, showJumpToLatest, scrollToBottom, handleListScroll, markUserScrollIntent } = useChatScroll(
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
    voiceLevels,
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
    handlePasteImages,
    handleFileSelect,
    removePendingImage,
    removePendingFile,
    sendPendingImages,
    sendPendingFiles,
  } = useAttachments(connected, onSendMessage, setReportNotice);

  const {
    showCamera,
    cameraMode,
    isOpeningCamera,
    isCameraReady,
    isRecordingVideo,
    isSendingVideo,
    videoRecordingLabel,
    cameraVideoRef,
    openCamera,
    closeCamera,
    switchCameraMode,
    captureCameraPhoto,
    startVideoRecording,
    stopVideoRecording,
    onCameraReady,
  } = useCameraCapture(connected, onSendMessage, setReportNotice, (file) => {
    const event = { target: { files: [file], value: '' } } as any;
    handleImageSelect(event);
  });

  const handleSend = () => {
    const text = inputText.trim();
    if ((!text && pendingImages.length === 0 && pendingFiles.length === 0) || !connected || cooldownSeconds > 0 || isRecordingVoice || isSendingVoice || isSendingImage || isSendingFile || isRecordingVideo || isSendingVideo) {
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

  const jumpToMessage = useCallback(async (messageId: string) => {
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
  }, [hasOlder, onLoadOlder]);

  const handleReport = async (message: Message) => {
    const excerpt = message.text.slice(0, 40);
    const ok = await Promise.resolve(onReportMessage?.(message.id) ?? true);
    setReportNotice(ok ? `Đã báo cáo: "${excerpt}..."` : 'Không thể báo cáo lúc này');
    window.setTimeout(() => setReportNotice(null), 1800);
  };

  const hasActiveVoiceCall = callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'in_call';
  const isStartingVoiceCall = callStatus === 'calling' || callStatus === 'connecting';
  const isVideoCall = hasActiveVoiceCall && callMediaType === 'video';

  useEffect(() => {
    if (openPinnedMessagesSignal > 0) {
      setShowPinnedModal(true);
    }
  }, [openPinnedMessagesSignal]);

  useEffect(() => {
    if (!jumpToMessageRequest?.messageId) return;
    void jumpToMessage(jumpToMessageRequest.messageId);
  }, [jumpToMessage, jumpToMessageRequest?.nonce]);

  return (
    <div className={`
      ${fullScreen 
        ? 'w-full h-full min-w-0 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden' 
        : 'fixed bottom-0 right-6 w-[360px] h-[520px] rounded-t-xl shadow-2xl z-50'}
      relative min-w-0 flex flex-col
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

      {pinnedMessages.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPinnedModal(true)}
          className="flex cursor-pointer items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-left hover:bg-muted"
          title="Tin nhắn đã ghim"
        >
          <Pin className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Đã ghim</span>
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {pinnedMessages[0]?.text || 'Tin nh?n'}
          </span>
          {pinnedMessages.length > 1 && (
            <span className="ml-auto rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {pinnedMessages.length}
            </span>
          )}
        </button>
      )}
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
        onDeleteMessageForMe={onDeleteMessageForMe}
        onDeleteMessageForEveryone={onDeleteMessageForEveryone}
        onReplyMessage={setReplyToMessage}
        onForwardMessage={(msg) => {
          if (onForwardMessage) {
            onForwardMessage(msg);
            return;
          }
          setInputText(prev => prev ? `${prev}\n${msg.text}` : msg.text);
        }}
        onPinMessage={onPinMessage}
        pinnedMessageIds={pinnedMessages.map((item) => item.messageId)}
        onReportMessage={handleReport}
        onScroll={handleListScroll}
        onUserScrollIntent={markUserScrollIntent}
        isGroupChat={isGroupChat}
        isGroupCreator={isGroupCreator}
        groupCreatorName={groupCreatorName}
        groupMembers={groupMembers}
        peerAvatar={user.avatar}
        peerName={user.name}
        groupName={user.name}
        groupAvatar={user.avatar}
        themeColor={themeColor}
        onGroupJoinLinkClick={onGroupJoinLinkClick}
      />

      {isFriend ? (
        <>
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
            cooldownSeconds={cooldownSeconds}
            isRecordingVoice={isRecordingVoice}
            isSendingVoice={isSendingVoice}
            isSendingImage={isSendingImage}
            isSendingFile={isSendingFile}
            isOpeningCamera={isOpeningCamera}
            hasPendingImages={pendingImages.length > 0}
            hasPendingFiles={pendingFiles.length > 0}
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
            voiceLevels={voiceLevels}
            formatVoiceDuration={formatVoiceDuration}
            imageInputRef={imageInputRef}
            fileInputRef={fileInputRef}
            handleImageSelect={handleImageSelect}
            handleFileSelect={handleFileSelect}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData?.files ?? []);
              const imageFiles = files.filter((file) => file.type.startsWith('image/'));
              if (imageFiles.length === 0) return;
              event.preventDefault();
              handlePasteImages(imageFiles);
            }}
          />
        </>
      ) : (
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400 select-none">
          Các bạn không còn là bạn bè để nhắn tin nữa
        </div>
      )}

      <CameraModal 
        show={showCamera}
        mode={cameraMode}
        videoRef={cameraVideoRef}
        isCameraReady={isCameraReady}
        isOpeningCamera={isOpeningCamera}
        isRecording={isRecordingVideo}
        isSending={isSendingVideo}
        recordingLabel={videoRecordingLabel}
        onClose={closeCamera}
        onModeChange={switchCameraMode}
        onCapture={captureCameraPhoto}
        onStartRecording={startVideoRecording}
        onStopRecording={stopVideoRecording}
        onCameraReady={onCameraReady}
      />

      {reportNotice && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-gray-800/90 text-white text-sm rounded-lg shadow-xl z-[200] animate-in fade-in zoom-in duration-200">
          {reportNotice}
        </div>
      )}

      <PinnedMessagesModal
        open={showPinnedModal}
        items={pinnedMessages}
        currentUserId={currentUserId}
        onClose={() => setShowPinnedModal(false)}
        onJumpToMessage={(messageId) => void jumpToMessage(messageId)}
        onUnpinMessage={(messageId) => onUnpinPinnedMessage?.(messageId)}
      />
    </div>
  );

};




