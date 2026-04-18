import { useState, useEffect, useRef } from 'react';
import { Smile, Reply, MoreVertical, PhoneMissed, Phone, Video, VideoOff } from 'lucide-react';
import { Message } from '../../types/message.types';

interface MessageBubbleProps {
  message: Message;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReport?: (message: Message) => void;
  showSenderAvatar?: boolean;
  senderAvatar?: string;
  senderName?: string;
  showDeliveryStatus?: boolean;
  deliveryStatusLabel?: string;
  onCallAgain?: (mediaType?: 'audio' | 'video') => void;
}

const quickReactions = ['??', '??', '??', '??', '??', '??'];
const extraReactions = ['??', '??', '??', '??', '??', '??', '??', '?'];

export const MessageBubble = ({
  message,
  onReact,
  onReply,
  onDelete,
  onForward,
  onReport,
  showSenderAvatar = false,
  senderAvatar,
  senderName = 'Sender',
  showDeliveryStatus = false,
  deliveryStatusLabel = 'Ð? g?i',
  onCallAgain,
}: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showExtraReactions, setShowExtraReactions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);

  // Click outside to close menu and reactions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(event.target as Node)) {
        setShowReactions(false);
      }
    };

    if (showMenu || showReactions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showReactions]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDuration = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleReaction = (emoji: string) => {
    if (message.deleted) {
      setShowReactions(false);
      setShowExtraReactions(false);
      return;
    }
    // Ch? gi? 1 reaction duy nh?t - n?u click l?i reaction ðang có th? xóa, n?u click reaction khác th? thay th?.
    if (message.reactions && message.reactions.length === 1 && message.reactions[0] === emoji) {
      // N?u click l?i reaction ðang có th? xóa h?t.
      onReact?.(message.id, '');
    } else {
      // N?u click reaction khác th? thay th?.
      onReact?.(message.id, emoji);
    }
    setShowReactions(false);
    setShowExtraReactions(false);
  };

  const handleMouseLeave = () => {
    setShowTimestamp(false);
    setIsHovering(false);
  };

  if (message.systemType === 'call_log' || message.systemType === 'missed_call') {
    const isCompleted = message.callLogKind === 'completed';
    const isVideoCall = message.callMediaType === 'video' || message.text.toLowerCase().includes('video');
    return (
      <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div
          className="w-[286px] max-w-[85vw] rounded-2xl bg-[#eef1e5] border border-[#dde2d2] p-2.5"
          style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              {isCompleted ? (
                isVideoCall ? (
                  <Video className="w-4.5 h-4.5 text-gray-700" />
                ) : (
                  <Phone className="w-4.5 h-4.5 text-gray-700" />
                )
              ) : (
                isVideoCall ? (
                  <VideoOff className="w-4.5 h-4.5 text-gray-700" />
                ) : (
                  <PhoneMissed className="w-4.5 h-4.5 text-gray-700" />
                )
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] leading-tight text-gray-900 font-semibold">{message.text}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                {isCompleted && typeof message.callDurationSec === 'number'
                  ? formatDuration(message.callDurationSec)
                  : formatTime(message.timestamp)}
              </p>
            </div>
          </div>
          <button
            onClick={() => onCallAgain?.(isVideoCall ? 'video' : 'audio')}
            className="mt-2.5 w-full rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors py-2 text-[15px] font-semibold text-gray-900 flex items-center justify-center gap-2"
          >
            {isVideoCall ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            {isVideoCall ? 'G?i video l?i' : 'G?i l?i'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-end gap-2 ${message.reactions && message.reactions.length > 0 ? 'mb-3' : 'mb-1'} ${message.isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => {
        setShowTimestamp(true);
        setIsHovering(true);
      }}
      onMouseLeave={handleMouseLeave}
    >
      {!message.isOwn && (
        <div className="w-7 h-7 flex-shrink-0">
          {showSenderAvatar ? (
            <img
              src={
                senderAvatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`
              }
              alt={senderName}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : null}
        </div>
      )}

      {showTimestamp && message.isOwn && (
        <span className="text-xs text-gray-500 self-end pb-0.5">{formatTime(message.timestamp)}</span>
      )}

      <div className="max-w-[70%]">
        <div className="relative group">
          <div
            className={`px-3 py-2 rounded-2xl break-words ${
              message.isOwn
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-900'
            }`}
          >
            <p className={`text-sm leading-relaxed ${message.deleted ? 'italic opacity-80' : ''}`}>
              {message.deleted ? 'Tin nh?n ð? ðý?c g?' : message.text}
            </p>
          </div>

          {message.reactions && message.reactions.length > 0 && (
            <div
              className={`absolute -bottom-2 bg-white rounded-full px-1.5 py-0.5 shadow-md border border-gray-200 flex items-center gap-0.5 z-[1] ${
                message.isOwn ? 'left-2' : 'right-2'
              }`}
            >
              {message.reactions.map((emoji, index) => (
                <span key={index} className="text-xs">
                  {emoji}
                </span>
              ))}
            </div>
          )}

          {isHovering && (
            <div
              className={`absolute top-0 -translate-y-1/2 flex items-center gap-0.5 bg-white rounded-full shadow-sm px-1 py-1 z-[2] ${
                message.isOwn ? 'right-full mr-1.5' : 'left-full ml-1.5'
              }`}
              style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
            >
              <button
                onClick={() => {
                  if (message.deleted) return;
                  setShowReactions(!showReactions);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                title="Th? c?m xúc"
                disabled={message.deleted}
              >
                <Smile className="w-3.5 h-3.5 text-gray-600" />
              </button>

              <button
                onClick={() => !message.deleted && onReply?.(message)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                title="Tr? l?i"
                disabled={message.deleted}
              >
                <Reply className="w-3.5 h-3.5 text-gray-600" />
              </button>

              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer relative"
                title="Tùy ch?n khác"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>
          )}

          {showReactions && (
            <div
              className={`absolute bottom-full mb-2 bg-white rounded-full shadow-xl border border-gray-200 px-3 py-2 flex items-center gap-2 z-10 ${
                message.isOwn ? 'right-0' : 'left-0'
              }`}
              ref={reactionRef}
            >
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl hover:scale-150 transition-transform duration-200 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => setShowExtraReactions((prev) => !prev)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Thêm emoji khác"
              >
                <span className="text-xl text-gray-600">+</span>
              </button>
            </div>
          )}
          {showReactions && showExtraReactions && (
            <div
              className={`absolute bottom-full mb-16 bg-white rounded-xl shadow-xl border border-gray-200 px-3 py-2 flex items-center gap-2 z-10 ${
                message.isOwn ? 'right-0' : 'left-0'
              }`}
              ref={reactionRef}
            >
              {extraReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl hover:scale-150 transition-transform duration-200 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {showMenu && (
            <div
              className={`absolute bottom-full mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-10 ${
                message.isOwn ? 'right-0' : 'left-0'
              }`}
              ref={menuRef}
              style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
            >
              <button
                onClick={() => {
                  onDelete?.(message.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                disabled={message.deleted || !message.isOwn}
              >
                {message.isOwn ? 'G?' : 'Ch? g? tin nh?n c?a b?n'}
              </button>
              <button
                onClick={() => {
                  onForward?.(message);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Chuy?n ti?p
              </button>
              <button
                onClick={() => {
                  onReport?.(message);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Báo cáo
              </button>
            </div>
          )}
        </div>

        {showDeliveryStatus && message.isOwn && !message.systemType && (
          <p
            className="mt-1 pr-1 text-right text-[11px] leading-4 text-gray-500"
            style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
          >
            {deliveryStatusLabel}
          </p>
        )}
      </div>

      {showTimestamp && !message.isOwn && (
        <span className="text-xs text-gray-500 self-end pb-0.5">{formatTime(message.timestamp)}</span>
      )}
    </div>
  );
};
