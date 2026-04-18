import { useState, useRef, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  Minus,
  X,
  Smile,
  Image as ImageIcon,
  Mic,
  Sticker,
  FileImage,
  Send,
  ArrowLeft,
  Info,
  ChevronDown,
} from 'lucide-react';
import { ChatUser, Message } from '../../types/message.types';
import { MessageBubble } from '../MessageBubble';
import { formatLastActiveLabel } from '../../utils/presenceLabel';

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
  const messageListRef = useRef<HTMLDivElement>(null);
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
    if (!text || !connected) return;
    const payload = replyToMessage
      ? `Tr? l?i "${replyToMessage.text.slice(0, 80)}": ${text}`
      : text;
    onSendMessage(payload);
    setInputText('');
    setReplyToMessage(null);
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
    const prefix = message.systemType ? '' : 'Chuy?n ti?p: ';
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
        ? `Ð? báo cáo: "${excerpt}${message.text.length > 40 ? '...' : ''}"`
        : 'Không th? báo cáo tin nh?n lúc này',
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
      if (message.deliveryStatus === 'SEEN') return 'Ð? xem';
      if (message.deliveryStatus === 'DELIVERED') return 'Ð? nh?n';
      return 'Ð? g?i';
    }
    return 'Ð? g?i';
  };

  const lastOwnMessageId = getLastOwnMessageId();
  const isLastMessageFromMe = messages.length > 0 && messages[messages.length - 1].isOwn;
  const latestOwnMessageStatus = connected ? getLastOwnMessageStatusLabel() : 'Ð? g?i';

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
              title="Quay l?i danh sách chat"
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
            title={hasActiveVoiceCall ? 'K?t thúc cu?c g?i' : 'G?i tho?i'}
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
            title="G?i video"
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
              title={isMuted ? 'B?t mic' : 'T?t mic'}
            >
              <Mic className={`w-5 h-5 ${isMuted ? 'text-red-500' : 'text-blue-600'}`} />
            </button>
          )}
          {!fullScreen && onMinimize && (
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Thu nh?"
            >
              <Minus className="w-4 h-4 text-blue-600" />
            </button>
          )}
          {!fullScreen && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Ðóng"
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
            Ðang t?i tin nh?n...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Chýa có tin nh?n nào. H?y b?t ð?u cu?c tr? chuy?n.
          </div>
        ) : (
          <>
            {!hasOlder && (
              <div className="flex items-center justify-center py-2 text-xs text-gray-500">
                Ð? xem h?t tin nh?n c?
              </div>
            )}
            {loadingOlder && (
              <div className="flex items-center justify-center py-2 text-xs text-gray-500">
                Ðang t?i tin nh?n c?...
              </div>
            )}
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                onReact={handleReact}
                onReply={handleReply}
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
            ))}
          </>
        )}
      </div>

      {showJumpToLatest && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute right-4 bottom-[84px] w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 transition-colors flex items-center justify-center"
          title="V? tin nh?n m?i nh?t"
        >
          <ChevronDown className="w-5 h-5 text-blue-600" />
        </button>
      )}

      <div className="px-3 py-3 border-t border-gray-200 bg-white relative">
        {replyToMessage && (
          <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs text-gray-700">
                Ðang tr? l?i: <span className="font-medium">{replyToMessage.text}</span>
              </p>
              <button
                onClick={() => setReplyToMessage(null)}
                className="shrink-0 text-xs text-blue-600 hover:underline"
              >
                B?
              </button>
            </div>
          </div>
        )}
        {reportNotice && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {reportNotice}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="G?i tin nh?n tho?i">
              <Mic className="w-5 h-5 text-blue-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Ðính kèm ?nh">
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
              placeholder={connected ? 'Aa' : 'Ðang k?t n?i...'}
              disabled={!connected}
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
            disabled={!inputText.trim() || !connected}
            className={`p-2 rounded-full transition-all ${
              inputText.trim() && connected
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'text-blue-400 cursor-not-allowed'
            }`}
            title="G?i"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-full right-4 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 grid grid-cols-8 gap-2 z-10">
            {['??', '??', '??', '??', '??', '??', '??', '??', '??', '??', '??', '??', '??', '?', '??', '??'].map((emoji) => (
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
