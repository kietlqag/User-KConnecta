import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { Smile, Reply, MoreVertical, PhoneMissed, Phone, Video, VideoOff, CornerUpLeft, Play, Pause, ChevronLeft, ChevronRight, X, FileText, Download, Newspaper, Users, Lock, Globe } from 'lucide-react';
import { Message } from '../../types/message.types';
import { normalizeCallDurationSeconds } from '../../utils/callDuration';
import { isGroupJoinLinkMessage, parseGroupJoinTokenFromUrl } from '../../utils/groupJoinLink';
import { MessageTextContent } from '../MessageTextContent/MessageTextContent';
import { VoiceWaveform } from '../VoiceWaveform/VoiceWaveform';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onJumpToMessage?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReport?: (message: Message) => void;
  onPinMessage?: (message: Message) => void;
  isPinnedMessage?: boolean;
  showSenderAvatar?: boolean;
  senderAvatar?: string;
  senderName?: string;
  replyContextLabel?: string;
  showDeliveryStatus?: boolean;
  deliveryStatusLabel?: string;
  onCallAgain?: (mediaType?: 'audio' | 'video') => void;
  onGroupJoinLinkClick?: (token: string) => void;
  isHighlighted?: boolean;
  themeColor?: string | null;
  groupWithPrevious?: boolean;
  groupWithNext?: boolean;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const extraReactions = ['👏', '🎉', '🔥', '🥰', '😎', '🤔', '🙏', '💯'];

interface StoryReplyContext {
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  slideImageUrl?: string | null;
  slideBackgroundColor?: string | null;
  text: string;
}
const STORY_REPLY_PREFIX = '__STORY_REPLY__:';

function hasStoryPreview(story?: StoryReplyContext | null) {
  if (!story) return false;
  const image = typeof story.slideImageUrl === 'string' ? story.slideImageUrl.trim() : '';
  const bg = typeof story.slideBackgroundColor === 'string' ? story.slideBackgroundColor.trim() : '';
  return image.length > 0 || bg.length > 0;
}

function getStoryBgStyle(imageUrl?: string | null, bgColor?: string | null): React.CSSProperties {
  if (imageUrl) return { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  const v = bgColor ?? '#1877f2';
  if (v.startsWith('linear-gradient') || v.startsWith('radial-gradient')) return { backgroundImage: v };
  return { backgroundColor: v };
}

export const MessageBubble = ({
  message,
  onReact,
  onReply,
  onJumpToMessage,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
  onReport,
  onPinMessage,
  isPinnedMessage = false,
  showSenderAvatar = false,
  senderAvatar,
  senderName = 'Sender',
  replyContextLabel,
  showDeliveryStatus = false,
  deliveryStatusLabel = 'Đã gửi',
  onCallAgain,
  onGroupJoinLinkClick,
  isHighlighted = false,
  themeColor,
  groupWithPrevious = false,
  groupWithNext = false,
}: MessageBubbleProps) => {
  const navigate = useNavigate();
  const [showReactions, setShowReactions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isStoryPreviewHovering, setIsStoryPreviewHovering] = useState(false);
  const [showExtraReactions, setShowExtraReactions] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [voiceCurrentSec, setVoiceCurrentSec] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

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
    const safeTotal = normalizeCallDurationSeconds(totalSec);
    const min = Math.floor(safeTotal / 60);
    const sec = safeTotal % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleReaction = (emoji: string) => {
    if (message.deleted) {
      setShowReactions(false);
      setShowExtraReactions(false);
      return;
    }
    // Chỉ giữ 1 reaction: click lại reaction hiện tại để xóa, click reaction khác để thay thế.
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
    setIsStoryPreviewHovering(false);
  };

  const openActionMenu = () => {
    const triggerRect = menuTriggerRef.current?.getBoundingClientRect();
    if (triggerRect) {
      const estimatedMenuHeight = 168;
      const estimatedMenuWidth = 184;
      const top = triggerRect.bottom + estimatedMenuHeight + 8 > window.innerHeight
        ? Math.max(8, triggerRect.top - estimatedMenuHeight - 8)
        : triggerRect.bottom + 8;
      const left = Math.min(
        Math.max(8, triggerRect.right - estimatedMenuWidth),
        window.innerWidth - estimatedMenuWidth - 8,
      );
      setMenuPosition({ top, left });
    }
    setShowMenu((prev) => !prev);
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

  // Only allow http/https URLs to prevent javascript:/data: XSS via window.open
  const isSafeUrl = (url: string): boolean => {
    try {
      const { protocol } = new URL(url);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  };

  const downloadFile = async (url: string, filename?: string) => {
    try {
      const response = await axios.get<Blob>(url, { responseType: 'blob' });
      const blob = response.data;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename?.trim() || 'file';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      if (isSafeUrl(url)) window.open(getDownloadUrl(url), '_blank', 'noopener,noreferrer');
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
  const ownBubbleStyle = message.isOwn && themeColor ? { backgroundColor: themeColor } : undefined;
  const groupJoinToken =
    !message.deleted && onGroupJoinLinkClick && isGroupJoinLinkMessage(message.text)
      ? parseGroupJoinTokenFromUrl(message.text.trim())
      : null;

  let storyCtx: StoryReplyContext | null = message.storyReplyAuthorId
    ? {
        authorId: message.storyReplyAuthorId,
        authorName: message.storyReplyAuthorName || senderName,
        authorAvatarUrl:
          message.storyReplyAuthorAvatarUrl ||
          senderAvatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'User')}&background=random`,
        slideImageUrl: message.storyReplySlideImageUrl ?? null,
        slideBackgroundColor: message.storyReplySlideBackgroundColor ?? null,
        text: message.text || '',
      }
    : null;
  if (!storyCtx && !message.deleted && message.text.startsWith(STORY_REPLY_PREFIX)) {
    try {
      storyCtx = JSON.parse(message.text.slice(STORY_REPLY_PREFIX.length)) as StoryReplyContext;
    } catch {
      storyCtx = null;
    }
  }
  const isStoryReply = !message.deleted && Boolean(storyCtx);
  const renderImageButton = (imageUrl: string, index: number, className = '') => (
    <button
      key={`${imageUrl}-${index}`}
      type="button"
      onClick={() => setLightboxIndex(index)} className={`block overflow-hidden rounded-2xl border border-black/5 bg-white dark:bg-gray-800 shadow-sm dark:shadow-none ${className}`}
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
    const avatarUrl = senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'User')}&background=random`;
    const avatar = (
      <img
        src={avatarUrl}
        alt={senderName}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        title={senderName}
      />
    );
    return (
      <div className={`flex min-w-0 items-end gap-2 ${message.isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        {!message.isOwn && avatar}
        <div
          className="w-[286px] max-w-full rounded-2xl bg-[#eef1e5] border border-[#dde2d2] p-2.5"
          style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
              {isCompleted ? (
                isVideoCall ? (
                  <Video className="w-4.5 h-4.5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Phone className="w-4.5 h-4.5 text-gray-700 dark:text-gray-300" />
                )
              ) : (
                isVideoCall ? (
                  <VideoOff className="w-4.5 h-4.5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <PhoneMissed className="w-4.5 h-4.5 text-gray-700 dark:text-gray-300" />
                )
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] leading-tight text-gray-900 dark:text-gray-100 font-semibold break-words [overflow-wrap:anywhere]">{message.text}</p>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                {isCompleted && typeof message.callDurationSec === 'number'
                  ? formatDuration(message.callDurationSec)
                  : formatTime(message.timestamp)}
              </p>
            </div>
          </div>
          <button
            onClick={() => onCallAgain?.(isVideoCall ? 'video' : 'audio')} className="mt-2.5 w-full rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 transition-colors py-2 text-[15px] font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-2"
          >
            {isVideoCall ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            {isVideoCall ? 'Gọi video lại' : 'Gọi lại'}
          </button>
        </div>
      </div>
    );
  }

  const hasReactions = Boolean(message.reactions && message.reactions.length > 0);
  const rowSpacing = hasReactions ? 'mb-2' : groupWithNext ? 'mb-0.5' : 'mb-1.5';
  const rowPadding = groupWithPrevious && groupWithNext ? 'py-0' : groupWithPrevious ? 'pt-0 pb-0.5' : groupWithNext ? 'pt-0.5 pb-0' : 'py-0.5';

  return (
    <div
      className={`flex min-w-0 items-end gap-1.5 ${rowSpacing} ${rowPadding} ${message.isOwn ? 'justify-end' : 'justify-start'} ${isHighlighted ? 'bg-blue-50/50 ring-1 ring-blue-100' : ''} transition-all duration-500 rounded-lg px-1 sm:gap-2 sm:px-2 sm:-mx-2`}
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
        <span className="hidden shrink-0 self-end pb-0.5 text-xs text-gray-500 dark:text-gray-400 sm:inline">{formatTime(message.timestamp)}</span>
      )}

      <div className={`min-w-0 max-w-[78%] lg:max-w-[70%] flex flex-col ${message.isOwn ? 'items-end' : 'items-start'}`}>
        {message.replyPreview && (
          <div className={`${message.isOwn ? 'text-right' : 'text-left'}`}>
            <div
              className={`flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ${
                message.isOwn ? 'justify-end pr-1' : 'justify-start pl-1'
              }`}
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
              <span>{replyContextLabel || (message.isOwn ? 'Bạn đã trả lời' : `${senderName} đã trả lời`)}</span>
            </div>
            <button
              type="button"
              onClick={() => message.replyToMessageId && onJumpToMessage?.(message.replyToMessageId)}
              disabled={!message.replyToMessageId} className={`relative z-[1] mt-0.5 inline-flex min-h-[48px] w-auto max-w-full rounded-2xl border px-2.5 py-2 text-left text-sm leading-tight transition-colors ${
                message.isOwn
                  ? 'ml-auto border-blue-200/90 bg-blue-100 text-blue-900 hover:bg-blue-200'
                  : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              } disabled:cursor-default disabled:opacity-80`}
              title={message.replyToMessageId ? 'Nhấn để đến tin nhắn gốc' : undefined}
            >
              <p className="max-w-[220px] whitespace-pre-wrap break-words [overflow-wrap:anywhere] line-clamp-2">{message.replyPreview}</p>
            </button>
          </div>
        )}
        <div className={`relative z-[3] group ${message.replyPreview ? '-mt-[22px]' : ''}`}>
          {isStoryReply && storyCtx ? (
            <div className={`flex max-w-full flex-col gap-1.5 ${message.isOwn ? 'self-end items-end' : 'self-start items-start'}`}>
              {hasStoryPreview(storyCtx) ? (
                <button
                  type="button"
                  onClick={() => navigate(`/stories/${storyCtx.authorId}`)}
                  onMouseEnter={() => setIsStoryPreviewHovering(true)}
                  onMouseLeave={() => setIsStoryPreviewHovering(false)}
                  className="group/story relative w-[min(132px,36vw)] aspect-[9/16] overflow-hidden rounded-2xl border border-black/10 bg-white dark:bg-gray-800/75"
                  title={`Xem tin của ${storyCtx.authorName}`}
                >
                  <div className="absolute inset-0 opacity-90" style={getStoryBgStyle(storyCtx.slideImageUrl, storyCtx.slideBackgroundColor)} />
                  {storyCtx.slideImageUrl && (
                    <img src={storyCtx.slideImageUrl} alt="story preview" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover/story:bg-black/20 transition-colors" />
                  <div className="absolute left-2 right-2 bottom-2 rounded-lg bg-black/45 px-2 py-1 text-left text-[11px] text-white">
                    <p className="truncate">Tin của {storyCtx.authorName}</p>
                  </div>
                </button>
              ) : (
                <div
                  onMouseEnter={() => setIsStoryPreviewHovering(true)}
                  onMouseLeave={() => setIsStoryPreviewHovering(false)}
                  className="h-9 w-fit max-w-[min(210px,62vw)] rounded-2xl border border-black/5 bg-white dark:bg-gray-800/75 px-3 text-xs italic text-gray-600 dark:text-gray-400 flex items-center"
                >
                  Story unavailable
                </div>
              )}
              <div
                className={`relative z-[2] -mt-3 inline-block w-fit max-w-full overflow-hidden rounded-2xl px-3 py-2 break-all text-left [overflow-wrap:anywhere] ${
                  message.isOwn ? 'mr-1' : 'ml-1'
                } ${
                  message.isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
                style={ownBubbleStyle}
              >
                <p className="text-sm leading-relaxed break-all [overflow-wrap:anywhere]">{storyCtx.text || message.text}</p>
              </div>
            </div>
          ) : message.sharedPostId && !message.deleted ? (
            <button
              type="button"
              onClick={() => navigate(`/home?post=${message.sharedPostId}`)}
              className="flex w-[min(300px,72vw)] max-w-full flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/90 bg-white dark:bg-gray-800 text-left shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:shadow-md group/post-share"
              title="Xem bài viết"
            >
              <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-gray-100 dark:bg-background">
                {message.sharedPostImage ? (
                  <img
                    src={message.sharedPostImage}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/post-share:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200">
                    <Newspaper className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5">
                <p className="truncate text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {message.sharedPostAuthorName?.trim() || 'KConnecta'}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100 line-clamp-2">
                  {message.sharedPostContent?.trim() || 'Xem bài viết trên KConnecta'}
                </p>
              </div>
            </button>
          ) : message.sharedGroupId && !message.deleted ? (
            <button
              type="button"
              onClick={() => navigate(`/groups/${message.sharedGroupId}`)}
              className="flex w-[min(300px,72vw)] max-w-full flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/90 bg-white dark:bg-gray-800 text-left shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:shadow-md group/group-share"
              title="Xem nhóm"
            >
              <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-gray-100 dark:bg-background">
                {message.sharedGroupCover ? (
                  <img
                    src={message.sharedGroupCover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/group-share:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200">
                    <Users className="h-10 w-10 text-blue-500/70" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5">
                <p className="truncate text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
                  {message.sharedGroupName?.trim() || 'Nhóm trên KConnecta'}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {message.sharedGroupPrivacy === 'PRIVATE' ? (
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Globe className="h-3.5 w-3.5" aria-hidden />
                  )}
                  <span>{message.sharedGroupPrivacy === 'PRIVATE' ? 'Nhóm Riêng tư' : 'Nhóm Công khai'}</span>
                  {typeof message.sharedGroupMemberCount === 'number' && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{message.sharedGroupMemberCount.toLocaleString('vi-VN')} thành viên</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ) : message.videoUrl && !message.deleted ? (
            <div className={`flex max-w-full flex-col sm:max-w-[386px] ${message.isOwn ? 'items-end' : 'items-start'}`}>
              <video
                src={message.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="max-h-[320px] w-[min(300px,72vw)] max-w-full rounded-2xl bg-black object-contain"
              />
            </div>
          ) : imageUrls.length > 0 && !message.deleted ? (
            <div className={`flex max-w-full flex-col gap-1.5 sm:max-w-[386px] ${message.isOwn ? 'items-end' : 'items-start'}`}>
              <div className={`flex flex-wrap gap-1.5 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                {imageUrls.map((imageUrl, index) =>
                  renderImageButton(
                    imageUrl,
                    index,
                    imageUrls.length === 1 ? 'max-h-[320px] w-[min(260px,70vw)] max-w-full' : 'h-[124px] w-[124px]',
                  ),
                )}
              </div>
              {message.imageCaption && (
                <div
                  className={`inline-block max-w-full overflow-hidden rounded-2xl px-3 py-2 text-sm leading-relaxed break-all [overflow-wrap:anywhere] sm:max-w-[260px] ${
                    message.isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                  style={ownBubbleStyle}
                >
                  {message.imageCaption}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`inline-block w-fit max-w-full overflow-hidden rounded-2xl break-all [overflow-wrap:anywhere] ${
                message.deleted ? 'px-2.5 py-1.5' : 'px-3 py-2'
              } ${
                message.isOwn
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
              style={ownBubbleStyle}
            >
              {message.voiceAudioUrl && !message.deleted ? (
              <div
                className="flex min-w-0 w-[min(260px,72vw)] max-w-full items-center gap-2.5 py-0.5 sm:min-w-[200px]"
                style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
              >
                <button
                  type="button"
                  onClick={toggleVoicePlayback}
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-105 ${
                    isVoicePlaying
                      ? message.isOwn
                        ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-blue-600'
                        : 'ring-2 ring-blue-500/35 ring-offset-2 ring-offset-gray-200 dark:ring-offset-gray-700'
                      : ''
                  }`}
                  title={isVoicePlaying ? 'Tạm dừng' : 'Phát tin nhắn thoại'}
                >
                  {isVoicePlaying ? (
                    <Pause className="h-4 w-4 fill-current text-blue-600" />
                  ) : (
                    <Play className="h-4 w-4 fill-current text-blue-600" />
                  )}
                </button>

                <VoiceWaveform
                  seed={message.id}
                  progress={voiceProgress}
                  isActive={isVoicePlaying}
                  variant={message.isOwn ? 'own' : 'other'}
                  className="min-w-0"
                />

                <span
                  className={`w-11 shrink-0 text-right text-[11px] font-semibold tabular-nums ${
                    message.isOwn ? 'text-white/95' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {isVoicePlaying
                    ? formatDuration(voiceCurrentSec)
                    : formatDuration(message.voiceDurationSec ?? 0)}
                </span>

                <audio
                  ref={audioRef}
                  src={message.voiceAudioUrl}
                  preload="metadata"
                  onTimeUpdate={(event) => {
                    const audio = event.currentTarget;
                    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
                    setVoiceCurrentSec(Math.floor(audio.currentTime));
                    setVoiceProgress(duration ? Math.min(100, (audio.currentTime / duration) * 100) : 0);
                  }}
                  onEnded={() => {
                    setIsVoicePlaying(false);
                    setVoiceProgress(0);
                    setVoiceCurrentSec(0);
                  }}
                  onPause={() => setIsVoicePlaying(false)}
                  className="hidden"
                />
              </div>
              ) : message.videoShareId && !message.deleted ? (
              <button
                type="button"
                onClick={() => {
                  if (message.videoShareId) {
                    navigate(`/home?post=${message.videoShareId}`);
                  } else {
                    navigate('/watch');
                  }
                }} className="flex flex-col min-w-0 w-[min(260px,68vw)] max-w-full overflow-hidden rounded-xl bg-black/5 group/video-share transition-transform hover:scale-[1.02]"
                title="Xem video"
              >
                <div className="relative aspect-[9/16] w-full overflow-hidden">
                  <img 
                    src={message.videoShareThumbnail} 
                    alt={message.videoShareTitle} 
                    className="h-full w-full object-cover transition-transform group-hover/video-share:scale-110"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video-share:bg-black/40 transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-800/30 backdrop-blur-md text-white shadow-lg">
                      <Play className="h-6 w-6 fill-current ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <Video className="h-3 w-3" />
                    REELS
                  </div>
                </div>
                <div className={`p-3 text-left ${message.isOwn ? 'bg-blue-700' : 'bg-gray-100 dark:bg-gray-900'}`}>
                  <p className={`text-sm font-semibold line-clamp-2 ${message.isOwn ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                    {message.videoShareTitle || 'Xem video này trên KConnecta'}
                  </p>
                  <p className={`mt-1 text-[11px] font-medium uppercase tracking-wider ${message.isOwn ? 'text-blue-100/70' : 'text-gray-500 dark:text-gray-400'}`}>
                    Nhấn để xem nội dung
                  </p>
                </div>
              </button>
              ) : message.fileUrl && !message.deleted ? (
              <button
                type="button"
                onClick={() => message.fileUrl && isSafeUrl(message.fileUrl) && window.open(message.fileUrl, '_blank', 'noopener,noreferrer')} className="flex min-w-0 w-[min(280px,68vw)] max-w-full items-center gap-3"
                title="Mở file"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    message.isOwn ? 'bg-white dark:bg-gray-800/20' : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <FileText className={`h-5 w-5 ${message.isOwn ? 'text-white' : 'text-blue-600'}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {message.fileName || message.text || 'File'}
                  </span>
                  <span className={`block text-xs ${message.isOwn ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                    {formatFileSize(message.fileSizeBytes) || message.fileMimeType || 'File'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void downloadFile(message.fileUrl, message.fileName);
                  }} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                    message.isOwn ? 'hover:bg-white dark:bg-gray-800/20' : 'hover:bg-blue-50'
                  }`}
                  title="Tải xuống"
                >
                  <Download className={`h-4 w-4 ${message.isOwn ? 'text-white/85' : 'text-blue-600'}`} />
                </button>
              </button>
              ) : groupJoinToken ? (
              <button
                type="button"
                onClick={() => onGroupJoinLinkClick?.(groupJoinToken)}
                className={`w-[min(280px,72vw)] max-w-full rounded-2xl border px-4 py-3 text-left transition-colors cursor-pointer ${
                  message.isOwn
                    ? 'border-white/20 bg-white/10 hover:bg-white/15'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
                }`}
              >
                <p className={`text-sm font-semibold ${message.isOwn ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                  Liên kết tham gia nhóm chat
                </p>
                <p className={`mt-1 text-xs ${message.isOwn ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                  Nhấn để xem thông tin nhóm và tham gia
                </p>
              </button>
              ) : (
              <MessageTextContent
                text={message.deleted ? 'Tin nhắn đã được gỡ' : message.text}
                isOwn={message.isOwn}
                onGroupJoinLinkClick={onGroupJoinLinkClick}
              />
              )}
            </div>
          )}

          {message.reactions && message.reactions.length > 0 && (
            <div
              className={`absolute -bottom-2 bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 shadow-md border border-gray-200 dark:border-gray-700 flex items-center gap-0.5 z-[1] ${
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

          {!message.deleted && isHovering && !(isStoryReply && isStoryPreviewHovering) && (
            <div
              onMouseEnter={() => {
                setIsHovering(true);
              }}
              onMouseLeave={() => {
                setIsHovering(false);
              }}
              className={`absolute flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-full shadow-sm dark:shadow-none ring-1 ring-gray-200 dark:ring-gray-700/70 px-1 py-1 z-20 ${
                isStoryReply ? 'top-[calc(100%-52px)]' : 'top-0 -translate-y-1/2'
              } ${
                message.isOwn ? 'right-[calc(100%+6px)]' : 'left-[calc(100%+6px)]'
              }`}
              style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
            >
              <button
                onClick={() => {
                  if (message.deleted) return;
                  setShowReactions(!showReactions);
                }} className="p-1 hover:bg-muted rounded-full transition-colors cursor-pointer"
                title="Thả cảm xúc"
                disabled={message.deleted}
              >
                <Smile className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </button>

              <button
                onClick={() => !message.deleted && onReply?.(message)} className="p-1 hover:bg-muted rounded-full transition-colors cursor-pointer"
                title="Trả lời"
                disabled={message.deleted}
              >
                <Reply className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </button>

              <button
                onClick={openActionMenu}
                ref={menuTriggerRef}
                className="p-1 hover:bg-muted rounded-full transition-colors cursor-pointer relative"
                title="Tùy chọn khác"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          )}

          {!message.deleted && showReactions && (
            <div
              className={`absolute bottom-full mb-2 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2 z-10 ${
                message.isOwn ? 'right-0' : 'left-0'
              }`}
              ref={reactionRef}
            >
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-150 transition-transform duration-200 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button
                onClick={() => setShowExtraReactions((prev) => !prev)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors cursor-pointer"
                title="Thêm emoji khác"
              >
                <span className="text-xl text-gray-600 dark:text-gray-400">+</span>
              </button>
            </div>
          )}
          {!message.deleted && showReactions && showExtraReactions && (
            <div
              className={`absolute bottom-full mb-16 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2 z-10 ${
                message.isOwn ? 'right-0' : 'left-0'
              }`}
              ref={reactionRef}
            >
              {extraReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-150 transition-transform duration-200 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {!message.deleted && showMenu && menuPosition && createPortal(
            <div
              className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[184px] z-[260]"
              ref={menuRef}
              style={{
                fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif',
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <button
                onClick={() => {
                  onPinMessage?.(message);
                  setShowMenu(false);
                }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
              >
                {isPinnedMessage ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
              </button>
              <button
                onClick={() => {
                  onForward?.(message);
                  setShowMenu(false);
                }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
              >
                Chuyển tiếp
              </button>
              <button
                onClick={() => {
                  onReport?.(message);
                  setShowMenu(false);
                }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
              >
                Báo cáo
              </button>
              {message.isOwn && (
                <>
                  <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <button
                      onClick={() => {
                      onDeleteForMe?.(message.id);
                      setShowMenu(false);
                    }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    disabled={message.deleted}
                  >
                    Gỡ ở phía tôi
                  </button>
                  <button
                    onClick={() => {
                      onDeleteForEveryone?.(message.id);
                      setShowMenu(false);
                    }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    disabled={message.deleted}
                  >
                      Gỡ cho mọi người
                  </button>
                </>
              )}
            </div>,
            document.body,
          )}
        </div>

        {showDeliveryStatus && message.isOwn && !message.systemType && (
          <p
            className="mt-0.5 pr-1 text-right text-[11px] leading-4 text-gray-500 dark:text-gray-400"
            style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
          >
            {deliveryStatusLabel}
          </p>
        )}
      </div>

      {showTimestamp && !message.isOwn && (
        <span className="hidden shrink-0 self-end pb-0.5 text-xs text-gray-500 dark:text-gray-400 sm:inline">{formatTime(message.timestamp)}</span>
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
            }} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800/15 text-white hover:bg-white dark:bg-gray-800/25"
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
              }} className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-gray-800/15 text-white hover:bg-white dark:bg-gray-800/25"
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
              }} className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-gray-800/15 text-white hover:bg-white dark:bg-gray-800/25"
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



