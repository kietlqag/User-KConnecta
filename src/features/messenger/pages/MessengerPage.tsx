import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  MoreHorizontal,
  Edit,
  RefreshCw,
  BellOff,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  UserPlus,
  UserRoundPlus,
  Check,
  X,
  Search as SearchIcon,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Video,
  Pin,
  Pencil,
  ImagePlus,
  Palette,
  Type,
} from 'lucide-react';
import { Header } from '../../home/components';
import { ConversationItem, ChatWindow } from '../components';
import type { PinnedChatMessage } from '../components/ChatWindow/components/PinnedMessagesModal';
import { Conversation, MessengerFilter } from '../types/messenger.types';
import { ChatUser, IncomingChatMessage, IncomingMessageStatus, Message } from '../types/message.types';
import { useFriendConversations } from '../hooks/useFriendConversations';
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import { formatLastActiveLabel } from '../utils/presenceLabel';
import { calculateCallDurationSeconds, normalizeCallDurationSeconds } from '../utils/callDuration';
import { toast } from 'sonner';

const CALL_LOG_PREFIX = '__CALL_LOG__:';
const REPLY_PREFIX = '__REPLY__:';
const VOICE_MESSAGE_PREFIX = '__VOICE__:';
const IMAGE_MESSAGE_PREFIX = '__IMAGE__:';
const FILE_MESSAGE_PREFIX = '__FILE__:';
const VIDEO_SHARE_PREFIX = '__VIDEO_SHARE__:';
const HISTORY_PAGE_SIZE = 15;

function uniqueByUserId<T extends { userId: string }>(items: T[]) {
  const byId = new Map<string, T>();
  items.forEach((item) => {
    if (item.userId && !byId.has(item.userId)) {
      byId.set(item.userId, item);
    }
  });
  return Array.from(byId.values());
}

function mapBackendContentToMessageFields(
  content: string,
): Pick<Message, 'text' | 'replyPreview' | 'replyToMessageId' | 'voiceAudioUrl' | 'voiceDurationSec' | 'voiceMimeType' | 'fileUrl' | 'fileName' | 'fileMimeType' | 'fileSizeBytes' | 'imageUrl' | 'imageUrls' | 'imageMimeType' | 'imageCaption' | 'systemType' | 'callLogKind' | 'callDurationSec' | 'callMediaType'> {
  if (!content?.startsWith(CALL_LOG_PREFIX)) {
    if (content?.startsWith(REPLY_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(REPLY_PREFIX.length));
        const messageText = typeof payload?.text === 'string' ? payload.text : '';
        const replyPreview = typeof payload?.replyPreview === 'string' ? payload.replyPreview : undefined;
        const replyToMessageId = typeof payload?.replyToMessageId === 'string' ? payload.replyToMessageId : undefined;
        return {
          text: messageText,
          replyPreview,
          replyToMessageId,
        };
      } catch {
        return { text: content };
      }
    }
    if (content?.startsWith(VOICE_MESSAGE_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(VOICE_MESSAGE_PREFIX.length));
        const voiceAudioUrl =
          typeof payload?.audioUrl === 'string'
            ? payload.audioUrl
            : typeof payload?.audioDataUrl === 'string'
              ? payload.audioDataUrl
              : undefined;
        const voiceDurationSec =
          typeof payload?.durationSec === 'number' && Number.isFinite(payload.durationSec)
            ? Math.max(0, Math.floor(payload.durationSec))
            : undefined;
        const voiceMimeType = typeof payload?.mimeType === 'string' ? payload.mimeType : undefined;
        return {
          text: 'Tin nhắn thoại',
          voiceAudioUrl,
          voiceDurationSec,
          voiceMimeType,
        };
      } catch {
        return { text: 'Tin nhắn thoại' };
      }
    }
    if (content?.startsWith(IMAGE_MESSAGE_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(IMAGE_MESSAGE_PREFIX.length));
        const imageUrl = typeof payload?.imageUrl === 'string' ? payload.imageUrl : undefined;
        const imageUrls = Array.isArray(payload?.imageUrls)
          ? payload.imageUrls.filter((url: unknown): url is string => typeof url === 'string' && url.trim().length > 0)
          : imageUrl
            ? [imageUrl]
            : undefined;
        const imageMimeType = typeof payload?.mimeType === 'string' ? payload.mimeType : undefined;
        const imageCaption = typeof payload?.caption === 'string' ? payload.caption.trim() : undefined;
        return {
          text: imageCaption || 'Ảnh',
          imageUrl: imageUrls?.[0],
          imageUrls,
          imageMimeType,
          imageCaption,
        };
      } catch {
        return { text: 'Ảnh' };
      }
    }
    if (content?.startsWith(FILE_MESSAGE_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(FILE_MESSAGE_PREFIX.length));
        const fileUrl = typeof payload?.fileUrl === 'string' ? payload.fileUrl : undefined;
        const fileName = typeof payload?.fileName === 'string' ? payload.fileName : 'File';
        const fileMimeType = typeof payload?.mimeType === 'string' ? payload.mimeType : undefined;
        const fileSizeBytes =
          typeof payload?.fileSizeBytes === 'number' && Number.isFinite(payload.fileSizeBytes)
            ? Math.max(0, Math.floor(payload.fileSizeBytes))
            : undefined;
        return {
          text: fileName,
          fileUrl,
          fileName,
          fileMimeType,
          fileSizeBytes,
        };
      } catch {
        return { text: 'File' };
      }
    }
    if (content?.startsWith(VIDEO_SHARE_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(VIDEO_SHARE_PREFIX.length));
        return {
          text: payload.caption || 'Đã chia sẻ một video',
          videoShareId: payload.id,
          videoShareThumbnail: payload.thumbnail,
          videoShareTitle: payload.caption,
        };
      } catch {
        return { text: 'Video' };
      }
    }
    return { text: content };
  }

  try {
    const payload = JSON.parse(content.slice(CALL_LOG_PREFIX.length));
    const mediaType: 'audio' | 'video' =
      payload?.mediaType === 'video' || String(payload?.label || '').toLowerCase().includes('video')
        ? 'video'
        : 'audio';
    const fallbackLabel =
      payload?.kind === 'completed'
        ? mediaType === 'video'
          ? 'Cuộc gọi video hoàn thành'
          : 'Cuộc gọi thoại hoàn thành'
        : mediaType === 'video'
          ? 'Đã bỏ lỡ cuộc gọi video'
          : 'Đã bỏ lỡ cuộc gọi thoại';

    return {
      text: payload?.label || fallbackLabel,
      systemType: 'call_log',
      callLogKind: payload?.kind === 'completed' ? 'completed' : 'missed',
      callDurationSec: typeof payload?.durationSec === 'number' ? normalizeCallDurationSeconds(payload.durationSec) : undefined,
      callMediaType: mediaType,
    };
  } catch {
    return {
      text: 'Đã bỏ lỡ cuộc gọi thoại',
      systemType: 'call_log',
      callLogKind: 'missed',
      callMediaType: 'audio',
    };
  }
}

function formatConversationPreview(text: string, isOwn: boolean) {
  const normalized = text.trim();
  if (!normalized) return '';
  return isOwn ? `Bạn: ${normalized}` : normalized;
}

function resolveDeliveryStatus(delivered?: boolean, seen?: boolean): Message['deliveryStatus'] {
  if (seen) return 'SEEN';
  if (delivered) return 'DELIVERED';
  return 'SENT';
}

function mapIncomingToMessage(raw: IncomingChatMessage, currentUserId?: string | null): Message {
  return {
    ...mapBackendContentToMessageFields(raw.content),
    id: raw.id,
    senderId: raw.senderId,
    timestamp: new Date(raw.createdAt),
    isOwn: raw.senderId === currentUserId,
    deliveryStatus: resolveDeliveryStatus(raw.delivered, raw.seen),
    seenAt: raw.seenAt,
    deleted: raw.deleted,
    deletedAt: raw.deletedAt,
    reactions: raw.reactions ?? [],
  };
}

interface HistoryState {
  initialized: boolean;
  loadingInitial: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  nextBeforeCreatedAt: string | null;
}

function defaultHistoryState(): HistoryState {
  return {
    initialized: false,
    loadingInitial: false,
    loadingOlder: false,
    hasMore: true,
    nextBeforeCreatedAt: null,
  };
}

type InfoPanelTab = 'media' | 'files' | 'links';
const INFO_PANEL_PAGE_SIZE = 9;

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'File';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractLinksFromText(text?: string | null) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"']+/g) ?? [];
  return matches.map((link) => link.replace(/[),.;!?]+$/, ''));
}

function ChatInfoPanel({
  user,
  messages,
  isGroupChat = false,
  groupMembers = [],
  groupCreatorId,
  currentUserId,
  onOpenAddMembers,
  onOpenPinnedMessages,
  onOpenRenameGroup,
  onOpenChangeGroupImage,
  onOpenChangeTheme,
  onOpenNicknames,
}: {
  user: ChatUser;
  messages: Message[];
  isGroupChat?: boolean;
  groupMembers?: ChatUser[];
  groupCreatorId?: string;
  currentUserId?: string | null;
  onOpenAddMembers?: () => void;
  onOpenPinnedMessages?: () => void;
  onOpenRenameGroup?: () => void;
  onOpenChangeGroupImage?: () => void;
  onOpenChangeTheme?: () => void;
  onOpenNicknames?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<InfoPanelTab>('media');
  const [infoView, setInfoView] = useState<'overview' | 'files'>('overview');
  const [isMediaSectionOpen, setIsMediaSectionOpen] = useState(false);
  const [groupSectionsOpen, setGroupSectionsOpen] = useState({
    info: false,
    customize: false,
    options: false,
    members: false,
  });
  const [visibleLimits, setVisibleLimits] = useState<Record<InfoPanelTab, number>>({
    media: INFO_PANEL_PAGE_SIZE,
    files: INFO_PANEL_PAGE_SIZE,
    links: INFO_PANEL_PAGE_SIZE,
  });

  useEffect(() => {
    setVisibleLimits({
      media: INFO_PANEL_PAGE_SIZE,
      files: INFO_PANEL_PAGE_SIZE,
      links: INFO_PANEL_PAGE_SIZE,
    });
    setInfoView('overview');
    setActiveTab('media');
    setIsMediaSectionOpen(false);
    setGroupSectionsOpen({
      info: false,
      customize: false,
      options: false,
      members: false,
    });
  }, [user.id]);

  const mediaItems = useMemo(
    () =>
      messages.flatMap((message) => {
        if (message.deleted) return [];
        const urls = message.imageUrls?.length ? message.imageUrls : message.imageUrl ? [message.imageUrl] : [];
        return urls.map((url, index) => ({
          id: `${message.id}-media-${index}`,
          url,
          type: message.imageMimeType?.startsWith('video/') ? 'video' : 'image',
        }));
      }),
    [messages],
  );

  const fileItems = useMemo(
    () =>
      messages.flatMap((message) => {
        if (message.deleted || !message.fileUrl) return [];
        return [
          {
            id: `${message.id}-file`,
            url: message.fileUrl,
            label: message.fileName || 'File',
            meta: message.fileSizeBytes ? formatFileSize(message.fileSizeBytes) : message.fileMimeType || 'File',
          },
        ];
      }),
    [messages],
  );

  const linkItems = useMemo(
    () =>
      messages.flatMap((message) => {
        if (message.deleted) return [];
        return extractLinksFromText(message.imageCaption || message.text).map((url, index) => ({
          id: `${message.id}-link-${index}`,
          url,
          host: (() => {
            try {
              return new URL(url).hostname.replace(/^www\./, '');
            } catch {
              return url;
            }
          })(),
        }));
      }),
    [messages],
  );

  const visibleMediaItems = mediaItems.slice(0, visibleLimits.media);
  const visibleFileItems = fileItems.slice(0, visibleLimits.files);
  const visibleLinkItems = linkItems.slice(0, visibleLimits.links);

  const renderSeeMoreButton = (tab: InfoPanelTab, total: number) => {
    const visibleCount = visibleLimits[tab];
    const remainingCount = total - visibleCount;
    if (remainingCount <= 0) return null;
    return (
      <button
        type="button"
        onClick={() =>
          setVisibleLimits((prev) => ({
            ...prev,
            [tab]: Math.min(total, prev[tab] + INFO_PANEL_PAGE_SIZE),
          }))
        }
        className="mt-3 w-full rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
      >
        Xem thêm
      </button>
    );
  };

  const renderMediaGrid = () => (
    mediaItems.length > 0 ? (
      <>
        <div className="grid grid-cols-2 gap-1">
          {visibleMediaItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
              className="relative aspect-square overflow-hidden bg-gray-100"
              title="Mở media"
            >
              <img src={item.url} alt="Media đã gửi" className="h-full w-full object-cover" loading="lazy" />
              {item.type === 'video' && (
                <span className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 text-white">
                  <Video className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>
        {renderSeeMoreButton('media', mediaItems.length)}
      </>
    ) : (
      <EmptyInfoTab icon={<ImageIcon className="h-5 w-5" />} text="Chưa có ảnh hoặc video" />
    )
  );

  const renderFileList = () => (
    fileItems.length > 0 ? (
      <>
        <div className="space-y-2">
          {visibleFileItems.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3 hover:bg-gray-100"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <FileText className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{item.label}</span>
                <span className="block text-xs text-gray-500">{item.meta}</span>
              </span>
            </a>
          ))}
        </div>
        {renderSeeMoreButton('files', fileItems.length)}
      </>
    ) : (
      <EmptyInfoTab icon={<FileText className="h-5 w-5" />} text="Chưa có file" />
    )
  );

  const renderLinkList = () => (
    linkItems.length > 0 ? (
      <>
        <div className="space-y-2">
          {visibleLinkItems.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3 hover:bg-gray-100"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <LinkIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{item.host}</span>
                <span className="block truncate text-xs text-gray-500">{item.url}</span>
              </span>
            </a>
          ))}
        </div>
        {renderSeeMoreButton('links', linkItems.length)}
      </>
    ) : (
      <EmptyInfoTab icon={<LinkIcon className="h-5 w-5" />} text="Chưa có link" />
    )
  );

  const renderActiveDetail = () => {
    if (activeTab === 'media') return renderMediaGrid();
    if (activeTab === 'files') return renderFileList();
    return renderLinkList();
  };

  if (isGroupChat && infoView === 'overview') {
    const toggleGroupSection = (section: keyof typeof groupSectionsOpen) => {
      setGroupSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
    };
    const sortedMembers = [...groupMembers].sort((a, b) => {
      if (a.id === groupCreatorId) return -1;
      if (b.id === groupCreatorId) return 1;
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.name.localeCompare(b.name, 'vi');
    });

    const renderGroupSectionHeader = (
      section: keyof typeof groupSectionsOpen,
      label: string,
    ) => (
      <button
        type="button"
        onClick={() => toggleGroupSection(section)}
        className="flex min-h-[56px] w-full items-center justify-between rounded-lg px-3 text-left hover:bg-gray-50"
      >
        <span className="text-[15px] font-semibold text-gray-900">{label}</span>
        <ChevronUp className={`h-4.5 w-4.5 text-gray-900 transition-transform ${groupSectionsOpen[section] ? '' : 'rotate-180'}`} />
      </button>
    );

    return (
      <aside
        className="hidden h-full min-h-0 w-[320px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white px-4 py-4 xl:flex xl:flex-col"
        style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
      >
        <div className="shrink-0 px-1 pb-5 text-center">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=ffffff`}
            alt={user.name}
            className="mx-auto h-24 w-24 rounded-full object-cover"
          />
          <h3 className="mt-3 truncate text-lg font-semibold tracking-tight text-gray-900">{user.name}</h3>
          <p className="text-xs text-gray-500">{groupMembers.length} thành viên</p>
        </div>

        <div className="flex shrink-0 items-start justify-center gap-8 pb-5 text-center">
          <button type="button" className="group flex w-16 flex-col items-center gap-2" title="Tắt thông báo">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300">
              <BellOff className="h-4.5 w-4.5 text-gray-900" />
            </span>
            <span className="text-xs leading-tight text-gray-900">Tắt thông báo</span>
          </button>
          <button type="button" className="group flex w-16 flex-col items-center gap-2" title="Tìm kiếm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300">
              <SearchIcon className="h-4.5 w-4.5 text-gray-900" />
            </span>
            <span className="text-xs leading-tight text-gray-900">Tìm kiếm</span>
          </button>
        </div>

        <div className="space-y-2">
          {renderGroupSectionHeader('info', 'Thông tin về đoạn chat')}
          {groupSectionsOpen.info && (
            <div className="px-3 pb-3 text-sm text-gray-500">
              <button
                type="button"
                onClick={onOpenPinnedMessages}
                className="flex w-full items-center gap-3 rounded-lg py-2 text-left text-gray-900 hover:bg-gray-50"
                title="Xem tin nhắn đã ghim"
              >
                <Pin className="h-5 w-5 shrink-0 fill-gray-900 text-gray-900" />
                <span className="text-[15px] font-semibold">Xem tin nhắn đã ghim</span>
              </button>
            </div>
          )}

          {renderGroupSectionHeader('customize', 'Tùy chỉnh đoạn chat')}
          {groupSectionsOpen.customize && (
            <div className="space-y-1 px-3 pb-3 text-sm text-gray-900">
              <button type="button" onClick={onOpenRenameGroup} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-gray-50">
                <Pencil className="h-5 w-5 shrink-0 text-gray-900" />
                <span className="text-[15px] font-semibold">Đổi tên đoạn chat</span>
              </button>
              <button type="button" onClick={onOpenChangeGroupImage} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-gray-50">
                <ImagePlus className="h-5 w-5 shrink-0 text-gray-900" />
                <span className="text-[15px] font-semibold">Thay đổi ảnh</span>
              </button>
              <button type="button" onClick={onOpenChangeTheme} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-gray-50">
                <Palette className="h-5 w-5 shrink-0 text-indigo-600" />
                <span className="text-[15px] font-semibold">Đổi chủ đề</span>
              </button>
              <button type="button" onClick={onOpenNicknames} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-gray-50">
                <Type className="h-5 w-5 shrink-0 text-gray-900" />
                <span className="text-[15px] font-semibold">Chỉnh sửa biệt danh</span>
              </button>
              {/* Legacy actions remain intentionally hidden until wired to real handlers. */}
              <button type="button" className="hidden">
                Đổi tên đoạn chat
              </button>
              <button type="button" className="hidden">
                Đổi ảnh nhóm
              </button>
            </div>
          )}

          {renderGroupSectionHeader('options', 'Tùy chọn nhóm')}
          {groupSectionsOpen.options && (
            <div className="space-y-2 px-3 pb-3 text-sm text-gray-600">
              <button type="button" className="block w-full rounded-lg py-2 text-left hover:text-gray-900">
                Tìm kiếm trong đoạn chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('media');
                  setInfoView('files');
                }}
                className="block w-full rounded-lg py-2 text-left hover:text-gray-900"
              >
                Xem phương tiện, file và link
              </button>
            </div>
          )}

          {renderGroupSectionHeader('members', 'Thành viên trong đoạn chat')}
          {groupSectionsOpen.members && (
            <div className="space-y-3 px-3 pb-3 pt-1">
              {sortedMembers.map((member) => {
                const isCreator = member.id === groupCreatorId;
                const isCurrentUser = member.id === currentUserId;
                const subtitle = isCreator ? 'Người tạo nhóm' : isCurrentUser ? 'Bạn' : 'Do bạn thêm';

                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <img
                      src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                      alt={member.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-gray-900">{member.name}</p>
                      <p className="truncate text-sm text-gray-500">{subtitle}</p>
                    </div>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100"
                      title="Tùy chọn thành viên"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={onOpenAddMembers}
                className="flex w-full items-center gap-3 rounded-lg py-1 text-left hover:bg-gray-50"
                title="Thêm người"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900">
                  <UserPlus className="h-5 w-5" />
                </span>
                <span className="text-[15px] font-semibold text-gray-900">Thêm người</span>
              </button>
            </div>
          )}

          <section>
            <button
              type="button"
              className="flex min-h-[56px] w-full items-center justify-between rounded-lg px-3 text-left hover:bg-gray-50"
              onClick={() => setIsMediaSectionOpen((prev) => !prev)}
            >
              <span className="text-[15px] font-semibold text-gray-900">Phương tiện, File, Link</span>
              <ChevronUp className={`h-4.5 w-4.5 text-gray-900 transition-transform ${isMediaSectionOpen ? '' : 'rotate-180'}`} />
            </button>
            {isMediaSectionOpen && (
              <div className="space-y-4 px-3 pb-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('media');
                    setInfoView('files');
                  }}
                  className="flex w-full items-center gap-4 text-left"
                >
                  <ImageIcon className="h-5 w-5 text-gray-900" />
                  <span className="text-[15px] font-semibold text-gray-900">Phương tiện</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('files');
                    setInfoView('files');
                  }}
                  className="flex w-full items-center gap-4 text-left"
                >
                  <FileText className="h-5 w-5 text-gray-900" />
                  <span className="text-[15px] font-semibold text-gray-900">File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('links');
                    setInfoView('files');
                  }}
                  className="flex w-full items-center gap-4 text-left"
                >
                  <LinkIcon className="h-5 w-5 text-gray-900" />
                  <span className="text-[15px] font-semibold text-gray-900">Link</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="hidden xl:flex h-full min-h-0 w-[320px] shrink-0 overflow-hidden border-l border-gray-200 bg-white flex-col"
      style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      {infoView === 'overview' ? (
        <div className="flex h-full min-h-0 flex-col px-5 py-5">
          <div className="shrink-0 text-center">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover mx-auto"
            />
            <h3 className="mt-3 text-lg font-semibold text-gray-900 tracking-tight">{user.name}</h3>
            <p className="text-xs text-gray-500">{formatLastActiveLabel(user.isOnline, user.lastActiveAt)}</p>
          </div>

          <div className="mt-6 flex shrink-0 items-start justify-center gap-8 text-center">
            <button type="button" className="group flex w-16 flex-col items-center gap-2" title="Tắt thông báo">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300">
                <BellOff className="h-4.5 w-4.5 text-gray-900" />
              </span>
              <span className="text-xs leading-tight text-gray-900">Tắt thông báo</span>
            </button>
            <button type="button" className="group flex w-16 flex-col items-center gap-2" title="Tìm kiếm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300">
                <SearchIcon className="h-4.5 w-4.5 text-gray-900" />
              </span>
              <span className="text-xs leading-tight text-gray-900">Tìm kiếm</span>
            </button>
          </div>

          <section className="mt-8 shrink-0">
            <button
              type="button"
              className="flex w-full items-center justify-between py-2 text-left"
              onClick={() => setIsMediaSectionOpen((prev) => !prev)}
            >
              <span className="text-[15px] font-semibold text-gray-900">Phương tiện, File, Link</span>
              <ChevronUp className={`h-4.5 w-4.5 text-gray-900 transition-transform ${isMediaSectionOpen ? '' : 'rotate-180'}`} />
            </button>
            {isMediaSectionOpen && <div className="mt-4 space-y-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('media');
                  setInfoView('files');
                }}
                className="flex w-full items-center gap-4 text-left"
              >
                <ImageIcon className="h-5 w-5 text-gray-900" />
                <span className="text-[15px] font-semibold text-gray-900">Phương tiện</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('files');
                  setInfoView('files');
                }}
                className="flex w-full items-center gap-4 text-left"
              >
                <FileText className="h-5 w-5 text-gray-900" />
                <span className="text-[15px] font-semibold text-gray-900">File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('links');
                  setInfoView('files');
                }}
                className="flex w-full items-center gap-4 text-left"
              >
                <LinkIcon className="h-5 w-5 text-gray-900" />
                <span className="text-[15px] font-semibold text-gray-900">Link</span>
              </button>
            </div>}
          </section>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col px-5 py-5">
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setInfoView('overview')}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
              title="Quay lại"
            >
              <ArrowLeft className="h-5 w-5 text-gray-900" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">Phương tiện, File, Link</h3>
          </div>

          <div className="mt-8 grid shrink-0 grid-cols-3 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`pb-3 text-center text-sm font-semibold transition-colors ${
                activeTab === 'media' ? 'border-b-[3px] border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Phương tiện
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`pb-3 text-center text-sm font-semibold transition-colors ${
                activeTab === 'files' ? 'border-b-[3px] border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`pb-3 text-center text-sm font-semibold transition-colors ${
                activeTab === 'links' ? 'border-b-[3px] border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Link
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pt-5">
            {renderActiveDetail()}
          </div>
        </div>
      )}
    </aside>
  );
}

function EmptyInfoTab({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
        {icon}
      </div>
      {text}
    </div>
  );
}

export default function MessengerPage() {
  const currentUser = authService.getCurrentUser();

  const {
    conversations: baseConversations,
    loading: loadingConversations,
    error: friendsError,
    reload: loadFriends,
  } = useFriendConversations();

  const [overrides, setOverrides] = useState<Record<string, Partial<Conversation>>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [messagesByUser, setMessagesByUser] = useState<Record<string, Message[]>>({});
  const [historyByUser, setHistoryByUser] = useState<Record<string, HistoryState>>({});
  const [presenceByUser, setPresenceByUser] = useState<Record<string, { online: boolean; lastActiveAt?: string }>>({});
  const [, setPresenceClockTick] = useState(0);
  const [activeFilter, setActiveFilter] = useState<MessengerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [isAddGroupMembersOpen, setIsAddGroupMembersOpen] = useState(false);
  const [addGroupMemberSearch, setAddGroupMemberSearch] = useState('');
  const [selectedAddGroupMemberIds, setSelectedAddGroupMemberIds] = useState<string[]>([]);
  const [isAddingGroupMembers, setIsAddingGroupMembers] = useState(false);
  const [groupSettingsModal, setGroupSettingsModal] = useState<null | 'rename' | 'image' | 'theme' | 'nicknames'>(null);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupImageDraft, setGroupImageDraft] = useState('');
  const [groupThemeDraft, setGroupThemeDraft] = useState('#2563eb');
  const [nicknameEditingUserId, setNicknameEditingUserId] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [isSavingGroupSettings, setIsSavingGroupSettings] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [selectedForwardTargetIds, setSelectedForwardTargetIds] = useState<string[]>([]);
  const [pinnedMessagesByConversation, setPinnedMessagesByConversation] = useState<Record<string, PinnedChatMessage[]>>({});
  const [openPinnedMessagesSignal, setOpenPinnedMessagesSignal] = useState(0);
  const [pinnedConversationUserIds, setPinnedConversationUserIds] = useState<string[]>([]);
  const [serverGroupConversations, setServerGroupConversations] = useState<Conversation[]>([]);
  const [groupMembersById, setGroupMembersById] = useState<Record<string, ChatUser[]>>({});
  const [groupCreatorById, setGroupCreatorById] = useState<Record<string, string>>({});
  const callRecorderRef = useRef<MediaRecorder | null>(null);
  const callRecorderChunksRef = useRef<Blob[]>([]);
  const callRecorderAudioCtxRef = useRef<AudioContext | null>(null);
  const callRecorderMetaRef = useRef<{ callId: string; startedAt: number; mediaType: 'audio' | 'video' } | null>(null);
  const callRecorderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const callRecorderCanvasStreamRef = useRef<MediaStream | null>(null);
  const callRecorderAnimationFrameRef = useRef<number | null>(null);
  const callRecorderVideoElementsRef = useRef<{ local: HTMLVideoElement | null; remote: HTMLVideoElement | null }>({
    local: null,
    remote: null,
  });
  const isUploadingRecordingRef = useRef(false);
  const initialHistoryInFlightRef = useRef<Set<string>>(new Set());
  const olderHistoryInFlightRef = useRef<Set<string>>(new Set());
  const pendingMessageStatusRef = useRef<
    Record<string, { status: IncomingMessageStatus['status']; updatedAt?: string }>
  >({});

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPresenceClockTick((prev) => prev + 1);
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const baseConversationItems: Conversation[] = baseConversations.map((c) => ({
    ...c,
    user: {
      ...c.user,
      isOnline: presenceByUser[c.user.id]?.online ?? false,
      lastActiveAt: presenceByUser[c.user.id]?.lastActiveAt,
    },
    ...(overrides[c.user.id] ?? {}),
  }));

  const groupConversationItems: Conversation[] = serverGroupConversations.map((c) => ({
    ...c,
    ...(overrides[c.user.id] ?? {}),
  }));

  const conversations: Conversation[] = [...groupConversationItems, ...baseConversationItems];
  const pinnedConversationSet = useMemo(() => new Set(pinnedConversationUserIds), [pinnedConversationUserIds]);

  const loadPinnedConversations = useCallback(async () => {
    try {
      const pins = await chatService.getPinnedConversations();
      const ids = pins.flatMap((pin) => {
        if (pin.peerUserId) return [pin.peerUserId];
        if (pin.conversationId) return [`group:${pin.conversationId}`];
        return [];
      });
      setPinnedConversationUserIds(ids);
    } catch {
      setPinnedConversationUserIds([]);
    }
  }, []);

  useEffect(() => {
    void loadPinnedConversations();
  }, [loadPinnedConversations]);

  const getPinnedConversationKey = useCallback((row: {
    peerUserId?: string | null;
    conversationId?: string | null;
  }) => {
    if (row.peerUserId) return row.peerUserId;
    if (row.conversationId) return `group:${row.conversationId}`;
    return null;
  }, []);

  const mapPinnedMessageRow = useCallback((row: {
    id?: string | null;
    peerUserId?: string | null;
    conversationId?: string | null;
    messageId?: string | null;
    pinnedBy?: string | null;
    pinnedAt?: string | null;
    senderId?: string | null;
    senderName?: string | null;
    senderAvatarUrl?: string | null;
    messagePreview?: string | null;
    messageCreatedAt?: string | null;
  }): PinnedChatMessage | null => {
    const conversationKey = getPinnedConversationKey(row);
    if (!conversationKey || !row.messageId) return null;
    const previewFields = mapBackendContentToMessageFields(row.messagePreview || '');
    return {
      id: row.id,
      messageId: row.messageId,
      conversationKey,
      pinnedBy: row.pinnedBy,
      pinnedAt: row.pinnedAt ? new Date(row.pinnedAt) : null,
      senderId: row.senderId,
      senderName: row.senderName || 'Người dùng',
      senderAvatar: row.senderAvatarUrl,
      text: previewFields.text || row.messagePreview || 'Tin nhắn',
      messageCreatedAt: row.messageCreatedAt ? new Date(row.messageCreatedAt) : null,
    };
  }, [getPinnedConversationKey]);

  const loadPinnedMessages = useCallback(async () => {
    try {
      const rows = await chatService.getPinnedMessages();
      const mapped: Record<string, PinnedChatMessage[]> = {};
      rows.forEach((row) => {
        const item = mapPinnedMessageRow(row);
        if (!item) return;
        mapped[item.conversationKey] = [...(mapped[item.conversationKey] ?? []), item];
      });
      Object.keys(mapped).forEach((key) => {
        mapped[key] = mapped[key].sort((a, b) => (b.pinnedAt?.getTime() ?? 0) - (a.pinnedAt?.getTime() ?? 0));
      });
      setPinnedMessagesByConversation(mapped);
    } catch {
      setPinnedMessagesByConversation({});
    }
  }, [mapPinnedMessageRow]);

  useEffect(() => {
    void loadPinnedMessages();
  }, [loadPinnedMessages]);

  const activeChatUserId = searchParams.get('with');
  const isActiveGroupChat = Boolean(activeChatUserId && activeChatUserId.startsWith('group:'));
  const isActiveGroupCreator = Boolean(
    activeChatUserId &&
      isActiveGroupChat &&
      currentUser?.id &&
      groupCreatorById[activeChatUserId] === currentUser.id,
  );
  const activeGroupCreatorName = useMemo(() => {
    if (!activeChatUserId || !isActiveGroupChat) return 'Người tạo';
    const creatorId = groupCreatorById[activeChatUserId];
    if (!creatorId) return 'Người tạo';
    if (creatorId === currentUser?.id) return 'Bạn';
    const creatorMember = groupMembersById[activeChatUserId]?.find((member) => member.id === creatorId);
    return creatorMember?.name || 'Người tạo';
  }, [activeChatUserId, currentUser?.id, groupCreatorById, groupMembersById, isActiveGroupChat]);

  const activeChatUser = useMemo((): ChatUser | null => {
    if (!activeChatUserId) return null;
    const conv = conversations.find((c) => c.user.id === activeChatUserId);
    if (!conv) return null;
    return {
      id: conv.user.id,
      name: conv.user.name,
      avatar: conv.user.avatar,
      isOnline: conv.user.isOnline ?? false,
      lastActiveAt: conv.user.lastActiveAt,
    };
  }, [activeChatUserId, conversations]);

  const activeChatThemeColor = useMemo(() => {
    if (!activeChatUserId) return null;
    return conversations.find((conversation) => conversation.user.id === activeChatUserId)?.themeColor ?? null;
  }, [activeChatUserId, conversations]);

  const selectableFriends = useMemo(() => baseConversationItems.map((c) => c.user), [baseConversationItems]);

  const loadGroupConversations = useCallback(async () => {
    try {
      const groups = await chatService.getMyGroupConversations();
      const mapped: Conversation[] = groups.map((group) => ({
        id: group.id,
        user: {
          id: `group:${group.id}`,
          name: group.name,
          avatar:
            group.avatarUrl?.trim() ||
            `https://ui-avatars.com/api/?background=2563eb&color=ffffff&bold=true&name=${encodeURIComponent('Group')}`,
          isOnline: false,
        },
        lastMessage: 'Chưa có tin nhắn',
        timestamp: '',
        isUnread: false,
        isGroup: true,
        themeColor: group.themeColor,
      }));

      const membersMap: Record<string, ChatUser[]> = {};
      const creatorsMap: Record<string, string> = {};
      groups.forEach((group) => {
        const chatUserId = `group:${group.id}`;
        membersMap[chatUserId] = group.members.map((member) => ({
          id: member.userId,
          name: member.nickname || member.fullName || member.username || 'Người dùng',
          fullName: member.fullName || member.username || 'Người dùng',
          nickname: member.nickname,
          avatar:
            member.avatarUrl?.trim() ||
            `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(member.fullName || member.username || 'User')}`,
          isOnline: false,
        }));
        creatorsMap[chatUserId] = group.createdBy;
      });

      setServerGroupConversations(mapped);
      setGroupMembersById((prev) => ({ ...prev, ...membersMap }));
      setGroupCreatorById((prev) => ({ ...prev, ...creatorsMap }));
    } catch {
      // keep current state on failure
    }
  }, []);

  useEffect(() => {
    void loadGroupConversations();
  }, [loadGroupConversations]);

  const applyGroupConversationResponse = useCallback((group: Awaited<ReturnType<typeof chatService.getMyGroupConversations>>[number]) => {
    const chatUserId = `group:${group.id}`;
    const conversation: Conversation = {
      id: group.id,
      user: {
        id: chatUserId,
        name: group.name,
        avatar:
          group.avatarUrl?.trim() ||
          `https://ui-avatars.com/api/?background=2563eb&color=ffffff&bold=true&name=${encodeURIComponent('Group')}`,
        isOnline: false,
      },
      lastMessage: overrides[chatUserId]?.lastMessage || 'Chưa có tin nhắn',
      timestamp: overrides[chatUserId]?.timestamp || '',
      isUnread: Boolean(overrides[chatUserId]?.isUnread),
      isGroup: true,
      themeColor: group.themeColor,
    };
    setServerGroupConversations((prev) => [conversation, ...prev.filter((item) => item.user.id !== chatUserId)]);
    setGroupMembersById((prev) => ({
      ...prev,
      [chatUserId]: group.members.map((member) => ({
        id: member.userId,
        name: member.nickname || member.fullName || member.username || 'Người dùng',
        fullName: member.fullName || member.username || 'Người dùng',
        nickname: member.nickname,
        avatar:
          member.avatarUrl?.trim() ||
          `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(member.fullName || member.username || 'User')}`,
        isOnline: false,
      })),
    }));
    setGroupCreatorById((prev) => ({ ...prev, [chatUserId]: group.createdBy }));
  }, [overrides]);

  const loadInitialHistory = useCallback(
    async (peerUserId: string) => {
      if (!currentUser?.id) return;
      if (initialHistoryInFlightRef.current.has(peerUserId)) return;
      const current = historyByUser[peerUserId] ?? defaultHistoryState();
      if (current.initialized || current.loadingInitial) return;
      initialHistoryInFlightRef.current.add(peerUserId);

      setHistoryByUser((prev) => ({
        ...prev,
        [peerUserId]: {
          ...(prev[peerUserId] ?? defaultHistoryState()),
          loadingInitial: true,
        },
      }));

      try {
        const historyPage = peerUserId.startsWith('group:')
          ? await chatService.getGroupChatHistory(peerUserId.replace('group:', ''), {
              limit: HISTORY_PAGE_SIZE,
            })
          : await chatService.getChatHistory(currentUser.id, peerUserId, {
              limit: HISTORY_PAGE_SIZE,
            });
        const msgs = historyPage.messages.map((m) => mapIncomingToMessage(m, currentUser.id));
        setMessagesByUser((prev) => ({ ...prev, [peerUserId]: msgs }));
        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            initialized: true,
            loadingInitial: false,
            loadingOlder: false,
            hasMore: historyPage.hasMore,
            nextBeforeCreatedAt: historyPage.nextBeforeCreatedAt ?? null,
          },
        }));

        if (msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          setOverrides((prev) => ({
            ...prev,
            [peerUserId]: {
              ...(prev[peerUserId] ?? {}),
              lastMessage: formatConversationPreview(last.text, last.isOwn),
              timestamp: last.timestamp.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          }));
        }
      } catch {
        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            ...(prev[peerUserId] ?? defaultHistoryState()),
            loadingInitial: false,
          },
        }));
      } finally {
        initialHistoryInFlightRef.current.delete(peerUserId);
      }
    },
    [currentUser?.id, historyByUser],
  );

  const loadOlderHistory = useCallback(
    async (peerUserId: string) => {
      if (!currentUser?.id) return;
      if (olderHistoryInFlightRef.current.has(peerUserId)) return;
      const current = historyByUser[peerUserId] ?? defaultHistoryState();
      if (!current.initialized || current.loadingOlder || !current.hasMore) return;
      olderHistoryInFlightRef.current.add(peerUserId);

      const beforeCreatedAt = current.nextBeforeCreatedAt;
      setHistoryByUser((prev) => ({
        ...prev,
        [peerUserId]: {
          ...(prev[peerUserId] ?? defaultHistoryState()),
          loadingOlder: true,
        },
      }));
      if (!beforeCreatedAt) {
        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            ...(prev[peerUserId] ?? defaultHistoryState()),
            loadingOlder: false,
            hasMore: false,
          },
        }));
        olderHistoryInFlightRef.current.delete(peerUserId);
        return;
      }

      try {
        const historyPage = peerUserId.startsWith('group:')
          ? await chatService.getGroupChatHistory(peerUserId.replace('group:', ''), {
              limit: HISTORY_PAGE_SIZE,
              beforeCreatedAt,
            })
          : await chatService.getChatHistory(currentUser.id, peerUserId, {
              limit: HISTORY_PAGE_SIZE,
              beforeCreatedAt,
            });
        const olderMessages = historyPage.messages.map((m) => mapIncomingToMessage(m, currentUser.id));
        const existingMessages = messagesByUser[peerUserId] ?? [];
        const existingIds = new Set(existingMessages.map((m) => m.id));
        const dedupOlder = olderMessages.filter((m) => !existingIds.has(m.id));
        setMessagesByUser((prev) => {
          const existing = prev[peerUserId] ?? [];
          if (dedupOlder.length === 0) return prev;
          return { ...prev, [peerUserId]: [...dedupOlder, ...existing] };
        });

        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            ...(prev[peerUserId] ?? defaultHistoryState()),
            loadingOlder: false,
            hasMore: dedupOlder.length > 0 && historyPage.hasMore,
            nextBeforeCreatedAt: historyPage.nextBeforeCreatedAt ?? null,
          },
        }));
      } catch {
        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            ...(prev[peerUserId] ?? defaultHistoryState()),
            loadingOlder: false,
          },
        }));
      } finally {
        olderHistoryInFlightRef.current.delete(peerUserId);
      }
    },
    [currentUser?.id, historyByUser, messagesByUser],
  );

  useEffect(() => {
    if (!activeChatUserId) return;
    void loadInitialHistory(activeChatUserId);
  }, [activeChatUserId, loadInitialHistory]);

  const {
    connected,
    sendMessage,
    voiceCall,
    subscribeMessages,
    subscribeMessageStatuses,
    subscribePresenceStatuses,
    subscribePinnedMessages,
    sendMessageDelivered,
    sendConversationSeen,
  } = useRealtimeCall();

  const handleIncomingMessage = useCallback(
    (msg: IncomingChatMessage) => {
      console.log("[incoming]", msg);
      const myId = currentUser?.id;
      const otherUserId = msg.conversationId
        ? `group:${msg.conversationId}`
        : (msg.senderId === myId ? msg.receiverId : msg.senderId);
      if (!otherUserId) return;
      const pendingStatus = pendingMessageStatusRef.current[msg.id];
      const newMsgBase = mapIncomingToMessage(msg, myId);
      const newMsg = pendingStatus
        ? {
            ...newMsgBase,
            deliveryStatus: pendingStatus.status === 'SEEN' ? 'SEEN' : 'DELIVERED',
            seenAt: pendingStatus.status === 'SEEN' ? pendingStatus.updatedAt : newMsgBase.seenAt,
          }
        : newMsgBase;
      if (pendingStatus) {
        delete pendingMessageStatusRef.current[msg.id];
      }

      setMessagesByUser((prev) => ({
        ...prev,
        [otherUserId]: (() => {
          const existing = prev[otherUserId] ?? [];
          const existingIndex = existing.findIndex((m) => m.id === newMsg.id);
          if (existingIndex === -1) {
            return [...existing, newMsg];
          }
          const next = [...existing];
          next[existingIndex] = { ...next[existingIndex], ...newMsg };
          return next;
        })(),
      }));

      setOverrides((prev) => ({
        ...prev,
        [otherUserId]: {
          ...(prev[otherUserId] ?? {}),
          lastMessage: formatConversationPreview(newMsg.text, msg.senderId === myId),
          timestamp: 'Vừa xong',
          isUnread: activeChatUserId !== otherUserId,
        },
      }));

      if (newMsg.deleted) {
        setPinnedMessagesByConversation((prev) => {
          const current = prev[otherUserId] ?? [];
          if (!current.some((item) => item.messageId === newMsg.id)) return prev;
          const nextItems = current.filter((item) => item.messageId !== newMsg.id);
          const next = { ...prev };
          if (nextItems.length === 0) {
            delete next[otherUserId];
          } else {
            next[otherUserId] = nextItems;
          }
          return next;
        });
      }

      if (msg.senderId !== myId && !msg.conversationId) {
        sendMessageDelivered(msg.id);
        if (activeChatUserId === otherUserId) {
          sendConversationSeen(otherUserId);
        }
      }
    },
    [activeChatUserId, currentUser?.id, sendConversationSeen, sendMessageDelivered],
  );

  useEffect(() => {
    return subscribeMessages((signalMessage) => {
      handleIncomingMessage(signalMessage);
    });
  }, [handleIncomingMessage, subscribeMessages]);

  const handleIncomingMessageStatus = useCallback((status: IncomingMessageStatus) => {
    let hasMatchedMessage = false;
    setMessagesByUser((prev) => {
      const next: Record<string, Message[]> = {};
      let changed = false;

      for (const [peerId, messages] of Object.entries(prev)) {
        let peerChanged = false;
        const updated = messages.map((message) => {
          if (message.id !== status.messageId) return message;
          const nextStatus: Message['deliveryStatus'] =
            status.status === 'SEEN' ? 'SEEN' : 'DELIVERED';
          peerChanged = true;
          changed = true;
          hasMatchedMessage = true;
          return {
            ...message,
            deliveryStatus: nextStatus,
            seenAt: status.status === 'SEEN' ? status.updatedAt : message.seenAt,
          };
        });
        next[peerId] = peerChanged ? updated : messages;
      }

      return changed ? next : prev;
    });
    if (!hasMatchedMessage) {
      pendingMessageStatusRef.current[status.messageId] = {
        status: status.status,
        updatedAt: status.updatedAt,
      };
    }
  }, []);

  useEffect(() => {
    return subscribeMessageStatuses((status) => {
      handleIncomingMessageStatus(status);
    });
  }, [handleIncomingMessageStatus, subscribeMessageStatuses]);

  useEffect(() => {
    return subscribePresenceStatuses((presence) => {
      setPresenceByUser((prev) => {
        const current = prev[presence.userId];
        if (current?.online === presence.online && current?.lastActiveAt === presence.lastActiveAt) {
          return prev;
        }
        return {
          ...prev,
          [presence.userId]: {
            online: presence.online,
            lastActiveAt: presence.lastActiveAt,
          },
        };
      });
    });
  }, [subscribePresenceStatuses]);

  useEffect(() => {
    return subscribePinnedMessages((event) => {
      const item = mapPinnedMessageRow(event);
      const key = item?.conversationKey ?? getPinnedConversationKey(event);
      if (!key || !event.messageId) return;
      setPinnedMessagesByConversation((prev) => {
        const current = prev[key] ?? [];
        const nextItems = event.pinned && item
          ? [item, ...current.filter((existing) => existing.messageId !== event.messageId)]
          : current.filter((existing) => existing.messageId !== event.messageId);
        const next = { ...prev };
        if (nextItems.length === 0) {
          delete next[key];
        } else {
          next[key] = nextItems.sort((a, b) => (b.pinnedAt?.getTime() ?? 0) - (a.pinnedAt?.getTime() ?? 0));
        }
        return next;
      });
    });
  }, [getPinnedConversationKey, mapPinnedMessageRow, subscribePinnedMessages]);

  useEffect(() => {
    if (!activeChatUserId) return;
    if (activeChatUserId.startsWith('group:')) return;
    if (!connected) return;
    sendConversationSeen(activeChatUserId);
  }, [activeChatUserId, connected, sendConversationSeen]);

  useEffect(() => {
    if (!activeChatUserId || !connected) return;
    if (activeChatUserId.startsWith('group:')) return;
    const intervalId = window.setInterval(() => {
      sendConversationSeen(activeChatUserId);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [activeChatUserId, connected, sendConversationSeen]);

  const stopAndUploadCallRecording = useCallback(
    async (finalCallId?: string | null) => {
      if (callRecorderAnimationFrameRef.current) {
        window.cancelAnimationFrame(callRecorderAnimationFrameRef.current);
        callRecorderAnimationFrameRef.current = null;
      }
      callRecorderCanvasStreamRef.current?.getTracks().forEach((track) => track.stop());
      callRecorderCanvasStreamRef.current = null;
      callRecorderCanvasRef.current = null;
      const localVideo = callRecorderVideoElementsRef.current.local;
      const remoteVideo = callRecorderVideoElementsRef.current.remote;
      if (localVideo) {
        localVideo.pause();
        localVideo.srcObject = null;
      }
      if (remoteVideo) {
        remoteVideo.pause();
        remoteVideo.srcObject = null;
      }
      callRecorderVideoElementsRef.current = { local: null, remote: null };

      const recorder = callRecorderRef.current;
      const meta = callRecorderMetaRef.current;
      if (!recorder || !meta) {
        return;
      }

      if (recorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });
      }

      const fallbackMimeType = meta.mediaType === 'video' ? 'video/webm' : 'audio/webm';
      const mimeType = recorder.mimeType || fallbackMimeType;
      const blob = new Blob(callRecorderChunksRef.current, { type: mimeType });
      const callId = finalCallId ?? meta.callId;
      const durationSec = calculateCallDurationSeconds(meta.startedAt);

      callRecorderRef.current = null;
      callRecorderChunksRef.current = [];
      callRecorderMetaRef.current = null;

      const audioCtx = callRecorderAudioCtxRef.current;
      callRecorderAudioCtxRef.current = null;
      if (audioCtx) {
        try {
          await audioCtx.close();
        } catch {
          // ignore close errors
        }
      }

      if (!callId || blob.size === 0 || isUploadingRecordingRef.current) {
        return;
      }

      isUploadingRecordingRef.current = true;
      try {
        const fileExt = mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `call-${callId}-${Date.now()}.${fileExt}`, {
          type: mimeType,
        });
        await chatService.uploadCallRecording(callId, file, durationSec, meta.mediaType);
      } catch (error) {
        console.error('[MessengerPage] Failed to upload call recording:', error);
      } finally {
        isUploadingRecordingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    const canRecord =
      (voiceCall.status === 'connecting' || voiceCall.status === 'in_call') &&
      Boolean(voiceCall.activeCallId) &&
      Boolean(voiceCall.localStream);

    if (!canRecord) {
      if (callRecorderRef.current) {
        void stopAndUploadCallRecording(voiceCall.activeCallId);
      }
      return;
    }

    if (callRecorderRef.current) {
      return;
    }

    const callId = voiceCall.activeCallId;
    const localStream = voiceCall.localStream;
    const remoteStream = voiceCall.remoteStream;
    if (!callId || !localStream) {
      return;
    }

    const audioCtx = new AudioContext();
    const destination = audioCtx.createMediaStreamDestination();
    const localSource = audioCtx.createMediaStreamSource(localStream);
    localSource.connect(destination);
    if (remoteStream) {
      const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
      remoteSource.connect(destination);
    }

    const recordingStream = new MediaStream();
    destination.stream.getAudioTracks().forEach((track) => {
      recordingStream.addTrack(track);
    });

    const isVideoCallRecording = voiceCall.callMediaType === 'video';
    if (isVideoCallRecording) {
      const remoteVideoTrack = remoteStream?.getVideoTracks().find((track) => track.readyState === 'live');
      const localVideoTrack = localStream.getVideoTracks().find((track) => track.readyState === 'live');
      if (remoteVideoTrack || localVideoTrack) {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const localVideo = document.createElement('video');
          localVideo.playsInline = true;
          localVideo.muted = true;
          localVideo.autoplay = true;
          if (localStream) {
            localVideo.srcObject = localStream;
            void localVideo.play().catch(() => {});
          }

          const remoteVideo = document.createElement('video');
          remoteVideo.playsInline = true;
          remoteVideo.muted = true;
          remoteVideo.autoplay = true;
          if (remoteStream) {
            remoteVideo.srcObject = remoteStream;
            void remoteVideo.play().catch(() => {});
          }

          callRecorderVideoElementsRef.current = { local: localVideo, remote: remoteVideo };
          callRecorderCanvasRef.current = canvas;

          const drawFrame = () => {
            const w = canvas.width;
            const h = canvas.height;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);

            const hasRemoteFrame =
              Boolean(remoteVideoTrack) && remoteVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
            const hasLocalFrame =
              Boolean(localVideoTrack) && localVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

            if (hasRemoteFrame) {
              ctx.drawImage(remoteVideo, 0, 0, w, h);
            } else if (hasLocalFrame) {
              ctx.drawImage(localVideo, 0, 0, w, h);
            }

            if (hasLocalFrame && hasRemoteFrame) {
              const pipW = Math.floor(w * 0.26);
              const pipH = Math.floor(h * 0.26);
              const pipX = w - pipW - 24;
              const pipY = h - pipH - 24;

              ctx.fillStyle = 'rgba(0,0,0,0.35)';
              ctx.fillRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);
              ctx.drawImage(localVideo, pipX, pipY, pipW, pipH);
            }

            callRecorderAnimationFrameRef.current = window.requestAnimationFrame(drawFrame);
          };

          drawFrame();

          const canvasStream = canvas.captureStream(30);
          callRecorderCanvasStreamRef.current = canvasStream;
          const composedVideoTrack = canvasStream.getVideoTracks()[0];
          if (composedVideoTrack) {
            recordingStream.addTrack(composedVideoTrack);
          }
        } else {
          const fallbackTrack = remoteVideoTrack ?? localVideoTrack;
          if (fallbackTrack) {
            recordingStream.addTrack(fallbackTrack);
          }
        }
      }
    }

    const hasVideoTrack = recordingStream.getVideoTracks().length > 0;
    const preferredMimeTypes = hasVideoTrack
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const supportedMimeType = preferredMimeTypes.find((mime) => MediaRecorder.isTypeSupported(mime));
    const recorder = supportedMimeType
      ? new MediaRecorder(recordingStream, { mimeType: supportedMimeType })
      : new MediaRecorder(recordingStream);

    callRecorderAudioCtxRef.current = audioCtx;
    callRecorderChunksRef.current = [];
    callRecorderMetaRef.current = { callId, startedAt: Date.now(), mediaType: hasVideoTrack ? 'video' : 'audio' };
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        callRecorderChunksRef.current.push(event.data);
      }
    };
    recorder.start(1000);
    callRecorderRef.current = recorder;

    return () => {
      if (callRecorderRef.current === recorder) {
        void stopAndUploadCallRecording(callId);
      }
    };
  }, [
    stopAndUploadCallRecording,
    voiceCall.activeCallId,
    voiceCall.callMediaType,
    voiceCall.localStream,
    voiceCall.remoteStream,
    voiceCall.status,
  ]);


  const handleConversationClick = useCallback(
    (conversation: Conversation) => {
      const otherUserId = conversation.user.id;
      setSearchParams({ with: otherUserId });
      setOverrides((prev) => ({
        ...prev,
        [otherUserId]: { ...(prev[otherUserId] ?? {}), isUnread: false },
      }));
    },
    [setSearchParams],
  );

  const handleBackToList = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleTogglePinConversation = useCallback(async (conversationUserId: string) => {
    const currentlyPinned = pinnedConversationSet.has(conversationUserId);
    try {
      if (conversationUserId.startsWith('group:')) {
        await chatService.setConversationPinned({
          conversationId: conversationUserId.replace('group:', ''),
          pinned: !currentlyPinned,
        });
      } else {
        await chatService.setConversationPinned({
          peerUserId: conversationUserId,
          pinned: !currentlyPinned,
        });
      }

      setPinnedConversationUserIds((prev) =>
        currentlyPinned ? prev.filter((id) => id !== conversationUserId) : [...prev, conversationUserId],
      );
    } catch {
      toast.error('Không thể cập nhật ghim đoạn chat.');
    }
  }, [pinnedConversationSet]);

  const handlePinMessage = useCallback(async (message: Message) => {
    if (!activeChatUserId) return;
    const current = pinnedMessagesByConversation[activeChatUserId] ?? [];
    const isUnpin = current.some((item) => item.messageId === message.id);
    const sender = message.senderId === currentUser?.id
      ? {
          name: currentUser.fullName || currentUser.username || 'Bạn',
          avatar: currentUser.avatarUrl,
        }
      : (groupMembersById[activeChatUserId]?.find((member) => member.id === message.senderId) || activeChatUser);
    const optimisticItem: PinnedChatMessage = {
      messageId: message.id,
      conversationKey: activeChatUserId,
      pinnedBy: currentUser?.id,
      pinnedAt: new Date(),
      senderId: message.senderId,
      senderName: sender?.name || 'Người dùng',
      senderAvatar: sender?.avatar,
      text: message.text || 'Tin nhắn',
      messageCreatedAt: message.timestamp,
    };

    setPinnedMessagesByConversation((prev) => {
      const existing = prev[activeChatUserId] ?? [];
      const nextItems = isUnpin
        ? existing.filter((item) => item.messageId !== message.id)
        : [optimisticItem, ...existing.filter((item) => item.messageId !== message.id)];
      const next = { ...prev };
      if (nextItems.length === 0) {
        delete next[activeChatUserId];
      } else {
        next[activeChatUserId] = nextItems;
      }
      return next;
    });

    try {
      if (activeChatUserId.startsWith('group:')) {
        const response = await chatService.setPinnedMessage({
          conversationId: activeChatUserId.replace('group:', ''),
          messageId: message.id,
          pinned: !isUnpin,
        });
        const serverItem = mapPinnedMessageRow(response);
        if (serverItem && response.pinned) {
          setPinnedMessagesByConversation((prev) => ({
            ...prev,
            [activeChatUserId]: [serverItem, ...(prev[activeChatUserId] ?? []).filter((item) => item.messageId !== serverItem.messageId)],
          }));
        }
      } else {
        const response = await chatService.setPinnedMessage({
          peerUserId: activeChatUserId,
          messageId: message.id,
          pinned: !isUnpin,
        });
        const serverItem = mapPinnedMessageRow(response);
        if (serverItem && response.pinned) {
          setPinnedMessagesByConversation((prev) => ({
            ...prev,
            [activeChatUserId]: [serverItem, ...(prev[activeChatUserId] ?? []).filter((item) => item.messageId !== serverItem.messageId)],
          }));
        }
      }
    } catch {
      setPinnedMessagesByConversation((prev) => {
        const existing = prev[activeChatUserId] ?? [];
        const nextItems = isUnpin
          ? [optimisticItem, ...existing.filter((item) => item.messageId !== message.id)]
          : existing.filter((item) => item.messageId !== message.id);
        const next = { ...prev };
        if (nextItems.length === 0) {
          delete next[activeChatUserId];
        } else {
          next[activeChatUserId] = nextItems;
        }
        return next;
      });
      toast.error('Không thể cập nhật ghim tin nhắn.');
    }
  }, [activeChatUser, activeChatUserId, currentUser, groupMembersById, mapPinnedMessageRow, pinnedMessagesByConversation]);

  const handleUnpinPinnedMessage = useCallback(async (messageId: string) => {
    if (!activeChatUserId) return;
    const currentItems = pinnedMessagesByConversation[activeChatUserId] ?? [];
    const removed = currentItems.find((item) => item.messageId === messageId);
    if (!removed) return;

    setPinnedMessagesByConversation((prev) => {
      const nextItems = (prev[activeChatUserId] ?? []).filter((item) => item.messageId !== messageId);
      const next = { ...prev };
      if (nextItems.length === 0) {
        delete next[activeChatUserId];
      } else {
        next[activeChatUserId] = nextItems;
      }
      return next;
    });

    try {
      if (activeChatUserId.startsWith('group:')) {
        await chatService.setPinnedMessage({
          conversationId: activeChatUserId.replace('group:', ''),
          messageId,
          pinned: false,
        });
      } else {
        await chatService.setPinnedMessage({
          peerUserId: activeChatUserId,
          messageId,
          pinned: false,
        });
      }
    } catch {
      setPinnedMessagesByConversation((prev) => ({
        ...prev,
        [activeChatUserId]: [removed, ...(prev[activeChatUserId] ?? []).filter((item) => item.messageId !== messageId)],
      }));
      toast.error('Không thể bỏ ghim tin nhắn.');
    }
  }, [activeChatUserId, pinnedMessagesByConversation]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeChatUserId) return;
      if (activeChatUserId.startsWith('group:')) {
        const conversationId = activeChatUserId.replace('group:', '');
        void chatService
          .sendGroupMessage(conversationId, content)
          .then((serverMsg) => {
            handleIncomingMessage(serverMsg);
          })
          .catch((error: any) => {
            toast.error(error?.message || 'Không thể gửi tin nhắn nhóm.');
          });
        return;
      }
      sendMessage(activeChatUserId, content);
    },
    [activeChatUserId, handleIncomingMessage, sendMessage],
  );

  const buildForwardContent = useCallback((message: Message) => {
    if (message.voiceAudioUrl) {
      return `${VOICE_MESSAGE_PREFIX}${JSON.stringify({
        audioUrl: message.voiceAudioUrl,
        durationSec: message.voiceDurationSec,
        mimeType: message.voiceMimeType,
      })}`;
    }
    if (message.imageUrl || (message.imageUrls && message.imageUrls.length > 0)) {
      return `${IMAGE_MESSAGE_PREFIX}${JSON.stringify({
        imageUrl: message.imageUrl || message.imageUrls?.[0],
        imageUrls: message.imageUrls,
        mimeType: message.imageMimeType,
        caption: message.imageCaption || '',
      })}`;
    }
    if (message.fileUrl) {
      return `${FILE_MESSAGE_PREFIX}${JSON.stringify({
        fileUrl: message.fileUrl,
        fileName: message.fileName || 'File',
        mimeType: message.fileMimeType,
        fileSizeBytes: message.fileSizeBytes,
      })}`;
    }
    return message.text || '';
  }, []);

  const toggleForwardTargetSelection = useCallback((targetId: string) => {
    setSelectedForwardTargetIds((prev) =>
      prev.includes(targetId) ? prev.filter((id) => id !== targetId) : [...prev, targetId],
    );
  }, []);

  const handleOpenForwardModal = useCallback((message: Message) => {
    setForwardMessage(message);
    setSelectedForwardTargetIds([]);
  }, []);

  const handleSubmitForward = useCallback(async () => {
    if (!forwardMessage || selectedForwardTargetIds.length === 0) return;
    const content = buildForwardContent(forwardMessage);
    if (!content.trim()) {
      toast.error('Không có nội dung để chuyển tiếp.');
      return;
    }

    try {
      await Promise.all(selectedForwardTargetIds.map(async (targetId) => {
        if (targetId.startsWith('group:')) {
          const conversationId = targetId.replace('group:', '');
          const sent = await chatService.sendGroupMessage(conversationId, content);
          handleIncomingMessage(sent);
          return;
        }
        sendMessage(targetId, content);
      }));

      toast.success('Đã chuyển tiếp tin nhắn.');
      setForwardMessage(null);
      setSelectedForwardTargetIds([]);
    } catch {
      toast.error('Không thể chuyển tiếp lúc này.');
    }
  }, [buildForwardContent, forwardMessage, handleIncomingMessage, selectedForwardTargetIds, sendMessage]);

  const toggleGroupMemberSelection = useCallback((userId: string) => {
    setSelectedGroupMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const openAddGroupMembersModal = useCallback(() => {
    setSelectedAddGroupMemberIds([]);
    setAddGroupMemberSearch('');
    setIsAddGroupMembersOpen(true);
  }, []);

  const closeAddGroupMembersModal = useCallback(() => {
    if (isAddingGroupMembers) return;
    setIsAddGroupMembersOpen(false);
    setSelectedAddGroupMemberIds([]);
    setAddGroupMemberSearch('');
  }, [isAddingGroupMembers]);

  const toggleAddGroupMemberSelection = useCallback((userId: string) => {
    setSelectedAddGroupMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const handleAddGroupMembers = useCallback(async () => {
    if (!activeChatUserId || !activeChatUserId.startsWith('group:')) return;
    if (selectedAddGroupMemberIds.length === 0) return;

    const conversationId = activeChatUserId.replace('group:', '');
    setIsAddingGroupMembers(true);
    try {
      const updated = await chatService.addGroupMembers(conversationId, selectedAddGroupMemberIds);
      const chatUserId = `group:${updated.id}`;
      const memberProfiles: ChatUser[] = updated.members.map((m) => ({
        id: m.userId,
        name: m.fullName || m.username || 'Người dùng',
        avatar:
          m.avatarUrl?.trim() ||
          `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(m.fullName || m.username || 'User')}`,
        isOnline: false,
      }));

      setGroupMembersById((prev) => ({ ...prev, [chatUserId]: memberProfiles }));
      setGroupCreatorById((prev) => ({ ...prev, [chatUserId]: updated.createdBy }));
      setServerGroupConversations((prev) =>
        prev.map((conversation) =>
          conversation.user.id === chatUserId
            ? {
                ...conversation,
                user: {
                  ...conversation.user,
                  name: updated.name,
                  avatar:
                    updated.avatarUrl?.trim() ||
                    conversation.user.avatar ||
                    `https://ui-avatars.com/api/?background=2563eb&color=ffffff&bold=true&name=${encodeURIComponent('Group')}`,
                },
              }
            : conversation,
        ),
      );
      setIsAddGroupMembersOpen(false);
      setSelectedAddGroupMemberIds([]);
      setAddGroupMemberSearch('');
      toast.success('Đã thêm thành viên vào nhóm.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể thêm thành viên.');
    } finally {
      setIsAddingGroupMembers(false);
    }
  }, [activeChatUserId, selectedAddGroupMemberIds]);

  const handleCreateGroupChat = useCallback(async () => {
    if (!currentUser?.id) return;
    if (selectedGroupMemberIds.length < 2) {
      toast.error('Nhóm chat cần tối thiểu 3 người (bao gồm bạn).');
      return;
    }

    const members = selectableFriends.filter((u) => selectedGroupMemberIds.includes(u.id));
    if (members.length < 2) {
      toast.error('Không thể tạo nhóm chat. Vui lòng chọn lại thành viên.');
      return;
    }

    const normalizedName = groupNameInput.trim();
    const generatedName = `Nhóm ${members.map((m) => m.name.split(' ').slice(-1)[0]).join(', ')}`;
    const groupName = normalizedName || generatedName;
    try {
      const created = await chatService.createGroupConversation({
        name: groupName,
        avatarUrl: `https://ui-avatars.com/api/?background=2563eb&color=ffffff&bold=true&name=${encodeURIComponent('Group')}`,
        memberIds: selectedGroupMemberIds,
      });

      const chatUserId = `group:${created.id}`;
      const conversation: Conversation = {
        id: created.id,
        user: {
          id: chatUserId,
          name: created.name,
          avatar:
            created.avatarUrl?.trim() ||
            `https://ui-avatars.com/api/?background=2563eb&color=ffffff&bold=true&name=${encodeURIComponent('Group')}`,
          isOnline: false,
        },
        lastMessage: 'Nhóm chat mới được tạo',
        timestamp: 'Vừa xong',
        isUnread: false,
        isGroup: true,
      };

      const memberProfiles: ChatUser[] = created.members.map((m) => ({
        id: m.userId,
        name: m.fullName || m.username || 'Người dùng',
        avatar:
          m.avatarUrl?.trim() ||
          `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(m.fullName || m.username || 'User')}`,
        isOnline: false,
      }));

      setServerGroupConversations((prev) => [conversation, ...prev.filter((item) => item.user.id !== chatUserId)]);
      setGroupMembersById((prev) => ({ ...prev, [chatUserId]: memberProfiles }));
      setGroupCreatorById((prev) => ({ ...prev, [chatUserId]: created.createdBy }));
      setMessagesByUser((prev) => ({ ...prev, [chatUserId]: [] }));
      setHistoryByUser((prev) => ({
        ...prev,
        [chatUserId]: {
          initialized: false,
          loadingInitial: false,
          loadingOlder: false,
          hasMore: true,
          nextBeforeCreatedAt: null,
        },
      }));

      setSearchParams({ with: chatUserId });
      setIsCreateGroupOpen(false);
      setGroupNameInput('');
      setSelectedGroupMemberIds([]);
      toast.success('Đã tạo nhóm chat.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tạo nhóm chat.');
    }
  }, [currentUser?.id, groupNameInput, selectedGroupMemberIds, selectableFriends, setSearchParams]);

  const handleStartVoiceCall = useCallback(() => {
    if (!activeChatUserId) return;
    if (activeChatUserId.startsWith('group:')) {
      const members = groupMembersById[activeChatUserId] ?? [];
      const memberIds = members.map((member) => member.id).filter((id) => id !== currentUser?.id);
      const callerMemberProfile = members.find((member) => member.id === currentUser?.id);
      const groupParticipants = uniqueByUserId([
        ...(currentUser?.id
          ? [
              {
                userId: currentUser.id,
                name: callerMemberProfile?.name || currentUser.fullName || currentUser.username || 'Bạn',
                avatar: callerMemberProfile?.avatar || currentUser.avatarUrl,
              },
            ]
          : []),
        ...members.map((member) => ({
          userId: member.id,
          name: member.name,
          avatar: member.avatar,
        })),
      ]);
      const conversationId = activeChatUserId.replace('group:', '');
      void chatService
        .createGroupCallSession(conversationId, 'audio')
        .then((session) =>
          voiceCall.startGroupCall(
            conversationId,
            memberIds,
            'audio',
            activeChatUser?.name,
            activeChatUser?.avatar,
            session.callId,
            groupParticipants,
          ),
        )
        .catch((error: any) => {
          toast.error(error?.message || 'Không thể bắt đầu cuộc gọi nhóm.');
        });
      return;
    }
    void voiceCall.startCall(activeChatUserId, 'audio', activeChatUser?.name, activeChatUser?.avatar);
  }, [activeChatUser?.avatar, activeChatUser?.name, activeChatUserId, currentUser, groupMembersById, voiceCall]);

  const handleStartVideoCall = useCallback(() => {
    if (!activeChatUserId) return;
    if (activeChatUserId.startsWith('group:')) {
      const members = groupMembersById[activeChatUserId] ?? [];
      const memberIds = members.map((member) => member.id).filter((id) => id !== currentUser?.id);
      const callerMemberProfile = members.find((member) => member.id === currentUser?.id);
      const groupParticipants = uniqueByUserId([
        ...(currentUser?.id
          ? [
              {
                userId: currentUser.id,
                name: callerMemberProfile?.name || currentUser.fullName || currentUser.username || 'Bạn',
                avatar: callerMemberProfile?.avatar || currentUser.avatarUrl,
              },
            ]
          : []),
        ...members.map((member) => ({
          userId: member.id,
          name: member.name,
          avatar: member.avatar,
        })),
      ]);
      const conversationId = activeChatUserId.replace('group:', '');
      void chatService
        .createGroupCallSession(conversationId, 'video')
        .then((session) =>
          voiceCall.startGroupCall(
            conversationId,
            memberIds,
            'video',
            activeChatUser?.name,
            activeChatUser?.avatar,
            session.callId,
            groupParticipants,
          ),
        )
        .catch((error: any) => {
          toast.error(error?.message || 'Không thể bắt đầu cuộc gọi nhóm.');
        });
      return;
    }
    void voiceCall.startCall(activeChatUserId, 'video', activeChatUser?.name, activeChatUser?.avatar);
  }, [activeChatUser?.avatar, activeChatUser?.name, activeChatUserId, currentUser, groupMembersById, voiceCall]);

  const handleCallAgain = useCallback(
    (mediaType: 'audio' | 'video' = 'audio') => {
      if (mediaType === 'video') {
        handleStartVideoCall();
      } else {
        handleStartVoiceCall();
      }
    },
    [handleStartVideoCall, handleStartVoiceCall],
  );

  const handleEndVoiceCall = useCallback(() => {
    voiceCall.endCall();
  }, [voiceCall]);

  const handleToggleMute = useCallback(() => {
    voiceCall.toggleMute();
  }, [voiceCall]);

  const handleReactMessage = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await chatService.updateMessageReaction(messageId, emoji || null);
      } catch {
        // keep old state when update fails
      }
    },
    [],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await chatService.deleteMessage(messageId);
      } catch {
        // keep old state when delete fails
      }
    },
    [],
  );

  const handleReportMessage = useCallback(async (messageId: string) => {
    try {
      await chatService.reportMessage(messageId, 'reported-from-messenger-ui');
      return true;
    } catch {
      return false;
    }
  }, []);

  const filters: { key: MessengerFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
  ];

  const filteredConversations = conversations
    .filter((conv) => {
      if (activeFilter === 'unread' && !conv.isUnread) return false;
      if (searchQuery && !conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aPinned = pinnedConversationSet.has(a.user.id);
      const bPinned = pinnedConversationSet.has(b.user.id);
      if (aPinned === bPinned) return 0;
      return aPinned ? -1 : 1;
    });

  const activeMessages = activeChatUserId ? (messagesByUser[activeChatUserId] ?? []) : [];
  const addableGroupMembers = useMemo(() => {
    if (!activeChatUserId || !isActiveGroupChat) return [];
    const existingIds = new Set((groupMembersById[activeChatUserId] ?? []).map((member) => member.id));
    const query = addGroupMemberSearch.trim().toLowerCase();
    return selectableFriends.filter((friend) => {
      if (existingIds.has(friend.id)) return false;
      if (!query) return true;
      return friend.name.toLowerCase().includes(query);
    });
  }, [activeChatUserId, addGroupMemberSearch, groupMembersById, isActiveGroupChat, selectableFriends]);
  const activePinnedMessages = useMemo(() => {
    if (!activeChatUserId) return [];
    return pinnedMessagesByConversation[activeChatUserId] ?? [];
  }, [activeChatUserId, pinnedMessagesByConversation]);
  const activeHistory = activeChatUserId ? historyByUser[activeChatUserId] : undefined;
  const loadingMessages = Boolean(activeChatUserId && activeHistory?.loadingInitial && activeMessages.length === 0);
  const loadingOlderMessages = Boolean(activeChatUserId && activeHistory?.loadingOlder);
  const hasOlderMessages = Boolean(activeChatUserId && activeHistory?.hasMore);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!activeChatUserId) return;
    await loadOlderHistory(activeChatUserId);
  }, [activeChatUserId, loadOlderHistory]);

  const openGroupSettingsModal = useCallback((mode: 'rename' | 'image' | 'theme' | 'nicknames') => {
    if (!activeChatUserId?.startsWith('group:') || !activeChatUser) return;
    setGroupSettingsModal(mode);
    if (mode === 'rename') {
      setGroupNameDraft(activeChatUser.name);
    }
    if (mode === 'image') {
      setGroupImageDraft(activeChatUser.avatar || '');
    }
    if (mode === 'theme') {
      setGroupThemeDraft(activeChatThemeColor || '#2563eb');
    }
    if (mode === 'nicknames') {
      setNicknameEditingUserId(null);
      setNicknameDraft('');
    }
  }, [activeChatThemeColor, activeChatUser, activeChatUserId]);

  const handleUpdateGroupConversation = useCallback(async (payload: { name?: string; avatarUrl?: string | null; themeColor?: string | null }) => {
    if (!activeChatUserId?.startsWith('group:')) return;
    const conversationId = activeChatUserId.replace('group:', '');
    setIsSavingGroupSettings(true);
    try {
      const updated = await chatService.updateGroupConversation(conversationId, payload);
      applyGroupConversationResponse(updated);
      setGroupSettingsModal(null);
    } catch {
      toast.error('Không thể cập nhật đoạn chat.');
    } finally {
      setIsSavingGroupSettings(false);
    }
  }, [activeChatUserId, applyGroupConversationResponse]);

  const handleSaveNickname = useCallback(async (memberUserId: string, nickname: string) => {
    if (!activeChatUserId?.startsWith('group:')) return;
    const conversationId = activeChatUserId.replace('group:', '');
    setIsSavingGroupSettings(true);
    try {
      const updated = await chatService.updateGroupMemberNickname(conversationId, memberUserId, nickname.trim() || null);
      applyGroupConversationResponse(updated);
      setNicknameEditingUserId(null);
      setNicknameDraft('');
    } catch {
      toast.error('Không thể cập nhật biệt danh.');
    } finally {
      setIsSavingGroupSettings(false);
    }
  }, [activeChatUserId, applyGroupConversationResponse]);

  const activeWindowCallStatus = useMemo<
    'idle' | 'calling' | 'ringing' | 'connecting' | 'in_call' | 'ended' | 'error'
  >(() => {
    if (!activeChatUserId) return 'idle';
    if (voiceCall.activePeerUserId === activeChatUserId) return voiceCall.status;
    if (
      activeChatUserId.startsWith('group:') &&
      (voiceCall.activeGroupConversationId === activeChatUserId.replace('group:', '') ||
        (voiceCall.incomingGroupConversationId === activeChatUserId.replace('group:', '') && voiceCall.isRinging))
    ) {
      return voiceCall.status;
    }
    if (voiceCall.incomingPeerUserId === activeChatUserId && voiceCall.isRinging) return 'ringing';
    return 'idle';
  }, [
    activeChatUserId,
    voiceCall.activeGroupConversationId,
    voiceCall.activePeerUserId,
    voiceCall.incomingGroupConversationId,
    voiceCall.incomingPeerUserId,
    voiceCall.isRinging,
    voiceCall.status,
  ]);

  return (
    <div
      className="h-screen bg-gray-100 overflow-hidden"
      style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      <Header />


      <div className="flex h-[calc(100vh-56px)] mt-14 overflow-hidden p-2 gap-2">
        <div
          className={`bg-white border border-gray-200 rounded-xl flex flex-col transition-all duration-300 ease-in-out ${
            activeChatUser ? 'w-0 -translate-x-full lg:w-[380px] lg:translate-x-0' : 'w-[380px]'
          }`}
        >
          <div className="flex flex-col h-full min-w-[380px]">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-[1.75rem] font-semibold tracking-tight">Đoạn chat</h1>
                  <span
                    className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
                    title={connected ? 'Đã kết nối realtime' : 'Chưa kết nối'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadFriends}
                    disabled={loadingConversations}
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Tải lại danh sách"
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingConversations ? 'animate-spin' : ''}`} />
                  </button>
                  <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Tạo nhóm chat"
                  >
                    <UserRoundPlus className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm trên Messenger"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:bg-gray-200 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeFilter === filter.key
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingConversations ? (
                <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
              ) : friendsError ? (
                <div className="text-center py-8 text-sm">
                  <p className="text-red-500 mb-2">Không thể tải danh sách bạn bè</p>
                  <button onClick={loadFriends} className="text-blue-500 hover:underline text-sm">
                    Thử lại
                  </button>
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isPinned={pinnedConversationSet.has(conversation.user.id)}
                    onTogglePin={handleTogglePinConversation}
                    onClick={() => handleConversationClick(conversation)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {conversations.length === 0
                    ? 'Chưa có bạn bè nào. Kết bạn để bắt đầu chat.'
                    : 'Không tìm thấy cuộc trò chuyện'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 min-w-0 flex gap-2 relative">
          {activeChatUser ? (
            <div className="flex-1 min-h-0 min-w-0 relative">
              <ChatWindow
                user={activeChatUser}
                messages={activeMessages}
                loading={loadingMessages}
                loadingOlder={loadingOlderMessages}
                hasOlder={hasOlderMessages}
                connected={connected}
                onSendMessage={handleSendMessage}
                onLoadOlder={handleLoadOlderMessages}
                onReactMessage={handleReactMessage}
                onDeleteMessage={handleDeleteMessage}
                onReportMessage={handleReportMessage}
                onForwardMessage={handleOpenForwardModal}
                onPinMessage={handlePinMessage}
                pinnedMessages={activePinnedMessages}
                onUnpinPinnedMessage={handleUnpinPinnedMessage}
                currentUserId={currentUser?.id}
                openPinnedMessagesSignal={openPinnedMessagesSignal}
                onClose={handleBackToList}
                onMinimize={handleBackToList}
                fullScreen
                callStatus={activeWindowCallStatus}
                callMediaType={voiceCall.callMediaType}
                isMuted={voiceCall.isMuted}
                canStartVoiceCall={
                  !voiceCall.hasActiveCall && !voiceCall.isRinging
                    ? true
                    : voiceCall.activePeerUserId === activeChatUser.id ||
                      (isActiveGroupChat &&
                        voiceCall.activeGroupConversationId === activeChatUser.id.replace('group:', ''))
                }
                canStartVideoCall={!voiceCall.hasActiveCall && !voiceCall.isRinging}
                onStartVoiceCall={handleStartVoiceCall}
                onStartVideoCall={handleStartVideoCall}
                onEndVoiceCall={handleEndVoiceCall}
                onToggleMute={handleToggleMute}
                onCallAgain={handleCallAgain}
                isGroupChat={isActiveGroupChat}
                isGroupCreator={isActiveGroupCreator}
                groupCreatorName={activeGroupCreatorName}
                groupMembers={activeChatUserId ? groupMembersById[activeChatUserId] ?? [] : []}
                themeColor={activeChatThemeColor}
              />
            </div>
          ) : activeChatUserId && loadingConversations ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
              Đang tải...
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200">
              <div className="text-center px-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Tin nhắn của bạn</h2>
                <p className="text-gray-500 text-sm">Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
              </div>
            </div>
          )}

          {activeChatUser && (
            <ChatInfoPanel
              user={activeChatUser}
              messages={activeMessages}
              isGroupChat={isActiveGroupChat}
              groupMembers={activeChatUserId ? groupMembersById[activeChatUserId] ?? [] : []}
              groupCreatorId={activeChatUserId ? groupCreatorById[activeChatUserId] : undefined}
              currentUserId={currentUser?.id}
              onOpenAddMembers={openAddGroupMembersModal}
              onOpenPinnedMessages={() => setOpenPinnedMessagesSignal((value) => value + 1)}
              onOpenRenameGroup={() => openGroupSettingsModal('rename')}
              onOpenChangeGroupImage={() => openGroupSettingsModal('image')}
              onOpenChangeTheme={() => openGroupSettingsModal('theme')}
              onOpenNicknames={() => openGroupSettingsModal('nicknames')}
            />
          )}
        </div>
      </div>

      {groupSettingsModal && activeChatUserId?.startsWith('group:') && activeChatUser && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/35 p-4">
          <div className="flex max-h-[86vh] w-full max-w-[660px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="relative flex shrink-0 items-center justify-center border-b border-gray-200 px-5 py-4">
              <h3 className="text-[24px] font-bold text-gray-900">
                {groupSettingsModal === 'rename'
                  ? 'Đổi tên đoạn chat'
                  : groupSettingsModal === 'image'
                    ? 'Thay đổi ảnh'
                    : groupSettingsModal === 'theme'
                      ? 'Đổi chủ đề'
                      : 'Biệt danh'}
              </h3>
              <button
                type="button"
                onClick={() => setGroupSettingsModal(null)}
                disabled={isSavingGroupSettings}
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-60"
                title="Đóng"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            {groupSettingsModal === 'rename' && (
              <div className="space-y-4 p-5">
                <input
                  value={groupNameDraft}
                  onChange={(event) => setGroupNameDraft(event.target.value)}
                  className="h-12 w-full rounded-full bg-gray-100 px-4 text-[16px] outline-none focus:bg-gray-200"
                  placeholder="Tên đoạn chat"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleUpdateGroupConversation({ name: groupNameDraft })}
                  disabled={isSavingGroupSettings || !groupNameDraft.trim()}
                  className="h-11 w-full rounded-lg bg-blue-600 text-[16px] font-semibold text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  Lưu
                </button>
              </div>
            )}

            {groupSettingsModal === 'image' && (
              <div className="space-y-4 p-5">
                <div className="flex justify-center">
                  <img
                    src={groupImageDraft || activeChatUser.avatar}
                    alt={activeChatUser.name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                </div>
                <input
                  value={groupImageDraft}
                  onChange={(event) => setGroupImageDraft(event.target.value)}
                  className="h-12 w-full rounded-full bg-gray-100 px-4 text-[16px] outline-none focus:bg-gray-200"
                  placeholder="Dán URL ảnh nhóm"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateGroupConversation({ avatarUrl: groupImageDraft.trim() || null })}
                  disabled={isSavingGroupSettings}
                  className="h-11 w-full rounded-lg bg-blue-600 text-[16px] font-semibold text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  Lưu
                </button>
              </div>
            )}

            {groupSettingsModal === 'theme' && (
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-5 gap-3">
                  {['#2563eb', '#7c3aed', '#db2777', '#16a34a', '#f97316', '#0891b2', '#111827', '#dc2626', '#4f46e5', '#0f766e'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setGroupThemeDraft(color)}
                      className={`h-11 rounded-full border-2 ${groupThemeDraft === color ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateGroupConversation({ themeColor: groupThemeDraft })}
                  disabled={isSavingGroupSettings}
                  className="h-11 w-full rounded-lg bg-blue-600 text-[16px] font-semibold text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  Lưu
                </button>
              </div>
            )}

            {groupSettingsModal === 'nicknames' && (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="space-y-4">
                  {(activeChatUserId ? groupMembersById[activeChatUserId] ?? [] : []).map((member) => {
                    const editing = nicknameEditingUserId === member.id;
                    const realName = member.fullName || member.name;
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        <img
                          src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=random`}
                          alt={realName}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        {editing ? (
                          <>
                            <input
                              value={nicknameDraft}
                              onChange={(event) => setNicknameDraft(event.target.value)}
                              className="h-11 min-w-0 flex-1 rounded-full bg-gray-100 px-4 text-[16px] outline-none focus:bg-gray-200"
                              placeholder={realName}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveNickname(member.id, nicknameDraft)}
                              disabled={isSavingGroupSettings}
                              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100 disabled:opacity-60"
                              title="Lưu biệt danh"
                            >
                              <Check className="h-6 w-6" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setNicknameEditingUserId(member.id);
                                setNicknameDraft(member.nickname || '');
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="truncate text-[16px] font-semibold text-gray-900">{realName}</p>
                              <p className="truncate text-sm text-gray-600">{member.nickname || 'Đặt biệt danh'}</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNicknameEditingUserId(member.id);
                                setNicknameDraft(member.nickname || '');
                              }}
                              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100"
                              title="Sửa biệt danh"
                            >
                              <Pencil className="h-5 w-5 fill-gray-900" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[18px] font-semibold text-gray-900">Tạo nhóm chat</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateGroupOpen(false);
                  setGroupNameInput('');
                  setSelectedGroupMemberIds([]);
                }}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên nhóm (tùy chọn)</label>
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="Ví dụ: Nhóm dự án KLTN"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Chọn thành viên</p>
                <div className="max-h-[280px] overflow-y-auto rounded-lg border border-gray-200 p-2">
                  {selectableFriends.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">Chưa có bạn bè để tạo nhóm chat</div>
                  ) : (
                    <div className="space-y-1">
                      {selectableFriends.map((friend) => {
                        const selected = selectedGroupMemberIds.includes(friend.id);
                        return (
                          <button
                            key={friend.id}
                            onClick={() => toggleGroupMemberSelection(friend.id)}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
                          >
                            <img src={friend.avatar} alt={friend.name} className="h-9 w-9 rounded-full object-cover" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{friend.name}</span>
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-transparent'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                onClick={() => {
                  setIsCreateGroupOpen(false);
                  setGroupNameInput('');
                  setSelectedGroupMemberIds([]);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroupChat}
                disabled={selectedGroupMemberIds.length < 2}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddGroupMembersOpen && activeChatUserId?.startsWith('group:') && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35 p-4">
          <div className="flex max-h-[86vh] w-full max-w-[660px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="relative flex shrink-0 items-center justify-center border-b border-gray-200 px-5 py-4">
              <h3 className="text-[24px] font-bold text-gray-900">Thêm người</h3>
              <button
                onClick={closeAddGroupMembersModal}
                disabled={isAddingGroupMembers}
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300 disabled:opacity-60"
                title="Đóng"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="shrink-0 px-5 pb-4 pt-5">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={addGroupMemberSearch}
                  onChange={(e) => setAddGroupMemberSearch(e.target.value)}
                  placeholder="Tìm kiếm"
                  className="h-11 w-full rounded-full bg-gray-100 pl-11 pr-4 text-[16px] outline-none transition-colors focus:bg-gray-200"
                />
              </div>

              <div className="mt-7 min-h-[112px] text-sm text-gray-500">
                {selectedAddGroupMemberIds.length === 0 ? (
                  <div className="pt-6 text-center">Chưa chọn người dùng nào</div>
                ) : (
                  <div className="flex flex-wrap items-start justify-start gap-4 px-2">
                    {selectedAddGroupMemberIds.map((id) => {
                      const friend = selectableFriends.find((item) => item.id === id);
                      if (!friend) return null;
                      return (
                        <div
                          key={id}
                          className="flex w-[72px] flex-col items-center gap-2 text-center"
                        >
                          <div className="relative">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="h-12 w-12 rounded-full border-2 border-blue-600 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => toggleAddGroupMemberSelection(id)}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow-sm hover:bg-gray-300"
                              title="Bỏ chọn"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="line-clamp-2 w-full text-sm leading-tight text-gray-500">{friend.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              <h4 className="mb-3 text-[24px] font-bold text-gray-900">Gợi ý</h4>
              {addableGroupMembers.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  Không có bạn bè phù hợp để thêm
                </div>
              ) : (
                <div className="space-y-1">
                  {addableGroupMembers.map((friend) => {
                    const selected = selectedAddGroupMemberIds.includes(friend.id);
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => toggleAddGroupMemberSelection(friend.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors ${
                          selected ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <img src={friend.avatar} alt={friend.name} className="h-10 w-10 rounded-full object-cover" />
                        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-gray-900">
                          {friend.name}
                        </span>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-500 bg-white text-transparent'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-gray-100 px-5 py-4">
              <button
                onClick={handleAddGroupMembers}
                disabled={selectedAddGroupMemberIds.length === 0 || isAddingGroupMembers}
                className="h-11 w-full rounded-lg bg-blue-600 text-[16px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                {isAddingGroupMembers ? 'Đang thêm...' : 'Thêm người'}
              </button>
            </div>
          </div>
        </div>
      )}

      {forwardMessage && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-[18px] font-semibold text-gray-900">Chuyển tiếp tin nhắn</h3>
              <button
                onClick={() => {
                  setForwardMessage(null);
                  setSelectedForwardTargetIds([]);
                }}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Chọn cuộc trò chuyện</p>
              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-gray-200 p-2">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">Chưa có cuộc trò chuyện để chuyển tiếp</div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => {
                      const targetId = conversation.user.id;
                      const selected = selectedForwardTargetIds.includes(targetId);
                      return (
                        <button
                          key={`forward-${targetId}`}
                          onClick={() => toggleForwardTargetSelection(targetId)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
                        >
                          <img src={conversation.user.avatar} alt={conversation.user.name} className="h-9 w-9 rounded-full object-cover" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                            {conversation.user.name}
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded border ${
                              selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-transparent'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                onClick={() => {
                  setForwardMessage(null);
                  setSelectedForwardTargetIds([]);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitForward}
                disabled={selectedForwardTargetIds.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Chuyển tiếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
