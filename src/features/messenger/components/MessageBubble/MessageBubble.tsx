import { useState, useEffect, useRef } from 'react';
import { Smile, Reply, MoreVertical, PhoneMissed, Phone, Video, VideoOff, CornerUpLeft, Play, Pause, ChevronLeft, ChevronRight, X, FileText, Download } from 'lucide-react';
import { Message } from '../../types/message.types';

interface MessageBubbleProps {
  message: Message;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onJumpToMessage?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReport?: (message: Message) => void;
  showSenderAvatar?: boolean;
  senderAvatar?: string;
  senderName?: string;
  replyContextLabel?: string;
  showDeliveryStatus?: boolean;
  deliveryStatusLabel?: string;
  onCallAgain?: (mediaType?: 'audio' | 'video') => void;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const extraReactions = ['👏', '🎉', '🔥', '🥰', '😎', '🤔', '🙏', '💯'];

export const MessageBubble = ({
  message,
  onReact,
  onReply,
  onJumpToMessage,
  onDelete,
  onForward,
  onReport,
  showSenderAvatar = false,
  senderAvatar,
  senderName = 'Sender',
  replyContextLabel,
  showDeliveryStatus = false,
  deliveryStatusLabel = 'Đã gửi',
  onCallAgain,
}: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showExtraReactions, setShowExtraReactions] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

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
    // Chỉ giữ 1 reaction duy nhất: click lại reaction hiện tại để xóa, click reaction khác để thay thế.
    if (message.reactions && message.reactions.length === 1 && message.reactions[0] === emoji) {
      // Nếu click lại reaction hiện tại thì xóa hết.
      onReact?.(message.id, '');
    } else {
      // Nếu click reaction khác thì thay thế.
      onReact?.(message.id, emoji);
    }
    setShowReactions(false);
    setShowExtraReactions(false);
  };

  const handleMouseLeave = () => {
    setShowTimestamp(false);
    setIsHovering(false);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || !Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDownloadUrl = (url: string) => {
    if (!url.includes('/upload/')) return url;
    return url.replace('/upload/', '/upload/fl_attachment/');
  };

  const downloadFile = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename?.trim() || 'file';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(getDownloadUrl(url), '_blank', 'noopener,noreferrer');
    }
  };

  const toggleVoicePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isVoicePlaying) {
      audio.pause();
      setIsVoicePlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsVoicePlaying(true);
    } catch {
      setIsVoicePlaying(false);
    }
  };

  const imageUrls = message.imageUrls?.length ? message.imageUrls : message.imageUrl ? [message.imageUrl] : [];
  const activeLightboxImage = lightboxIndex === null ? null : imageUrls[lightboxIndex];
  const renderImageButton = (imageUrl: string, index: number, className = '') => (
    <button
      key={`${imageUrl}-${index}`}
      type="button"
      onClick={() => setLightboxIndex(index)}
      className={`block overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm ${className}`}
      title="Mở ảnh"
    >
      <img
        src={imageUrl}
        alt={`Ảnh đã gửi ${index + 1}`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </button>
  );

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
            {isVideoCall ? 'Gọi video lại' : 'Gọi lại'}
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

      <div className={`max-w-[70%] flex flex-col ${message.isOwn ? 'items-end' : 'items-start'}`}>
        {message.replyPreview && (
          <div className={`${message.isOwn ? 'text-right' : 'text-left'}`}>
            <div
              className={`flex items-center gap-1 text-xs text-gray-500 ${
                message.isOwn ? 'justify-end pr-1' : 'justify-start pl-1'
              }`}
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
              <span>{replyContextLabel || (message.isOwn ? 'Bạn đã trả lời' : `${senderName} đã trả lời`)}</span>
            </div>
            <button
              type="button"
              onClick={() => message.replyToMessageId && onJumpToMessage?.(message.replyToMessageId)}
              disabled={!message.replyToMessageId}
              className={`relative z-[1] mt-0.5 inline-flex min-h-[48px] w-auto max-w-full rounded-2xl border px-2.5 py-2 text-left text-sm leading-tight transition-colors ${
                message.isOwn
                  ? 'ml-auto border-blue-200/90 bg-blue-100 text-blue-900 hover:bg-blue-200'
                  : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:cursor-default disabled:opacity-80`}
              title={message.replyToMessageId ? 'Nhấn để đến tin nhắn gốc' : undefined}
            >
              <p className="max-w-[220px] whitespace-pre-wrap break-words line-clamp-2">{message.replyPreview}</p>
            </button>
          </div>
        )}
        <div className={`relative z-[3] group ${message.replyPreview ? '-mt-[22px]' : ''}`}>
          {imageUrls.length > 0 && !message.deleted ? (
            <div className={`flex max-w-[386px] flex-col gap-1.5 ${message.isOwn ? 'items-end' : 'items-start'}`}>
              <div className={`flex flex-wrap gap-1.5 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                {imageUrls.map((imageUrl, index) =>
                  renderImageButton(
                    imageUrl,
                    index,
                    imageUrls.length === 1 ? 'max-h-[320px] w-[260px]' : 'h-[124px] w-[124px]',
                  ),
                )}
              </div>
              {message.imageCaption && (
                <div
                  className={`inline-block max-w-[260px] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {message.imageCaption}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`inline-block w-fit max-w-full rounded-2xl px-3 py-2 break-words ${
                message.isOwn
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {message.voiceAudioUrl && !message.deleted ? (
              <div
                className="flex min-w-[176px] max-w-[240px] items-center gap-2"
                style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
              >
                <button
                  type="button"
                  onClick={toggleVoicePlayback}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    message.isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-white hover:bg-gray-50'
                  }`}
                  title={isVoicePlaying ? 'Tạm dừng' : 'Phát tin nhắn thoại'}
                >
                  {isVoicePlaying ? (
                    <Pause className={`h-4 w-4 ${message.isOwn ? 'text-white' : 'text-blue-600'}`} />
                  ) : (
                    <Play className={`h-4 w-4 ${message.isOwn ? 'text-white' : 'text-blue-600'}`} />
                  )}
                </button>
                <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${message.isOwn ? 'bg-white/25' : 'bg-gray-300'}`}>
                  <div
                    className={`h-full rounded-full ${message.isOwn ? 'bg-white' : 'bg-blue-600'}`}
                    style={{ width: `${voiceProgress}%` }}
                  />
                </div>
                <span className={`w-10 shrink-0 text-right text-xs tabular-nums ${message.isOwn ? 'text-white/90' : 'text-gray-600'}`}>
                  {formatDuration(message.voiceDurationSec ?? 0)}
                </span>
                <audio
                  ref={audioRef}
                  src={message.voiceAudioUrl}
                  preload="metadata"
                  onTimeUpdate={(event) => {
                    const audio = event.currentTarget;
                    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
                    setVoiceProgress(duration ? Math.min(100, (audio.currentTime / duration) * 100) : 0);
                  }}
                  onEnded={() => {
                    setIsVoicePlaying(false);
                    setVoiceProgress(0);
                  }}
                  onPause={() => setIsVoicePlaying(false)}
                  className="hidden"
                />
              </div>
              ) : message.fileUrl && !message.deleted ? (
              <button
                type="button"
                onClick={() => window.open(message.fileUrl, '_blank', 'noopener,noreferrer')}
                className="flex min-w-[220px] max-w-[280px] items-center gap-3"
                title="Mở file"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    message.isOwn ? 'bg-white/20' : 'bg-white'
                  }`}
                >
                  <FileText className={`h-5 w-5 ${message.isOwn ? 'text-white' : 'text-blue-600'}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {message.fileName || message.text || 'File'}
                  </span>
                  <span className={`block text-xs ${message.isOwn ? 'text-white/80' : 'text-gray-500'}`}>
                    {formatFileSize(message.fileSizeBytes) || message.fileMimeType || 'File'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void downloadFile(message.fileUrl, message.fileName);
                  }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                    message.isOwn ? 'hover:bg-white/20' : 'hover:bg-blue-50'
                  }`}
                  title="Tải xuống"
                >
                  <Download className={`h-4 w-4 ${message.isOwn ? 'text-white/85' : 'text-blue-600'}`} />
                </button>
              </button>
              ) : (
              <p className={`whitespace-pre-wrap text-sm leading-relaxed ${message.deleted ? 'italic opacity-80' : ''}`}>
                {message.deleted ? 'Tin nhắn đã được gỡ' : message.text}
              </p>
              )}
            </div>
          )}

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
                title="Thả cảm xúc"
                disabled={message.deleted}
              >
                <Smile className="w-3.5 h-3.5 text-gray-600" />
              </button>

              <button
                onClick={() => !message.deleted && onReply?.(message)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                title="Trả lời"
                disabled={message.deleted}
              >
                <Reply className="w-3.5 h-3.5 text-gray-600" />
              </button>

              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer relative"
                title="Tùy chọn khác"
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
                {message.isOwn ? 'Gỡ' : 'Chỉ gỡ tin nhắn của bạn'}
              </button>
              <button
                onClick={() => {
                  onForward?.(message);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Chuyển tiếp
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

      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            title="Đóng"
          >
            <X className="h-6 w-6" />
          </button>

          {imageUrls.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setLightboxIndex((prev) => (prev === null ? 0 : (prev - 1 + imageUrls.length) % imageUrls.length));
              }}
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              title="Ảnh trước"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}

          <img
            src={activeLightboxImage}
            alt="Ảnh đã gửi"
            className="max-h-[88vh] max-w-[88vw] rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />

          {imageUrls.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % imageUrls.length));
              }}
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              title="Ảnh sau"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}

          {imageUrls.length > 1 && (
            <div className="absolute bottom-5 rounded-full bg-black/45 px-3 py-1 text-sm font-medium text-white">
              {(lightboxIndex ?? 0) + 1} / {imageUrls.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

