import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  Minus,
  X,
  Smile,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sticker,
  FileImage,
  Send,
  Trash2,
  Pause,
  ArrowLeft,
  Info,
  ChevronDown,
} from 'lucide-react';
import { ChatUser, Message } from '../../types/message.types';
import { MessageBubble } from '../MessageBubble';
import { formatLastActiveLabel } from '../../utils/presenceLabel';
import { chatService } from '@/services/chatService';

const REPLY_PREFIX = '__REPLY__:';
const VOICE_MESSAGE_PREFIX = '__VOICE__:';
const IMAGE_MESSAGE_PREFIX = '__IMAGE__:';
const MAX_VOICE_RECORDING_SEC = 60;
const MAX_PENDING_IMAGES = 6;

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
}

function formatVoiceDuration(totalSec: number) {
  const safeTotal = Math.max(0, Math.floor(totalSec));
  const min = Math.floor(safeTotal / 60);
  const sec = safeTotal % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function getAudioFileExtension(mimeType: string) {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'webm';
}

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

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
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
  onMinimize,
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
  onCallAgain,
}: ChatWindowProps) => {
  const [inputText, setInputText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [isSendingImage, setIsSendingImage] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [voiceRecordingSec, setVoiceRecordingSec] = useState(0);
  const messageListRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef(0);
  const voiceTimerRef = useRef<number | null>(null);
  const loadingOlderRef = useRef(false);
  const initializedRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const shouldStickToBottomRef = useRef(true);
  const prependScrollAdjustRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const list = messageListRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior });
    setShowJumpToLatest(false);
  };

  useEffect(() => {
    initializedRef.current = false;
    previousMessageCountRef.current = 0;
    shouldStickToBottomRef.current = true;
    prependScrollAdjustRef.current = null;
    loadingOlderRef.current = false;
  }, [user.id]);

  useEffect(() => {
    if (loading || initializedRef.current || messages.length === 0) return;
    scrollToBottom('auto');
    initializedRef.current = true;
    previousMessageCountRef.current = messages.length;
  }, [loading, messages.length]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) return;

    if (prependScrollAdjustRef.current) {
      const { scrollTop, scrollHeight } = prependScrollAdjustRef.current;
      const delta = list.scrollHeight - scrollHeight;
      list.scrollTop = scrollTop + delta;
      prependScrollAdjustRef.current = null;
      previousMessageCountRef.current = messages.length;
      return;
    }

    const appended = messages.length > previousMessageCountRef.current;
    if (appended && shouldStickToBottomRef.current) {
      scrollToBottom('smooth');
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) {
        window.clearInterval(voiceTimerRef.current);
      }
      voiceRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const handleListScroll = () => {
    const list = messageListRef.current;
    if (!list) return;

    const distanceToBottom = list.scrollHeight - (list.scrollTop + list.clientHeight);
    shouldStickToBottomRef.current = distanceToBottom < 120;
    setShowJumpToLatest(distanceToBottom > 320);

    if (!onLoadOlder || !hasOlder || loadingOlder || loadingOlderRef.current || list.scrollTop > 200) {
      return;
    }

    loadingOlderRef.current = true;
    prependScrollAdjustRef.current = { scrollTop: list.scrollTop, scrollHeight: list.scrollHeight };
    Promise.resolve(onLoadOlder()).finally(() => {
      loadingOlderRef.current = false;
    });
  };

  const handleSend = () => {
    const text = inputText.trim();
    if ((!text && pendingImages.length === 0) || !connected || isRecordingVoice || isSendingVoice || isSendingImage) {
      return;
    }

    if (pendingImages.length > 0) {
      void sendPendingImages(text || undefined);
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
      setInputText('');
      setReplyToMessage(null);
    } catch {
      setReportNotice('Không thể gửi ảnh.');
      window.setTimeout(() => setReportNotice(null), 1800);
    } finally {
      setIsSendingImage(false);
    }
  };

  const resetVoiceRecording = () => {
    if (voiceTimerRef.current) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    voiceRecorderRef.current = null;
    voiceChunksRef.current = [];
    voiceStartedAtRef.current = 0;
    setVoiceRecordingSec(0);
    setIsRecordingVoice(false);
  };

  const startVoiceRecording = async () => {
    if (!connected || isRecordingVoice || isSendingVoice) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setReportNotice('Trình duyệt không hỗ trợ ghi âm.');
      window.setTimeout(() => setReportNotice(null), 1800);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      voiceChunksRef.current = [];
      voiceStartedAtRef.current = Date.now();
      voiceStreamRef.current = stream;
      voiceRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = voiceChunksRef.current;
        const durationSec = Math.max(1, Math.round((Date.now() - voiceStartedAtRef.current) / 1000));
        const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
        if (voiceTimerRef.current) {
          window.clearInterval(voiceTimerRef.current);
          voiceTimerRef.current = null;
        }
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
        setIsRecordingVoice(false);
        setIsSendingVoice(true);
        try {
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: finalMimeType });
            const file = new File([blob], `voice-${Date.now()}.${getAudioFileExtension(finalMimeType)}`, {
              type: finalMimeType,
            });
            const uploaded = await chatService.uploadVoiceMessage(file, durationSec);
            onSendMessage(
              `${VOICE_MESSAGE_PREFIX}${JSON.stringify({
                audioUrl: uploaded.audioUrl,
                durationSec: uploaded.durationSec ?? durationSec,
                mimeType: uploaded.mimeType ?? finalMimeType,
              })}`,
            );
          }
        } catch {
          setReportNotice('Không thể gửi tin nhắn thoại.');
          window.setTimeout(() => setReportNotice(null), 1800);
        } finally {
          setIsSendingVoice(false);
          resetVoiceRecording();
        }
      };

      recorder.start(250);
      setIsRecordingVoice(true);
      setVoiceRecordingSec(0);
      voiceTimerRef.current = window.setInterval(() => {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - voiceStartedAtRef.current) / 1000));
        setVoiceRecordingSec(elapsedSec);
        if (elapsedSec >= MAX_VOICE_RECORDING_SEC && recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 500);
    } catch {
      setReportNotice('Không thể truy cập micro.');
      window.setTimeout(() => setReportNotice(null), 1800);
      resetVoiceRecording();
    }
  };

  const stopAndSendVoiceRecording = () => {
    const recorder = voiceRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resetVoiceRecording();
      return;
    }
    recorder.stop();
  };

  const cancelVoiceRecording = () => {
    const recorder = voiceRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    resetVoiceRecording();
  };

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

  const removePendingImage = (imageId: string) => {
    setPendingImages((prev) => {
      const target = prev.find((image) => image.id === imageId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((image) => image.id !== imageId);
    });
  };

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    onReactMessage?.(messageId, emoji);
  };

  const handleReply = (message: Message) => {
    setReplyToMessage(message);
    setShowEmojiPicker(false);
  };

  const handleDelete = (messageId: string) => {
    onDeleteMessage?.(messageId);
  };

  const handleForward = (message: Message) => {
    if (!message.text?.trim()) return;
    const prefix = message.systemType ? '' : 'Chuyển tiếp: ';
    setInputText((prev) => {
      const normalizedPrev = prev.trim();
      if (!normalizedPrev) return `${prefix}${message.text}`.trim();
      return `${normalizedPrev}\n${prefix}${message.text}`.trim();
    });
  };

  const handleReport = async (message: Message) => {
    const excerpt = message.text.slice(0, 40);
    const ok = await Promise.resolve(onReportMessage?.(message.id) ?? true);
    setReportNotice(
      ok
        ? `Đã báo cáo: "${excerpt}${message.text.length > 40 ? '...' : ''}"`
        : 'Không thể báo cáo tin nhắn lúc này',
    );
    window.setTimeout(() => {
      setReportNotice(null);
    }, 1800);
  };

  const hasActiveVoiceCall = callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'in_call';
  const isStartingVoiceCall = callStatus === 'calling' || callStatus === 'connecting';
  const isVideoCall = hasActiveVoiceCall && callMediaType === 'video';

  const shouldShowSenderAvatar = (index: number) => {
    const current = messages[index];
    if (!current || current.isOwn) {
      return false;
    }

    const next = messages[index + 1];
    if (!next) {
      return true;
    }

    // Show avatar at the last incoming message of a consecutive incoming block.
    return next.isOwn || next.senderId !== current.senderId;
  };

  const getLastOwnMessageId = () => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].isOwn) return messages[i].id;
    }
    return null;
  };

  const getLastOwnMessageStatusLabel = () => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (!message.isOwn || message.systemType) continue;
      if (message.deliveryStatus === 'SEEN') return 'Đã xem';
      if (message.deliveryStatus === 'DELIVERED') return 'Đã nhận';
      return 'Đã gửi';
    }
    return 'Đã gửi';
  };

  const lastOwnMessageId = getLastOwnMessageId();
  const isLastMessageFromMe = messages.length > 0 && messages[messages.length - 1].isOwn;
  const latestOwnMessageStatus = connected ? getLastOwnMessageStatusLabel() : 'Đã gửi';
  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const jumpToMessage = async (messageId: string) => {
    if (!messageId) return;

    const scrollToTarget = () => {
      const target = document.getElementById(`chat-message-${messageId}`);
      if (!target) return false;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      window.setTimeout(() => {
        setHighlightedMessageId((prev) => (prev === messageId ? null : prev));
      }, 1300);
      return true;
    };

    if (scrollToTarget()) return;
    if (!onLoadOlder) return;

    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve(onLoadOlder());
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (scrollToTarget() || !hasOlder) {
        return;
      }
    }
  };

  return (
    <div
      className={`
        ${
          fullScreen
            ? 'w-full h-full flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden'
            : 'fixed bottom-0 right-6 w-[360px] h-[520px] rounded-t-xl shadow-2xl animate-in slide-in-from-bottom-4 z-50'
        }
        relative flex flex-col
      `}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          {fullScreen && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2 cursor-pointer"
              title="Quay lại danh sách chat"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div className="relative">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {user.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{user.name}</h3>
            <p className="text-xs text-gray-500 truncate">
              {formatLastActiveLabel(user.isOnline, user.lastActiveAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={hasActiveVoiceCall ? onEndVoiceCall : onStartVoiceCall}
            disabled={hasActiveVoiceCall ? false : !connected || !canStartVoiceCall}
            className="p-2.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={hasActiveVoiceCall ? 'Kết thúc cuộc gọi' : 'Gọi thoại'}
          >
            {hasActiveVoiceCall ? (
              <PhoneOff className="w-5 h-5 text-red-500" />
            ) : (
              <Phone className={`w-5 h-5 ${isStartingVoiceCall ? 'text-amber-500' : 'text-blue-600'}`} />
            )}
          </button>
          <button
            onClick={onStartVideoCall}
            disabled={hasActiveVoiceCall || !connected || !canStartVideoCall}
            className="p-2.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gọi video"
          >
            <Video className={`w-[22px] h-[22px] ${isVideoCall ? 'text-emerald-600' : 'text-blue-600'}`} />
          </button>
          {fullScreen && (
            <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Thông tin">
              <Info className="w-5 h-5 text-blue-600" />
            </button>
          )}
          {hasActiveVoiceCall && (
            <button
              onClick={onToggleMute}
              className="p-2.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title={isMuted ? 'Bật mic' : 'Tắt mic'}
            >
              <Mic className={`w-5 h-5 ${isMuted ? 'text-red-500' : 'text-blue-600'}`} />
            </button>
          )}
          {!fullScreen && onMinimize && (
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <Minus className="w-4 h-4 text-blue-600" />
            </button>
          )}
          {!fullScreen && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4 text-blue-600" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={messageListRef}
        onScroll={handleListScroll}
        className={`flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gradient-to-b from-[#f5f8ff] to-[#eef4ff] ${
          fullScreen ? '' : ''
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-gray-400 text-sm">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện.
          </div>
        ) : (
          <>
            {!hasOlder && (
              <div className="flex items-center justify-center py-2 text-xs text-gray-500">
                Đã xem hết tin nhắn cũ
              </div>
            )}
            {loadingOlder && (
              <div className="flex items-center justify-center py-2 text-xs text-gray-500">
                Đang tải tin nhắn cũ...
              </div>
            )}
            {messages.map((message, index) => {
              const repliedMessage = message.replyToMessageId ? messageById.get(message.replyToMessageId) : undefined;
              const isReplyToSelf = Boolean(repliedMessage && repliedMessage.isOwn === message.isOwn);
              const replyContextLabel = message.isOwn
                ? isReplyToSelf
                  ? 'Bạn đã trả lời chính mình'
                  : `Bạn đã trả lời ${user.name}`
                : isReplyToSelf
                  ? `${user.name} đã trả lời chính mình`
                  : `${user.name} đã trả lời bạn`;

              return (
                <div
                  id={`chat-message-${message.id}`}
                  className={`rounded-2xl transition-colors duration-300 ${
                    highlightedMessageId === message.id ? 'bg-amber-100/80' : 'bg-transparent'
                  }`}
                >
                  <MessageBubble
                    key={message.id}
                    message={message}
                    replyContextLabel={replyContextLabel}
                    onReact={handleReact}
                    onReply={handleReply}
                    onJumpToMessage={jumpToMessage}
                    onDelete={handleDelete}
                    onForward={handleForward}
                    onReport={handleReport}
                    showSenderAvatar={shouldShowSenderAvatar(index)}
                    senderAvatar={user.avatar}
                    senderName={user.name}
                    showDeliveryStatus={
                      isLastMessageFromMe && message.isOwn && message.id === lastOwnMessageId && !message.systemType
                    }
                    deliveryStatusLabel={latestOwnMessageStatus}
                    onCallAgain={onCallAgain}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>

      {showJumpToLatest && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute right-4 bottom-[84px] w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 transition-colors flex items-center justify-center"
          title="Về tin nhắn mới nhất"
        >
          <ChevronDown className="w-5 h-5 text-blue-600" />
        </button>
      )}

      <div className="px-3 py-3 border-t border-gray-200 bg-white relative">
        {replyToMessage && (
          <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs text-gray-700">
                Đang trả lời: <span className="font-medium">{replyToMessage.text}</span>
              </p>
              <button
                onClick={() => setReplyToMessage(null)}
                className="shrink-0 text-xs text-blue-600 hover:underline"
              >
                Bỏ
              </button>
            </div>
          </div>
        )}
        {reportNotice && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {reportNotice}
          </div>
        )}
        {pendingImages.length > 0 && !isRecordingVoice && !isSendingVoice && (
          <div className="mb-2 rounded-2xl border border-blue-100 bg-blue-50/80 px-3 py-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-blue-700">
                {isSendingImage ? 'Đang gửi ảnh...' : `${pendingImages.length} ảnh đã chọn`}
              </span>
              <button
                type="button"
                onClick={clearPendingImages}
                disabled={isSendingImage}
                className="text-xs font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bỏ tất cả
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pendingImages.map((image) => (
                <div key={image.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
                  <img src={image.previewUrl} alt={image.file.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePendingImage(image.id)}
                    disabled={isSendingImage}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Bỏ ảnh"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {isRecordingVoice || isSendingVoice ? (
          <div
            className="flex items-center gap-2"
            style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
          >
            <button
              type="button"
              onClick={cancelVoiceRecording}
              disabled={isSendingVoice}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Hủy ghi âm"
            >
              <Trash2 className="h-5 w-5" />
            </button>

            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-blue-600 px-3 text-white shadow-sm">
              <button
                type="button"
                onClick={stopAndSendVoiceRecording}
                disabled={isSendingVoice}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 transition-transform hover:scale-105 disabled:opacity-70"
                title="Dừng và gửi ghi âm"
              >
                <Pause className="h-4 w-4 fill-current" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden="true">
                {Array.from({ length: 48 }).map((_, index) => (
                  <span
                    key={index}
                    className="h-1 w-1 shrink-0 rounded-full bg-white/95"
                    style={{ opacity: index % 5 === 0 ? 0.65 : 1 }}
                  />
                ))}
              </div>
              <span className="shrink-0 text-[11px] font-medium tabular-nums">
                {isSendingVoice ? '...' : formatVoiceDuration(voiceRecordingSec)}
              </span>
            </div>

            <button
              type="button"
              onClick={stopAndSendVoiceRecording}
              disabled={isSendingVoice}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Gửi ghi âm"
            >
              <Send className="h-6 w-6 fill-current" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={isRecordingVoice ? stopAndSendVoiceRecording : startVoiceRecording}
              disabled={!connected || isSendingVoice}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isRecordingVoice ? 'bg-blue-600 hover:bg-blue-700' : 'bg-transparent hover:bg-gray-100'
              }`}
              title={isRecordingVoice ? 'Dừng và gửi ghi âm' : 'Gửi tin nhắn thoại'}
            >
              <Mic className={`w-5 h-5 ${isRecordingVoice ? 'text-white' : 'text-blue-600'}`} />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={!connected || isSendingImage}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              title={isSendingImage ? 'Đang gửi ảnh...' : 'Đính kèm ảnh'}
            >
              <ImageIcon className="w-5 h-5 text-blue-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Sticker">
              <Sticker className="w-5 h-5 text-blue-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="GIF">
              <FileImage className="w-5 h-5 text-blue-600" />
            </button>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={connected ? 'Aa' : 'Đang kết nối...'}
                disabled={!connected || isSendingImage}
                className="w-full px-3 py-2 pr-11 bg-gray-100 rounded-full outline-none focus:bg-gray-200 transition-colors text-sm disabled:opacity-50"
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                title="Emoji"
              >
                <Smile className="w-5 h-5 text-blue-600" />
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={(!inputText.trim() && pendingImages.length === 0) || !connected || isSendingImage}
              className={`p-2 rounded-full transition-all ${
                (inputText.trim() || pendingImages.length > 0) && connected && !isSendingImage
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'text-blue-400 cursor-not-allowed'
              }`}
              title="Gửi"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div className="absolute bottom-full right-4 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 grid grid-cols-8 gap-2 z-10">
            {['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😭', '😡', '👍', '👎', '🎉', '❤️', '🔥', '👏', '🙏'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setInputText(inputText + emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-2xl hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};



