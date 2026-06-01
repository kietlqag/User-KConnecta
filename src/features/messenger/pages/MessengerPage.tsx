import { useState, useCallback, useEffect, useMemo, useRef, type ChangeEvent, type ReactNode } from 'react';
import axios from 'axios';
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
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Video,
  Pin,
  Pencil,
  ImagePlus,
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
import { usePublicPolicies } from '@/hooks/usePublicPolicies';
import { validateChatAgainstPolicy } from '@/utils/policyValidation';

const CALL_LOG_PREFIX = '__CALL_LOG__:';
const REPLY_PREFIX = '__REPLY__:';
const VOICE_MESSAGE_PREFIX = '__VOICE__:';
const IMAGE_MESSAGE_PREFIX = '__IMAGE__:';
const FILE_MESSAGE_PREFIX = '__FILE__:';
const VIDEO_SHARE_PREFIX = '__VIDEO_SHARE__:';
const POST_SHARE_PREFIX = '__POST_SHARE__:';
const CHAT_ACTION_PREFIX = '__CHAT_ACTION__:';
const STORY_REPLY_PREFIX = '__STORY_REPLY__:';
const HISTORY_PAGE_SIZE = 15;
const GROUP_AVATAR_CROP_SIZE = 180;
const GROUP_AVATAR_EXPORT_SIZE = 512;

function uniqueByUserId<T extends { userId: string }>(items: T[]) {
  const byId = new Map<string, T>();
  items.forEach((item) => {
    if (item.userId && !byId.has(item.userId)) {
      byId.set(item.userId, item);
    }
  });
  return Array.from(byId.values());
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Cannot load image'));
    image.src = src;
  });
}

async function renderCroppedAvatarDataUrl(
  imageSrc: string,
  zoom: number,
  offsetX: number,
  offsetY: number,
): Promise<string> {
  const image = await loadImageElement(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = GROUP_AVATAR_EXPORT_SIZE;
  canvas.height = GROUP_AVATAR_EXPORT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas not supported');
  }

  const baseScale = Math.max(
    GROUP_AVATAR_EXPORT_SIZE / image.width,
    GROUP_AVATAR_EXPORT_SIZE / image.height,
  );
  const scale = baseScale * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const translateScale = GROUP_AVATAR_EXPORT_SIZE * 0.35;
  const drawX = (GROUP_AVATAR_EXPORT_SIZE - drawWidth) / 2 + (offsetX / 100) * translateScale;
  const drawY = (GROUP_AVATAR_EXPORT_SIZE - drawHeight) / 2 + (offsetY / 100) * translateScale;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  return canvas.toDataURL('image/jpeg', 0.92);
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    throw new Error('Invalid data URL');
  }
  const mimeMatch = parts[0].match(/data:([^;]+);base64/i);
  const mimeType = mimeMatch?.[1] || 'image/jpeg';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mimeType });
}

function mapBackendContentToMessageFields(
  content: string,
): Pick<Message, 'text' | 'replyPreview' | 'replyToMessageId' | 'voiceAudioUrl' | 'voiceDurationSec' | 'voiceMimeType' | 'fileUrl' | 'fileName' | 'fileMimeType' | 'fileSizeBytes' | 'imageUrl' | 'imageUrls' | 'imageMimeType' | 'imageCaption' | 'systemType' | 'systemActionType' | 'systemActionActorName' | 'systemActionTargetName' | 'systemActionValue' | 'callLogKind' | 'callDurationSec' | 'callMediaType' | 'storyReplyAuthorId' | 'storyReplyAuthorName' | 'storyReplyAuthorAvatarUrl' | 'storyReplySlideImageUrl' | 'storyReplySlideBackgroundColor' | 'sharedPostId' | 'sharedPostContent' | 'sharedPostImage'> {
  if (!content?.startsWith(CALL_LOG_PREFIX)) {
    if (content?.startsWith(CHAT_ACTION_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(CHAT_ACTION_PREFIX.length));
        const actionType =
          typeof payload?.type === 'string' ? (payload.type as Message['systemActionType']) : undefined;
        const actorName = typeof payload?.actorName === 'string' ? payload.actorName : undefined;
        const targetName = typeof payload?.targetName === 'string' ? payload.targetName : undefined;
        const value = typeof payload?.value === 'string' ? payload.value : undefined;
        return {
          text: actorName || 'Người dùng',
          systemType: 'chat_action',
          systemActionType: actionType,
          systemActionActorName: actorName,
          systemActionTargetName: targetName,
          systemActionValue: value,
        };
      } catch {
        return { text: content };
      }
    }
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
    if (content?.startsWith(STORY_REPLY_PREFIX) || content?.includes('STORY_REPLY')) {
      try {
        const rawPayload = content.includes(':') ? content.slice(content.indexOf(':') + 1) : '';
        const payload = rawPayload ? JSON.parse(rawPayload) : null;
        const text = typeof payload?.text === 'string' && payload.text.trim() ? payload.text.trim() : 'Đã trả lời tin';
        return {
          text,
          storyReplyAuthorId: typeof payload?.authorId === 'string' ? payload.authorId : undefined,
          storyReplyAuthorName: typeof payload?.authorName === 'string' ? payload.authorName : undefined,
          storyReplyAuthorAvatarUrl: typeof payload?.authorAvatarUrl === 'string' ? payload.authorAvatarUrl : undefined,
          storyReplySlideImageUrl:
            typeof payload?.slideImageUrl === 'string' ? payload.slideImageUrl : null,
          storyReplySlideBackgroundColor:
            typeof payload?.slideBackgroundColor === 'string' ? payload.slideBackgroundColor : null,
        };
      } catch {
        return { text: 'Đã trả lời tin' };
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
          videoShareAuthorId: payload.authorId,
        };
      } catch {
        return { text: 'Video' };
      }
    }
    if (content?.startsWith(POST_SHARE_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(POST_SHARE_PREFIX.length));
        return {
          text: 'Đã chia sẻ một bài viết',
          sharedPostId: typeof payload?.id === 'string' ? payload.id : undefined,
          sharedPostContent: typeof payload?.content === 'string' ? payload.content : undefined,
          sharedPostImage: typeof payload?.image === 'string' ? payload.image : undefined,
        };
      } catch {
        return { text: 'Đã chia sẻ một bài viết' };
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

function parseBackendDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
  const hasOffset = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(normalized);
  const date = new Date(hasOffset ? normalized : `${normalized}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeConversationTime(dateInput?: Date | string | null) {
  if (!dateInput) return '';
  const date = parseBackendDate(dateInput);
  if (!date) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày`;
}

function resolveDeliveryStatus(delivered?: boolean, seen?: boolean): Message['deliveryStatus'] {
  if (seen) return 'SEEN';
  if (delivered) return 'DELIVERED';
  return 'SENT';
}

function mapIncomingToMessage(raw: IncomingChatMessage, currentUserId?: string | null): Message {
  const parsedTimestamp = parseBackendDate(raw.createdAt) ?? new Date();
  return {
    ...mapBackendContentToMessageFields(raw.content),
    id: raw.id,
    senderId: raw.senderId,
    timestamp: parsedTimestamp,
    isOwn: raw.senderId === currentUserId,
    deliveryStatus: resolveDeliveryStatus(raw.delivered, raw.seen),
    seenAt: raw.seenAt,
    deleted: raw.deleted,
    deletedAt: raw.deletedAt,
    reactions: raw.reactions ?? [],
  };
}

function getLatestMessage(messages: Message[]) {
  let latest: Message | null = null;
  let latestAt = -Infinity;
  for (const message of messages) {
    const at = message.timestamp?.getTime?.() ?? -Infinity;
    if (at > latestAt) {
      latestAt = at;
      latest = message;
    }
  }
  return latest;
}

function getLatestVisibleMessage(messages: Message[]) {
  let latest: Message | null = null;
  let latestAt = -Infinity;
  for (const message of messages) {
    if (message.systemType === 'chat_action') continue;
    const at = message.timestamp?.getTime?.() ?? -Infinity;
    if (at > latestAt) {
      latestAt = at;
      latest = message;
    }
  }
  return latest;
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
const INFO_PANEL_PAGE_SIZE = 10;

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

function formatCalendarDateTitle(dateValue?: string | Date | null) {
  const parsed = parseBackendDate(dateValue);
  if (!parsed) return 'Không rõ ngày';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.getMonth() + 1;
  const year = parsed.getFullYear();
  return `Ngày ${day} Tháng ${month} Năm ${year}`;
}

function getCalendarDateKey(dateValue?: string | Date | null) {
  const parsed = parseBackendDate(dateValue);
  if (!parsed) return 'unknown-date';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function groupItemsByCalendarDate<T extends { createdAt?: string | null }>(items: T[]) {
  const grouped = new Map<string, { key: string; title: string; sortAt: number; items: T[] }>();
  items.forEach((item) => {
    const key = getCalendarDateKey(item.createdAt);
    const parsed = parseBackendDate(item.createdAt);
    const sortAt = parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime() : 0;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        title: formatCalendarDateTitle(item.createdAt),
        sortAt,
        items: [],
      });
    }
    grouped.get(key)!.items.push(item);
  });
  return Array.from(grouped.values())
    .sort((a, b) => b.sortAt - a.sortAt)
    .map((group) => ({ ...group, items: group.items }));
}

const HIDDEN_LINK_HOSTS = new Set([
  'res.cloudinary.com',
  'cloudinary.com',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  's3.amazonaws.com',
  'amazonaws.com',
]);

function shouldHideLinkHost(host: string) {
  const normalized = host.toLowerCase();
  if (HIDDEN_LINK_HOSTS.has(normalized)) return true;
  for (const blocked of HIDDEN_LINK_HOSTS) {
    if (normalized.endsWith(`.${blocked}`)) return true;
  }
  return false;
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
  onOpenNicknames,
  onForwardMedia,
  onJumpToMessage,
  onLoadMoreHistory,
  hasMoreHistory = false,
  isLoadingMoreHistory = false,
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
  onOpenNicknames?: () => void;
  onForwardMedia?: (message: Message) => void;
  onJumpToMessage?: (messageId: string) => void;
  onLoadMoreHistory?: () => Promise<void> | void;
  hasMoreHistory?: boolean;
  isLoadingMoreHistory?: boolean;
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
  const [mediaLightboxIndex, setMediaLightboxIndex] = useState<number | null>(null);
  const [mediaActionMenuId, setMediaActionMenuId] = useState<string | null>(null);
  const [mediaActionMenuPosition, setMediaActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [assetItemsByTab, setAssetItemsByTab] = useState<Record<InfoPanelTab, Array<{ id: string; url: string; type?: string; label?: string; meta?: string; createdAt?: string | null }>>>({
    media: [],
    files: [],
    links: [],
  });
  const [assetCursorByTab, setAssetCursorByTab] = useState<Record<InfoPanelTab, string | null>>({
    media: null,
    files: null,
    links: null,
  });
  const [assetHasMoreByTab, setAssetHasMoreByTab] = useState<Record<InfoPanelTab, boolean>>({
    media: true,
    files: true,
    links: true,
  });
  const [assetLoadingByTab, setAssetLoadingByTab] = useState<Record<InfoPanelTab, boolean>>({
    media: false,
    files: false,
    links: false,
  });
  const messagesRef = useRef<Message[]>(messages);
  const hasMoreHistoryRef = useRef<boolean>(hasMoreHistory);
  const isLoadingMoreHistoryRef = useRef<boolean>(isLoadingMoreHistory);

  useEffect(() => {
    setVisibleLimits({
      media: INFO_PANEL_PAGE_SIZE,
      files: INFO_PANEL_PAGE_SIZE,
      links: INFO_PANEL_PAGE_SIZE,
    });
    setAssetItemsByTab({ media: [], files: [], links: [] });
    setAssetCursorByTab({ media: null, files: null, links: null });
    setAssetHasMoreByTab({ media: true, files: true, links: true });
    setAssetLoadingByTab({ media: false, files: false, links: false });
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
      assetItemsByTab.media.map((item) => ({
        id: item.id,
        url: item.url,
        type: item.type === 'video' ? 'video' : 'image',
        createdAt: item.createdAt,
      })),
    [assetItemsByTab.media],
  );
  const fileItems = useMemo(
    () =>
      assetItemsByTab.files.map((item) => ({
        id: item.id,
        url: item.url,
        label: item.label || 'File',
        meta: item.meta || 'File',
        createdAt: item.createdAt,
      })),
    [assetItemsByTab.files],
  );
  const linkItems = useMemo(
    () =>
      assetItemsByTab.links
        .map((item) => {
          try {
            const parsed = new URL(item.url);
            const host = parsed.hostname.replace(/^www\./, '');
            return {
              id: item.id,
              url: item.url,
              host,
              createdAt: item.createdAt,
              hidden: shouldHideLinkHost(host),
            };
          } catch {
            return {
              id: item.id,
              url: item.url,
              host: item.url,
              createdAt: item.createdAt,
              hidden: false,
            };
          }
        })
        .filter((item) => !item.hidden),
    [assetItemsByTab.links],
  );

  const visibleMediaItems = mediaItems.slice(0, visibleLimits.media);
  const visibleFileItems = fileItems.slice(0, visibleLimits.files);
  const visibleLinkItems = linkItems.slice(0, visibleLimits.links);

  useEffect(() => {
    if (mediaLightboxIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMediaLightboxIndex(null);
      if (event.key === 'ArrowLeft') {
        setMediaLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + mediaItems.length) % mediaItems.length,
        );
      }
      if (event.key === 'ArrowRight') {
        setMediaLightboxIndex((prev) => (prev === null ? null : (prev + 1) % mediaItems.length));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mediaItems.length, mediaLightboxIndex]);

  const activeLightboxMedia = mediaLightboxIndex === null ? null : mediaItems[mediaLightboxIndex];

  useEffect(() => {
    if (!mediaActionMenuId) return;
    const close = () => setMediaActionMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [mediaActionMenuId]);

  useEffect(() => {
    if (!mediaActionMenuId) {
      setMediaActionMenuPosition(null);
    }
  }, [mediaActionMenuId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    hasMoreHistoryRef.current = hasMoreHistory;
  }, [hasMoreHistory]);

  useEffect(() => {
    isLoadingMoreHistoryRef.current = isLoadingMoreHistory;
  }, [isLoadingMoreHistory]);

  const downloadMedia = useCallback((url: string, suggestedName?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName || 'media';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const copyText = useCallback(async (value: string, successText = 'Đã sao chép.') => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successText);
    } catch {
      toast.error('Không thể sao chép.');
    }
  }, []);

  const copyImageToClipboard = useCallback(async (url: string) => {
    try {
      const response = await axios.get<Blob>(url, { responseType: 'blob' });
      const blob = response.data;
      if (!blob.type.startsWith('image/')) {
        toast.error('Nội dung này không phải ảnh để copy.');
        return;
      }
      if (!('ClipboardItem' in window) || !navigator.clipboard?.write) {
        toast.error('Trình duyệt không hỗ trợ copy ảnh trực tiếp.');
        return;
      }
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      toast.success('Đã copy ảnh.');
    } catch {
      toast.error('Không thể copy ảnh.');
    }
  }, []);

  const parseMessageIdFromAssetId = useCallback((assetId: string) => {
    const match = assetId.match(/^([0-9a-fA-F-]{36})-(?:image|file|link)-\d+$/);
    return match?.[1] || null;
  }, []);

  const findMessageIdByMedia = useCallback((assetId: string, assetUrl: string) => {
    const fromAssetId = parseMessageIdFromAssetId(assetId);
    if (fromAssetId) return fromAssetId;
    const normalizedUrl = assetUrl.trim();
    const target = messagesRef.current.find((message) => {
      const urls = message.imageUrls && message.imageUrls.length > 0
        ? message.imageUrls
        : message.imageUrl
          ? [message.imageUrl]
          : [];
      return urls.some((url) => (url || '').trim() === normalizedUrl);
    });
    return target?.id || null;
  }, [parseMessageIdFromAssetId]);

  const jumpToOriginalMessage = useCallback(async (assetId: string, assetUrl: string) => {
    const findAndScroll = () => {
      const messageId = findMessageIdByMedia(assetId, assetUrl);
      if (!messageId) return false;
      if (onJumpToMessage) {
        onJumpToMessage(messageId);
        return true;
      }
      const target = document.getElementById(`chat-message-${messageId}`);
      if (!target) return false;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    };

    if (findAndScroll()) {
      return;
    }

    if (!onLoadMoreHistory) {
      toast.info('Không tìm thấy tin nhắn gốc trong lịch sử hiện tại.');
      return;
    }

    for (let i = 0; i < 8; i += 1) {
      if (!hasMoreHistoryRef.current || isLoadingMoreHistoryRef.current) break;
      await Promise.resolve(onLoadMoreHistory());
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      if (findAndScroll()) {
        return;
      }
    }

    toast.info('Không tìm thấy tin nhắn gốc.');
  }, [findMessageIdByMedia, onJumpToMessage, onLoadMoreHistory]);

  useEffect(() => {
    const latest = messages[messages.length - 1];
    if (!latest || latest.deleted) return;

    const createdAt = latest.timestamp instanceof Date ? latest.timestamp.toISOString() : null;
    const imageUrls = latest.imageUrls && latest.imageUrls.length > 0
      ? latest.imageUrls
      : latest.imageUrl
        ? [latest.imageUrl]
        : [];
    const textLinks = extractLinksFromText(latest.text);

    setAssetItemsByTab((prev) => {
      let changed = false;
      const next = {
        media: [...prev.media],
        files: [...prev.files],
        links: [...prev.links],
      };

      imageUrls.forEach((url, index) => {
        const trimmed = url?.trim();
        if (!trimmed) return;
        if (next.media.some((item) => item.url === trimmed)) return;
        next.media.unshift({
          id: `local-media-${latest.id}-${index}`,
          url: trimmed,
          type: 'image',
          createdAt,
        });
        changed = true;
      });

      if (latest.fileUrl?.trim()) {
        const fileUrl = latest.fileUrl.trim();
        if (!next.files.some((item) => item.url === fileUrl)) {
          next.files.unshift({
            id: `local-file-${latest.id}`,
            url: fileUrl,
            type: 'file',
            label: latest.fileName || 'File',
            createdAt,
          });
          changed = true;
        }
      }

      textLinks.forEach((url, index) => {
        const trimmed = url.trim();
        if (!trimmed) return;
        try {
          const host = new URL(trimmed).hostname.replace(/^www\./, '');
          if (shouldHideLinkHost(host)) return;
        } catch {
          return;
        }
        if (next.links.some((item) => item.url === trimmed)) return;
        next.links.unshift({
          id: `local-link-${latest.id}-${index}`,
          url: trimmed,
          type: 'link',
          createdAt,
        });
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [messages]);

  const loadAssetsForTab = useCallback(
    async (tab: InfoPanelTab) => {
      if (assetLoadingByTab[tab]) return;
      if (!assetHasMoreByTab[tab] && assetItemsByTab[tab].length > 0) return;
      setAssetLoadingByTab((prev) => ({ ...prev, [tab]: true }));
      try {
        const type = tab === 'media' ? 'media' : tab === 'files' ? 'files' : 'links';
        const beforeCreatedAt = assetCursorByTab[tab] || undefined;
        const response = user.id.startsWith('group:')
          ? await chatService.getGroupAssets(user.id.replace('group:', ''), type, { beforeCreatedAt, limit: INFO_PANEL_PAGE_SIZE })
          : await chatService.getPrivateAssets(user.id, type, { beforeCreatedAt, limit: INFO_PANEL_PAGE_SIZE });
        const mapped = (response.items || []).map((item) => ({
          id: item.id,
          url: item.url,
          type: item.type,
          label: item.label || undefined,
          meta: item.meta || undefined,
          createdAt: item.createdAt || null,
        }));
        setAssetItemsByTab((prev) => ({ ...prev, [tab]: beforeCreatedAt ? [...prev[tab], ...mapped] : mapped }));
        setAssetCursorByTab((prev) => ({ ...prev, [tab]: response.nextBeforeCreatedAt || null }));
        setAssetHasMoreByTab((prev) => ({ ...prev, [tab]: Boolean(response.hasMore) }));
      } finally {
        setAssetLoadingByTab((prev) => ({ ...prev, [tab]: false }));
      }
    },
    [assetCursorByTab, assetHasMoreByTab, assetItemsByTab, assetLoadingByTab, user.id],
  );

  useEffect(() => {
    if (assetItemsByTab[activeTab].length === 0 && !assetLoadingByTab[activeTab]) {
      void loadAssetsForTab(activeTab);
    }
  }, [activeTab, assetItemsByTab, assetLoadingByTab, loadAssetsForTab]);

  const renderSeeMoreButton = (tab: InfoPanelTab, total: number) => {
    const visibleCount = visibleLimits[tab];
    const remainingCount = total - visibleCount;
    const hasMore = assetHasMoreByTab[tab];
    const isLoading = assetLoadingByTab[tab];
    if (remainingCount <= 0 && !hasMore) return null;
    return (
      <button
        type="button"
        disabled={isLoading}
        onClick={async () => {
          setVisibleLimits((prev) => ({
            ...prev,
            [tab]: prev[tab] + INFO_PANEL_PAGE_SIZE,
          }));
          if (remainingCount <= 0 && hasMore) {
            await loadAssetsForTab(tab);
          }
        }} className="mt-3 w-full rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
      >
        {isLoading ? 'Đang tải...' : 'Xem thêm'}
      </button>
    );
  };

  useEffect(() => {
    if (!assetHasMoreByTab[activeTab] || assetLoadingByTab[activeTab]) return;
    const visibleCount = visibleLimits[activeTab];
    const totalCount =
      activeTab === 'media'
        ? mediaItems.length
        : activeTab === 'files'
          ? fileItems.length
          : linkItems.length;
    if (totalCount >= visibleCount) return;
    void loadAssetsForTab(activeTab);
  }, [
    activeTab,
    assetHasMoreByTab,
    assetLoadingByTab,
    fileItems.length,
    linkItems.length,
    loadAssetsForTab,
    mediaItems.length,
    visibleLimits,
  ]);

  const renderMediaGrid = () => (
    mediaItems.length > 0 ? (
      <>
        <div className="space-y-5">
          {groupItemsByCalendarDate(visibleMediaItems).map((group) => (
            <div key={group.key} className="space-y-2">
              <h4 className="text-[14px] font-semibold text-slate-700">{group.title}</h4>
              <div className="grid grid-cols-2 gap-1">
                {group.items.map((item) => (
                  <div key={item.id} className="group/item relative aspect-square bg-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        const index = mediaItems.findIndex((media) => media.id === item.id);
                        setMediaLightboxIndex(index >= 0 ? index : 0);
                      }} className="h-full w-full overflow-hidden"
                      title="Mở media"
                    >
                      <img src={item.url} alt="Media đã gửi" className="h-full w-full object-cover" loading="lazy" />
                      {item.type === 'video' && (
                        <span className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 text-white">
                          <Video className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        const menuWidth = 224;
                        const viewportPadding = 8;
                        const left = Math.min(
                          Math.max(viewportPadding, rect.right - menuWidth),
                          window.innerWidth - menuWidth - viewportPadding,
                        );
                        const top = Math.min(rect.bottom + 6, window.innerHeight - 360);
                        setMediaActionMenuPosition({ top, left });
                        setMediaActionMenuId((prev) => (prev === item.id ? null : item.id));
                      }} className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover/item:opacity-100 hover:bg-black/60"
                      title="Tùy chọn"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {mediaActionMenuId === item.id && mediaActionMenuPosition && (
                      <div
                        className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl"
                        style={{ top: mediaActionMenuPosition.top, left: mediaActionMenuPosition.left }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            await copyImageToClipboard(item.url);
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-gray-800 hover:bg-gray-100"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onForwardMedia?.({
                              id: `forward-media-${item.id}`,
                              senderId: currentUserId || 'me',
                              text: item.type === 'video' ? 'Video' : 'Ảnh',
                              imageUrl: item.url,
                              imageUrls: [item.url],
                              timestamp: parseBackendDate(item.createdAt) ?? new Date(),
                              isOwn: true,
                            });
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-gray-800 hover:bg-gray-100"
                        >
                          Chuyển tiếp
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void jumpToOriginalMessage(item.id, item.url);
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-gray-800 hover:bg-gray-100"
                        >
                          Xem tin nhắn gốc
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            downloadMedia(item.url, `media-${item.id}`);
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-gray-800 hover:bg-gray-100"
                        >
                          Lưu về máy
                        </button>
                        <div className="my-1 h-px bg-gray-200" />
                        <button
                          type="button"
                          onClick={() => {
                            toast.info('Chức năng này sẽ được cập nhật.');
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-red-600 hover:bg-red-50"
                        >
                          Gỡ ở phía tôi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toast.info('Chức năng thu hồi sẽ được cập nhật.');
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-red-600 hover:bg-red-50"
                        >
                          Gỡ cho mọi người
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
        <div className="space-y-5">
          {groupItemsByCalendarDate(visibleFileItems).map((group) => (
            <div key={group.key} className="space-y-2">
              <h4 className="text-[14px] font-semibold text-slate-700">{group.title}</h4>
              <div className="space-y-2">
                {group.items.map((item) => (
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
                    </span>
                  </a>
                ))}
              </div>
            </div>
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
        <div className="space-y-5">
          {groupItemsByCalendarDate(visibleLinkItems).map((group) => (
            <div key={group.key} className="space-y-2">
              <h4 className="text-[14px] font-semibold text-slate-700">{group.title}</h4>
              <div className="space-y-2">
                {group.items.map((item) => (
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
            </div>
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
        onClick={() => toggleGroupSection(section)} className="flex min-h-[56px] w-full items-center justify-between rounded-lg px-3 text-left hover:bg-gray-50"
      >
        <span className="text-[15px] font-semibold text-gray-900">{label}</span>
        <ChevronUp className={`h-4.5 w-4.5 text-gray-900 transition-transform ${groupSectionsOpen[section] ? '' : 'rotate-180'}`} />
      </button>
    );

    return (
      <>
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
          <button type="button" className="group flex w-16 flex-col items-center gap-2 cursor-pointer" title="Tắt thông báo">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300">
              <BellOff className="h-4.5 w-4.5 text-gray-900" />
            </span>
            <span className="text-xs leading-tight text-gray-900">Tắt thông báo</span>
          </button>
          <button type="button" className="group flex w-16 flex-col items-center gap-2 cursor-pointer" title="Tìm kiếm">
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
                className="flex w-full items-center gap-3 rounded-lg py-2 text-left text-gray-900 hover:bg-gray-50 cursor-pointer"
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
              <button type="button" onClick={onOpenRenameGroup} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-gray-50 cursor-pointer">
                <Pencil className="h-5 w-5 shrink-0 text-gray-900" />
                <span className="text-[15px] font-semibold">Đổi tên đoạn chat</span>
              </button>
              <button type="button" onClick={onOpenChangeGroupImage} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-gray-50 cursor-pointer">
                <ImagePlus className="h-5 w-5 shrink-0 text-gray-900" />
                <span className="text-[15px] font-semibold">Thay đổi ảnh</span>
              </button>
              <button type="button" onClick={onOpenNicknames} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-gray-50 cursor-pointer">
                <Type className="h-5 w-5 shrink-0 text-gray-900" />
                <span className="text-[15px] font-semibold">Chỉnh sửa biệt danh</span>
              </button>
              {/* Legacy actions remain intentionally hidden until wired to real handlers. */}
              <button type="button" className="hidden cursor-pointer">
                Đổi tên đoạn chat
              </button>
              <button type="button" className="hidden cursor-pointer">
                Đổi ảnh nhóm
              </button>
            </div>
          )}

          {renderGroupSectionHeader('options', 'Tùy chọn nhóm')}
          {groupSectionsOpen.options && (
            <div className="space-y-2 px-3 pb-3 text-sm text-gray-600">
              <button type="button" className="block w-full rounded-lg py-2 text-left hover:text-gray-900 cursor-pointer">
                Tìm kiếm trong đoạn chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('media');
                  setInfoView('files');
                }} className="block w-full rounded-lg py-2 text-left hover:text-gray-900"
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
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100 cursor-pointer"
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
                className="flex w-full items-center gap-3 rounded-lg py-1 text-left hover:bg-gray-50 cursor-pointer"
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
              className="flex min-h-[56px] w-full items-center justify-between rounded-lg px-3 text-left hover:bg-gray-50 cursor-pointer"
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
                  }} className="flex w-full items-center gap-4 text-left"
                >
                  <ImageIcon className="h-5 w-5 text-gray-900" />
                  <span className="text-[15px] font-semibold text-gray-900">Phương tiện</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('files');
                    setInfoView('files');
                  }} className="flex w-full items-center gap-4 text-left"
                >
                  <FileText className="h-5 w-5 text-gray-900" />
                  <span className="text-[15px] font-semibold text-gray-900">File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('links');
                    setInfoView('files');
                  }} className="flex w-full items-center gap-4 text-left"
                >
                  <LinkIcon className="h-5 w-5 text-gray-900" />
                  <span className="text-[15px] font-semibold text-gray-900">Link</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </aside>
      {activeLightboxMedia && (
        <div
          className="fixed inset-0 z-[240] bg-black/80"
          onClick={() => setMediaLightboxIndex(null)}
          role="presentation"
        >
          <button
            type="button"
            onClick={() => setMediaLightboxIndex(null)} className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            title="Đóng"
          >
            <X className="h-8 w-8" />
          </button>
          {mediaItems.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMediaLightboxIndex((prev) => (prev === null ? 0 : (prev - 1 + mediaItems.length) % mediaItems.length));
              }} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
              title="Ảnh trước"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          <div className="flex h-full w-full items-center justify-center p-8">
            <img
              src={activeLightboxMedia.url}
              alt="Media"
              className="max-h-[92vh] max-w-[92vw] object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
          {mediaItems.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMediaLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % mediaItems.length));
              }} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
              title="Ảnh sau"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
      </>
    );
  }

  return (
    <>
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
            {formatLastActiveLabel(user.isOnline, user.lastActiveAt) ? (
              <p className="text-xs text-gray-500">{formatLastActiveLabel(user.isOnline, user.lastActiveAt)}</p>
            ) : null}
          </div>

          <div className="mt-6 flex shrink-0 items-start justify-center gap-8 text-center">
            <button type="button" className="group flex w-16 flex-col items-center gap-2 cursor-pointer" title="Tắt thông báo">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300">
                <BellOff className="h-4.5 w-4.5 text-gray-900" />
              </span>
              <span className="text-xs leading-tight text-gray-900">Tắt thông báo</span>
            </button>
            <button type="button" className="group flex w-16 flex-col items-center gap-2 cursor-pointer" title="Tìm kiếm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300">
                <SearchIcon className="h-4.5 w-4.5 text-gray-900" />
              </span>
              <span className="text-xs leading-tight text-gray-900">Tìm kiếm</span>
            </button>
          </div>

          <section className="mt-8 shrink-0">
            <button
              type="button"
              className="flex w-full items-center justify-between py-2 text-left cursor-pointer"
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
                }} className="flex w-full items-center gap-4 text-left"
              >
                <ImageIcon className="h-5 w-5 text-gray-900" />
                <span className="text-[15px] font-semibold text-gray-900">Phương tiện</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('files');
                  setInfoView('files');
                }} className="flex w-full items-center gap-4 text-left"
              >
                <FileText className="h-5 w-5 text-gray-900" />
                <span className="text-[15px] font-semibold text-gray-900">File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('links');
                  setInfoView('files');
                }} className="flex w-full items-center gap-4 text-left"
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
              onClick={() => setInfoView('overview')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
              title="Quay lại"
            >
              <ArrowLeft className="h-5 w-5 text-gray-900" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">Phương tiện, File, Link</h3>
          </div>

          <div className="mt-8 grid shrink-0 grid-cols-3 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('media')} className={`pb-3 text-center text-sm font-semibold transition-colors ${
                activeTab === 'media' ? 'border-b-[3px] border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Phương tiện
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('files')} className={`pb-3 text-center text-sm font-semibold transition-colors ${
                activeTab === 'files' ? 'border-b-[3px] border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('links')} className={`pb-3 text-center text-sm font-semibold transition-colors ${
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
    {activeLightboxMedia && (
      <div
        className="fixed inset-0 z-[240] bg-black/80"
        onClick={() => setMediaLightboxIndex(null)}
        role="presentation"
      >
        <button
          type="button"
          onClick={() => setMediaLightboxIndex(null)} className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          title="Đóng"
        >
          <X className="h-8 w-8" />
        </button>
        {mediaItems.length > 1 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMediaLightboxIndex((prev) => (prev === null ? 0 : (prev - 1 + mediaItems.length) % mediaItems.length));
            }} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
            title="Ảnh trước"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        <div className="flex h-full w-full items-center justify-center p-8">
          <img
            src={activeLightboxMedia.url}
            alt="Media"
            className="max-h-[92vh] max-w-[92vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
        {mediaItems.length > 1 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMediaLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % mediaItems.length));
            }} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
            title="Ảnh sau"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>
    )}
    </>
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
  const { data: publicPolicy } = usePublicPolicies();
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
  const [groupSettingsModal, setGroupSettingsModal] = useState<null | 'rename' | 'image' | 'nicknames'>(null);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupImagePreview, setGroupImagePreview] = useState('');
  const [groupImageZoom, setGroupImageZoom] = useState(1);
  const [groupImageOffsetX, setGroupImageOffsetX] = useState(0);
  const [groupImageOffsetY, setGroupImageOffsetY] = useState(0);
  const [nicknameEditingUserId, setNicknameEditingUserId] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [isSavingGroupSettings, setIsSavingGroupSettings] = useState(false);
  const [isProcessingGroupImage, setIsProcessingGroupImage] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [selectedForwardTargetIds, setSelectedForwardTargetIds] = useState<string[]>([]);
  const [pinnedMessagesByConversation, setPinnedMessagesByConversation] = useState<Record<string, PinnedChatMessage[]>>({});
  const [openPinnedMessagesSignal, setOpenPinnedMessagesSignal] = useState(0);
  const [jumpToMessageRequest, setJumpToMessageRequest] = useState<{ messageId: string; nonce: number } | null>(null);
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
  const historyByUserRef = useRef<Record<string, HistoryState>>({});
  const messagesByUserRef = useRef<Record<string, Message[]>>({});
  const initialHistoryInFlightRef = useRef<Set<string>>(new Set());
  const olderHistoryInFlightRef = useRef<Set<string>>(new Set());
  const pendingMessageStatusRef = useRef<
    Record<string, { status: IncomingMessageStatus['status']; updatedAt?: string }>
  >({});
  const groupImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveChatUserRef = useRef<ChatUser | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPresenceClockTick((prev) => prev + 1);
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    historyByUserRef.current = historyByUser;
  }, [historyByUser]);

  useEffect(() => {
    messagesByUserRef.current = messagesByUser;
  }, [messagesByUser]);

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

  const conversations: Conversation[] = [...groupConversationItems, ...baseConversationItems].sort((first, second) => {
    const firstActivity =
      first.lastActivityAt ??
      parseBackendDate(first.timestamp)?.getTime() ??
      0;
    const secondActivity =
      second.lastActivityAt ??
      parseBackendDate(second.timestamp)?.getTime() ??
      0;
    return secondActivity - firstActivity;
  });
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

  // Keep the last known chat user so we can still show the window after unfriending
  if (activeChatUser) {
    lastActiveChatUserRef.current = activeChatUser;
  }
  const isFriendChat = Boolean(activeChatUser) || isActiveGroupChat;
  const effectiveChatUser: ChatUser | null =
    activeChatUser ??
    (!isActiveGroupChat && lastActiveChatUserRef.current?.id === activeChatUserId
      ? lastActiveChatUserRef.current
      : null);

  const selectableFriends = useMemo(() => baseConversationItems.map((c) => c.user), [baseConversationItems]);

  const loadGroupConversations = useCallback(async () => {
    try {
      const groups = await chatService.getMyGroupConversations();
      const summaries = await chatService.getConversationSummaries({
        conversationIds: groups.map((group) => group.id),
      });
      const summaryByConversationId = new Map(
        summaries
          .filter((item) => item.conversationId)
          .map((item) => [item.conversationId as string, item]),
      );

      const mapped: Conversation[] = groups.map((group) => {
        const summary = summaryByConversationId.get(group.id);
        const previewRaw = summary?.lastMessageContent?.trim() || '';
        const previewText = previewRaw ? mapBackendContentToMessageFields(previewRaw).text : '';
        const preview = previewText ? formatConversationPreview(previewText, summary?.lastMessageSenderId === currentUser?.id) : '';
        const parsed = parseBackendDate(summary?.lastMessageCreatedAt || group.createdAt);
        const timestamp = parsed ? formatRelativeConversationTime(parsed) : '';
        const lastActivityAt = parsed ? parsed.getTime() : 0;

        return {
        id: group.id,
        user: {
          id: `group:${group.id}`,
          name: group.name,
          avatar:
            group.avatarUrl?.trim() ||
            `https://ui-avatars.com/api/?background=2563eb&color=ffffff&bold=true&name=${encodeURIComponent('Group')}`,
          isOnline: false,
        },
        lastMessage: preview || 'Chưa có tin nhắn',
        timestamp,
        lastActivityAt,
        isUnread: false,
        isGroup: true,
        themeColor: group.themeColor,
      };
      });

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
      setOverrides((prev) => {
        const next = { ...prev };
        mapped.forEach((conversation) => {
          const conversationId = conversation.user.id;
          next[conversationId] = {
            ...(next[conversationId] ?? {}),
            lastMessage: conversation.lastMessage,
            timestamp: conversation.timestamp,
            lastActivityAt: conversation.lastActivityAt,
          };
        });
        return next;
      });
      setGroupMembersById((prev) => ({ ...prev, ...membersMap }));
      setGroupCreatorById((prev) => ({ ...prev, ...creatorsMap }));
    } catch {
      // keep current state on failure
    }
  }, [currentUser?.id]);

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
      lastActivityAt: overrides[chatUserId]?.lastActivityAt ?? 0,
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
      const current = historyByUserRef.current[peerUserId] ?? defaultHistoryState();
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
          const last = getLatestVisibleMessage(msgs) ?? getLatestMessage(msgs);
          if (!last) return;
          setOverrides((prev) => ({
            ...prev,
            [peerUserId]: {
              ...(prev[peerUserId] ?? {}),
              lastMessage: formatConversationPreview(last.text, last.isOwn),
              timestamp: formatRelativeConversationTime(last.timestamp),
              lastActivityAt: last.timestamp.getTime(),
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
    [currentUser?.id],
  );

  const loadOlderHistory = useCallback(
    async (peerUserId: string) => {
      if (!currentUser?.id) return;
      if (olderHistoryInFlightRef.current.has(peerUserId)) return;
      const current = historyByUserRef.current[peerUserId] ?? defaultHistoryState();
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
        const existingMessages = messagesByUserRef.current[peerUserId] ?? [];
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
    [currentUser?.id],
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
    subscribeChatErrors,
    sendMessageDelivered,
    sendConversationSeen,
  } = useRealtimeCall();

  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);

  useEffect(() => {
    return subscribeChatErrors((error) => {
      if (error.code === 'CHAT_RATE_LIMITED' && error.retryAfterSeconds) {
        setRateLimitUntil(Date.now() + error.retryAfterSeconds * 1000);
      }
    });
  }, [subscribeChatErrors]);

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
          lastActivityAt: newMsg.timestamp.getTime(),
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

      const isStructuredPayload =
        content.startsWith(VOICE_MESSAGE_PREFIX) ||
        content.startsWith(IMAGE_MESSAGE_PREFIX) ||
        content.startsWith(FILE_MESSAGE_PREFIX) ||
        content.startsWith(VIDEO_SHARE_PREFIX) ||
        content.startsWith(POST_SHARE_PREFIX) ||
        content.startsWith(CHAT_ACTION_PREFIX) ||
        content.startsWith(STORY_REPLY_PREFIX) ||
        content.startsWith(REPLY_PREFIX);

      if (!isStructuredPayload) {
        const policyError = validateChatAgainstPolicy(content, publicPolicy);
        if (policyError) {
          toast.error(policyError);
          return;
        }
      }

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
    [activeChatUserId, handleIncomingMessage, publicPolicy, sendMessage],
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
        lastActivityAt: Date.now(),
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

  const handleDeleteMessageForEveryone = useCallback(
    async (messageId: string) => {
      try {
        await chatService.deleteMessage(messageId);
      } catch {
        // keep old state when delete fails
      }
    },
    [],
  );

  const handleDeleteMessageForMe = useCallback(
    (messageId: string) => {
      if (!activeChatUserId) return;
      setMessagesByUser((prev) => {
        const current = prev[activeChatUserId] ?? [];
        const nextMessages = current.filter((message) => message.id !== messageId);
        if (nextMessages.length === current.length) return prev;
        return {
          ...prev,
          [activeChatUserId]: nextMessages,
        };
      });
    },
    [activeChatUserId],
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
      const aActivityAt =
        a.lastActivityAt ??
        parseBackendDate(a.timestamp)?.getTime() ??
        0;
      const bActivityAt =
        b.lastActivityAt ??
        parseBackendDate(b.timestamp)?.getTime() ??
        0;
      return bActivityAt - aActivityAt;
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
  const isGroupSettingsBusy = isSavingGroupSettings || isProcessingGroupImage;

  const openGroupImagePicker = useCallback(() => {
    if (!activeChatUserId?.startsWith('group:') || !activeChatUser) return;
    groupImageFileInputRef.current?.click();
  }, [activeChatUser, activeChatUserId]);

  const handleSelectGroupImageFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận tệp ảnh.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        toast.error('Không thể đọc ảnh đã chọn.');
        return;
      }
      setGroupImagePreview(result);
      setGroupImageZoom(1);
      setGroupImageOffsetX(0);
      setGroupImageOffsetY(0);
      setGroupSettingsModal('image');
    };
    reader.onerror = () => toast.error('Không thể đọc ảnh đã chọn.');
    reader.readAsDataURL(file);
  }, []);

  const openGroupSettingsModal = useCallback((mode: 'rename' | 'image' | 'nicknames') => {
    if (!activeChatUserId?.startsWith('group:') || !activeChatUser) return;
    setGroupSettingsModal(mode);
    if (mode === 'rename') {
      setGroupNameDraft(activeChatUser.name);
    }
    if (mode === 'image') {
      setGroupImagePreview(activeChatUser.avatar || '');
      setGroupImageZoom(1);
      setGroupImageOffsetX(0);
      setGroupImageOffsetY(0);
    }
    if (mode === 'nicknames') {
      setNicknameEditingUserId(null);
      setNicknameDraft('');
    }
  }, [activeChatUser, activeChatUserId]);

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
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                    title="Tải lại danh sách"
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingConversations ? 'animate-spin' : ''}`} />
                  </button>
                  <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer">
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setIsCreateGroupOpen(true)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
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
                    onClick={() => setActiveFilter(filter.key)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
                  <button onClick={loadFriends} className="text-blue-500 hover:underline text-sm cursor-pointer">
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
          {effectiveChatUser ? (
            <div className="flex-1 min-h-0 min-w-0 relative">
              <ChatWindow
                user={effectiveChatUser}
                isFriend={isFriendChat}
                messages={activeMessages}
                loading={loadingMessages}
                loadingOlder={loadingOlderMessages}
                hasOlder={hasOlderMessages}
                connected={connected}
                onSendMessage={handleSendMessage}
                onLoadOlder={handleLoadOlderMessages}
                onReactMessage={handleReactMessage}
                onDeleteMessageForMe={handleDeleteMessageForMe}
                onDeleteMessageForEveryone={handleDeleteMessageForEveryone}
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
                  !isFriendChat
                    ? false
                    : !voiceCall.hasActiveCall && !voiceCall.isRinging
                      ? true
                      : voiceCall.activePeerUserId === effectiveChatUser.id ||
                        (isActiveGroupChat &&
                          voiceCall.activeGroupConversationId === effectiveChatUser.id.replace('group:', ''))
                }
                canStartVideoCall={isFriendChat && !voiceCall.hasActiveCall && !voiceCall.isRinging}
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
                jumpToMessageRequest={jumpToMessageRequest}
                rateLimitUntil={rateLimitUntil}
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

          {effectiveChatUser && (
            <ChatInfoPanel
              user={effectiveChatUser}
              messages={activeMessages}
              isGroupChat={isActiveGroupChat}
              groupMembers={activeChatUserId ? groupMembersById[activeChatUserId] ?? [] : []}
              groupCreatorId={activeChatUserId ? groupCreatorById[activeChatUserId] : undefined}
              currentUserId={currentUser?.id}
              onOpenAddMembers={openAddGroupMembersModal}
              onOpenPinnedMessages={() => setOpenPinnedMessagesSignal((value) => value + 1)}
              onOpenRenameGroup={() => openGroupSettingsModal('rename')}
              onOpenChangeGroupImage={openGroupImagePicker}
              onOpenNicknames={() => openGroupSettingsModal('nicknames')}
              onForwardMedia={handleOpenForwardModal}
              onJumpToMessage={(messageId) => setJumpToMessageRequest({ messageId, nonce: Date.now() })}
              onLoadMoreHistory={handleLoadOlderMessages}
              hasMoreHistory={hasOlderMessages}
              isLoadingMoreHistory={loadingOlderMessages}
            />
          )}
        </div>
      </div>

      <input
        ref={groupImageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelectGroupImageFile}
      />

      {groupSettingsModal && activeChatUserId?.startsWith('group:') && activeChatUser && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/35 p-4">
          <div
            className={`flex max-h-[86vh] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl ${
              groupSettingsModal === 'rename' ? 'max-w-[620px]' : 'max-w-[620px]'
            }`}
          >
            <div className="relative flex min-h-[70px] shrink-0 items-center justify-center border-b border-gray-200 px-5 py-3">
              <h3 className="text-[24px] font-bold leading-tight text-gray-900">
                {groupSettingsModal === 'rename'
                  ? 'Đổi tên đoạn chat'
                  : groupSettingsModal === 'image'
                    ? 'Thay đổi ảnh'
                    : 'Biệt danh'}
              </h3>
              <button
                type="button"
                onClick={() => setGroupSettingsModal(null)}
                disabled={isGroupSettingsBusy} className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-60"
                title="Đóng"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            {groupSettingsModal === 'rename' && (
              <form
                className="p-4 pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextName = groupNameDraft.trim();
                  if (!nextName || nextName.length > 500 || nextName === activeChatUser.name.trim()) return;
                  void handleUpdateGroupConversation({ name: nextName });
                }}
              >
                <p className="mb-3 px-1 text-[17px] leading-6 text-gray-900">
                  Mọi người đều biết khi tên nhóm chat thay đổi.
                </p>

                <label className="block rounded-[18px] border border-blue-600 px-5 pb-3 pt-4 shadow-[0_0_0_2px_#1d76ff]">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-[13px] leading-4 text-blue-600">Tên đoạn chat</span>
                    <span className="text-[15px] leading-4 text-gray-500">{groupNameDraft.length}/500</span>
                  </div>
                  <input
                    value={groupNameDraft}
                    onChange={(event) => setGroupNameDraft(event.target.value.slice(0, 500))}
                    className="h-6 w-full bg-transparent text-[17px] leading-6 text-gray-900 outline-none"
                    autoFocus
                  />
                </label>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setGroupSettingsModal(null)}
                    disabled={isGroupSettingsBusy} className="h-10 rounded-lg px-4 text-[17px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSavingGroupSettings ||
                      !groupNameDraft.trim() ||
                      groupNameDraft.trim().length > 500 ||
                      groupNameDraft.trim() === activeChatUser.name.trim()
                    } className="h-10 rounded-lg bg-blue-600 px-5 text-[17px] font-semibold text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    Lưu
                  </button>
                </div>
              </form>
            )}

            {groupSettingsModal === 'image' && (
              <div className="space-y-3 p-3 sm:p-4">
                <div className="flex justify-center">
                  <div
                    className="relative overflow-hidden rounded-full border border-gray-200 bg-gray-100"
                    style={{ width: GROUP_AVATAR_CROP_SIZE, height: GROUP_AVATAR_CROP_SIZE }}
                  >
                    {groupImagePreview ? (
                      <img
                        src={groupImagePreview}
                        alt={activeChatUser.name}
                        className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                        style={{
                          transform: `translate(-50%, -50%) translate(${groupImageOffsetX}%, ${groupImageOffsetY}%) scale(${groupImageZoom})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">Chưa có ảnh</div>
                    )}
                  </div>
                </div>

                <p className="text-center text-sm text-gray-500">Kéo thanh để căn ảnh trước khi lưu.</p>

                <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Phóng to / thu nhỏ</label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={groupImageZoom}
                      onChange={(event) => setGroupImageZoom(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Di chuyển ngang</label>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={1}
                      value={groupImageOffsetX}
                      onChange={(event) => setGroupImageOffsetX(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Di chuyển dọc</label>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={1}
                      value={groupImageOffsetY}
                      onChange={(event) => setGroupImageOffsetY(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setGroupSettingsModal(null)}
                    disabled={isGroupSettingsBusy} className="h-10 flex-1 rounded-lg border border-gray-300 bg-white text-[15px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={openGroupImagePicker}
                    disabled={isGroupSettingsBusy}
                    className="h-10 flex-1 rounded-lg border border-gray-300 bg-white text-[15px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
                  >
                    Chọn lại
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!groupImagePreview || isGroupSettingsBusy) return;
                      setIsProcessingGroupImage(true);
                      try {
                        const croppedDataUrl = await renderCroppedAvatarDataUrl(
                          groupImagePreview,
                          groupImageZoom,
                          groupImageOffsetX,
                          groupImageOffsetY,
                        );
                        const imageFile = dataUrlToFile(croppedDataUrl, 'group-avatar.jpg');
                        const uploaded = await chatService.uploadChatImage(imageFile);
                        await handleUpdateGroupConversation({ avatarUrl: uploaded.imageUrl });
                      } catch {
                        toast.error('Không thể xử lý ảnh đã chọn.');
                      } finally {
                        setIsProcessingGroupImage(false);
                      }
                    }}
                    disabled={isGroupSettingsBusy || !groupImagePreview} className="h-10 flex-1 rounded-lg bg-blue-600 text-[15px] font-semibold text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    Lưu
                  </button>
                </div>
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
                              disabled={isGroupSettingsBusy} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100 disabled:opacity-60"
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
                              }} className="min-w-0 flex-1 text-left"
                            >
                              <p className="truncate text-[16px] font-semibold text-gray-900">{realName}</p>
                              <p className="truncate text-sm text-gray-600">{member.nickname || 'Đặt biệt danh'}</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNicknameEditingUserId(member.id);
                                setNicknameDraft(member.nickname || '');
                              }} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100"
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
                }} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
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
                            onClick={() => toggleGroupMemberSelection(friend.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
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
                }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroupChat}
                disabled={selectedGroupMemberIds.length < 2}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 cursor-pointer"
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
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300 disabled:opacity-60 cursor-pointer"
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
                              onClick={() => toggleAddGroupMemberSelection(id)} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow-sm hover:bg-gray-300"
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
                        onClick={() => toggleAddGroupMemberSelection(friend.id)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors ${
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
                className="h-11 w-full rounded-lg bg-blue-600 text-[16px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer"
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
                }} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
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
                          onClick={() => toggleForwardTargetSelection(targetId)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
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
                }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitForward}
                disabled={selectedForwardTargetIds.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 cursor-pointer"
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




