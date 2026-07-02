import { useState, useCallback, useEffect, useMemo, useRef, type ChangeEvent, type MouseEvent, type ReactNode, type UIEvent } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  MoreHorizontal,
  Edit,
  RefreshCw,
  Bell,
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
  Copy,
  Video,
  Pin,
  Pencil,
  ImagePlus,
  Type,
} from 'lucide-react';
import { Header } from '../../home/components';
import { ConversationItem, ChatWindow } from '../components';
import { GroupJoinLinkModal } from '../components/GroupJoinLinkModal/GroupJoinLinkModal';
import type { PinnedChatMessage } from '../components/ChatWindow/components/PinnedMessagesModal';
import { Conversation, MessengerFilter } from '../types/messenger.types';
import { ChatUser, IncomingChatMessage, IncomingMessageStatus, Message } from '../types/message.types';
import { useFriendConversations } from '../hooks/useFriendConversations';
import { authService } from '@/services/authService';
import { chatService, type GroupConversationMemberResponse } from '@/services/chatService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import { formatLastActiveLabel } from '../utils/presenceLabel';
import { normalizeCallDurationSeconds } from '../utils/callDuration';
import {
  buildConversationPreviewFromContent,
  formatConversationPreview,
  mapContentToConversationPreview,
  parseCallLogMediaType,
} from '../utils/conversationPreview';
import { toast } from 'sonner';
import { getAppOrigin } from '@/utils/apiBaseUrl';
import { resolveUserAvatarUrl } from '@/utils/userAvatarUtils';
import { userSettingsApi } from '@/features/settings/services/userSettingsApi';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  isConversationMuted,
  setConversationMuted,
} from '../utils/conversationMutePrefs';

const CALL_LOG_PREFIX = '__CALL_LOG__:';
const REPLY_PREFIX = '__REPLY__:';
const VOICE_MESSAGE_PREFIX = '__VOICE__:';
const VIDEO_MESSAGE_PREFIX = '__VIDEO_MSG__:';
const IMAGE_MESSAGE_PREFIX = '__IMAGE__:';
const FILE_MESSAGE_PREFIX = '__FILE__:';
const VIDEO_SHARE_PREFIX = '__VIDEO_SHARE__:';
const POST_SHARE_PREFIX = '__POST_SHARE__:';
const GROUP_SHARE_PREFIX = '__GROUP_SHARE__:';
const ALBUM_SHARE_PREFIX = '__ALBUM_SHARE__:';
const CHAT_ACTION_PREFIX = '__CHAT_ACTION__:';
const MEMBERSHIP_CHAT_ACTIONS = new Set([
  'join_via_link_pending',
  'join_via_link',
  'add_members_pending',
  'add_members',
  'approve_member',
  'reject_member',
  'remove_member',
  'leave_group',
  'transfer_admin',
]);
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

function mapGroupMembersToChatUsers(members: GroupConversationMemberResponse[]): ChatUser[] {
  return members.map((member) => ({
    id: member.userId,
    name: member.nickname || member.fullName || member.username || 'Người dùng',
    fullName: member.fullName || member.username || 'Người dùng',
    nickname: member.nickname,
    avatar: member.avatarUrl?.trim() || '',
    isOnline: false,
    memberStatus: member.memberStatus ?? 'APPROVED',
  }));
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
): Pick<Message, 'text' | 'replyPreview' | 'replyToMessageId' | 'voiceAudioUrl' | 'voiceDurationSec' | 'voiceMimeType' | 'videoUrl' | 'videoDurationSec' | 'videoMimeType' | 'videoShareId' | 'videoShareThumbnail' | 'videoShareTitle' | 'videoShareAuthorId' | 'fileUrl' | 'fileName' | 'fileMimeType' | 'fileSizeBytes' | 'imageUrl' | 'imageUrls' | 'imageMimeType' | 'imageCaption' | 'systemType' | 'systemActionType' | 'systemActionActorName' | 'systemActionTargetName' | 'systemActionValue' | 'callLogKind' | 'callDurationSec' | 'callMediaType' | 'storyReplyAuthorId' | 'storyReplyAuthorName' | 'storyReplyAuthorAvatarUrl' | 'storyReplySlideImageUrl' | 'storyReplySlideBackgroundColor' | 'sharedPostId' | 'sharedPostContent' | 'sharedPostImage' | 'sharedPostAuthorName' | 'sharedGroupId' | 'sharedGroupName' | 'sharedGroupCover' | 'sharedGroupPrivacy' | 'sharedGroupMemberCount' | 'sharedAlbumId' | 'sharedAlbumTitle' | 'sharedAlbumCover' | 'sharedAlbumMediaCount' | 'sharedAlbumOwnerName'> {
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
    if (content?.startsWith(VIDEO_MESSAGE_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(VIDEO_MESSAGE_PREFIX.length));
        const videoUrl = typeof payload?.videoUrl === 'string' ? payload.videoUrl : undefined;
        const videoDurationSec =
          typeof payload?.durationSec === 'number' && Number.isFinite(payload.durationSec)
            ? Math.max(0, Math.floor(payload.durationSec))
            : undefined;
        const videoMimeType = typeof payload?.mimeType === 'string' ? payload.mimeType : undefined;
        return {
          text: 'Video',
          videoUrl,
          videoDurationSec,
          videoMimeType,
        };
      } catch {
        return { text: 'Video' };
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
          sharedPostAuthorName: typeof payload?.authorName === 'string' ? payload.authorName : undefined,
        };
      } catch {
        return { text: 'Đã chia sẻ một bài viết' };
      }
    }
    if (content?.startsWith(GROUP_SHARE_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(GROUP_SHARE_PREFIX.length));
        return {
          text: 'Đã chia sẻ một nhóm',
          sharedGroupId: typeof payload?.id === 'string' ? payload.id : undefined,
          sharedGroupName: typeof payload?.name === 'string' ? payload.name : undefined,
          sharedGroupCover: typeof payload?.cover === 'string' ? payload.cover : undefined,
          sharedGroupPrivacy: payload?.privacy === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
          sharedGroupMemberCount: typeof payload?.memberCount === 'number' ? payload.memberCount : undefined,
        };
      } catch {
        return { text: 'Đã chia sẻ một nhóm' };
      }
    }
    if (content?.startsWith(ALBUM_SHARE_PREFIX)) {
      try {
        const payload = JSON.parse(content.slice(ALBUM_SHARE_PREFIX.length));
        return {
          text: 'Đã chia sẻ một album',
          sharedAlbumId: typeof payload?.id === 'string' ? payload.id : undefined,
          sharedAlbumTitle: typeof payload?.title === 'string' ? payload.title : undefined,
          sharedAlbumCover: typeof payload?.cover === 'string' ? payload.cover : undefined,
          sharedAlbumMediaCount: typeof payload?.mediaCount === 'number' ? payload.mediaCount : undefined,
          sharedAlbumOwnerName: typeof payload?.ownerName === 'string' ? payload.ownerName : undefined,
        };
      } catch {
        return { text: 'Đã chia sẻ một album' };
      }
    }
    return { text: content };
  }

  try {
    const payload = JSON.parse(content.slice(CALL_LOG_PREFIX.length));
    const mediaType = parseCallLogMediaType(payload);
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
    status: raw.status,
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

function getMessageSearchableText(message: Message): string {
  const parts = [
    message.text,
    mapContentToConversationPreview(message.text),
    message.imageCaption,
    message.fileName,
    message.replyPreview,
    message.sharedPostContent,
    message.videoShareTitle,
    message.sharedPostAuthorName,
  ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  return parts.join(' ').toLowerCase();
}

function formatMessageSearchTime(date: Date): string {
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  onRequestRemoveMember,
  onApproveMember,
  onRejectMember,
  memberApprovalRequired = false,
  canManageMemberApproval = false,
  onMemberApprovalChange,
  onLeaveGroup,
  onDissolveGroup,
  isGroupCreator = false,
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
  onRequestRemoveMember?: (memberId: string, memberName: string) => void;
  onApproveMember?: (memberId: string) => void;
  onRejectMember?: (memberId: string) => void;
  memberApprovalRequired?: boolean;
  canManageMemberApproval?: boolean;
  onMemberApprovalChange?: (enabled: boolean) => void;
  onLeaveGroup?: () => void;
  onDissolveGroup?: () => void;
  isGroupCreator?: boolean;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InfoPanelTab>('media');
  const [infoView, setInfoView] = useState<'overview' | 'files' | 'search'>('overview');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [notificationsMuted, setNotificationsMuted] = useState(() => isConversationMuted(user.id));
  const [isMediaSectionOpen, setIsMediaSectionOpen] = useState(false);
  const [groupSectionsOpen, setGroupSectionsOpen] = useState({
    info: false,
    customize: false,
    options: false,
    joinLink: false,
    members: false,
  });
  const [joinLink, setJoinLink] = useState('');
  const [joinLinkLoading, setJoinLinkLoading] = useState(false);
  const groupConversationId = isGroupChat && user.id.startsWith('group:') ? user.id.replace('group:', '') : '';
  const [mediaLightboxIndex, setMediaLightboxIndex] = useState<number | null>(null);
  const [mediaActionMenuId, setMediaActionMenuId] = useState<string | null>(null);
  const [mediaActionMenuPosition, setMediaActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [fileActionMenuId, setFileActionMenuId] = useState<string | null>(null);
  const [fileActionMenuPosition, setFileActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [linkActionMenuId, setLinkActionMenuId] = useState<string | null>(null);
  const [linkActionMenuPosition, setLinkActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [memberActionMenuId, setMemberActionMenuId] = useState<string | null>(null);
  const [memberActionMenuPosition, setMemberActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
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
  const tabContentRef = useRef<HTMLDivElement | null>(null);
  const hasMoreHistoryRef = useRef<boolean>(hasMoreHistory);
  const isLoadingMoreHistoryRef = useRef<boolean>(isLoadingMoreHistory);

  useEffect(() => {
    setAssetItemsByTab({ media: [], files: [], links: [] });
    setAssetCursorByTab({ media: null, files: null, links: null });
    setAssetHasMoreByTab({ media: true, files: true, links: true });
    setAssetLoadingByTab({ media: false, files: false, links: false });
    setInfoView('overview');
    setMessageSearchQuery('');
    setNotificationsMuted(isConversationMuted(user.id));
    setActiveTab('media');
    setIsMediaSectionOpen(false);
    setGroupSectionsOpen({
      info: false,
      customize: false,
      options: false,
      joinLink: false,
      members: false,
    });
    setJoinLink('');
  }, [user.id]);

  useEffect(() => {
    if (!groupSectionsOpen.joinLink || !groupConversationId) return;
    let cancelled = false;
    setJoinLinkLoading(true);
    void chatService
      .getGroupJoinLink(groupConversationId)
      .then((data) => {
        if (cancelled) return;
        setJoinLink(`${getAppOrigin()}/messages?join=${encodeURIComponent(data.token)}`);
      })
      .catch(() => {
        if (!cancelled) setJoinLink('');
      })
      .finally(() => {
        if (!cancelled) setJoinLinkLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupConversationId, groupSectionsOpen.joinLink]);

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

  const handleAvatarClick = useCallback(() => {
    if (isGroupChat || user.id.startsWith('group:')) return;
    navigate(`/profile/${user.id}`);
  }, [isGroupChat, navigate, user.id]);

  const messageSearchResults = useMemo(() => {
    const query = messageSearchQuery.trim().toLowerCase();
    if (!query) return [];
    return messages
      .filter((message) => {
        if (message.deleted || message.systemType === 'chat_action') return false;
        return getMessageSearchableText(message).includes(query);
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);
  }, [messages, messageSearchQuery]);

  const handleToggleNotifications = useCallback(() => {
    const nextMuted = !notificationsMuted;
    setConversationMuted(user.id, nextMuted);
    setNotificationsMuted(nextMuted);
    toast.success(nextMuted ? 'Đã tắt thông báo đoạn chat' : 'Đã bật thông báo đoạn chat');
  }, [notificationsMuted, user.id]);

  const handleOpenMessageSearch = useCallback(() => {
    setMessageSearchQuery('');
    setInfoView('search');
  }, []);

  const handleMessageSearchSelect = useCallback(
    (messageId: string) => {
      onJumpToMessage?.(messageId);
      setInfoView('overview');
      setMessageSearchQuery('');
    },
    [onJumpToMessage],
  );

  const renderQuickActions = () => (
    <div className="flex shrink-0 items-start justify-center gap-8 pb-5 text-center">
      <button
        type="button"
        onClick={handleToggleNotifications}
        className="group flex w-16 flex-col items-center gap-2 cursor-pointer"
        title={notificationsMuted ? 'Bật thông báo' : 'Tắt thông báo'}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${ notificationsMuted ? 'bg-emerald-100 dark:bg-emerald-900/40 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/60' : 'bg-muted group-hover:bg-muted dark:group-hover:bg-gray-600' }`}
        >
          {notificationsMuted ? (
            <Bell className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <BellOff className="h-4.5 w-4.5 text-foreground" />
          )}
        </span>
        <span className="text-xs leading-tight text-foreground">
          {notificationsMuted ? 'Bật thông báo' : 'Tắt thông báo'}
        </span>
      </button>
      <button
        type="button"
        onClick={handleOpenMessageSearch}
        className="group flex w-16 flex-col items-center gap-2 cursor-pointer"
        title="Tìm kiếm"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-muted dark:group-hover:bg-gray-600">
          <SearchIcon className="h-4.5 w-4.5 text-foreground" />
        </span>
        <span className="text-xs leading-tight text-foreground">Tìm kiếm</span>
      </button>
    </div>
  );

  const renderMessageSearchView = () => (
    <div className="flex h-full min-h-0 flex-col px-5 py-5">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setInfoView('overview');
            setMessageSearchQuery('');
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          title="Quay lại"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h3 className="text-lg font-semibold text-foreground">Tìm kiếm trong đoạn chat</h3>
      </div>

      <div className="relative mt-6 shrink-0">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={messageSearchQuery}
          onChange={(event) => setMessageSearchQuery(event.target.value)}
          placeholder="Tìm tin nhắn..."
          autoFocus
          className="w-full rounded-full bg-muted py-2 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:bg-muted"
        />
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        {messageSearchQuery.trim() ? (
          messageSearchResults.length > 0 ? (
            <div className="space-y-1">
              {messageSearchResults.map((message) => {
                const preview =
                  mapContentToConversationPreview(message.text) ||
                  message.text?.trim() ||
                  'Tin nhắn';
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => handleMessageSearchSelect(message.id)}
                    className="flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <span className="line-clamp-2 text-sm text-foreground">{preview}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatMessageSearchTime(message.timestamp)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy tin nhắn phù hợp</p>
          )
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Nhập từ khóa để tìm tin nhắn</p>
        )}
      </div>
    </div>
  );

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
    if (!fileActionMenuId) return;
    const close = () => setFileActionMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [fileActionMenuId]);

  useEffect(() => {
    if (!fileActionMenuId) {
      setFileActionMenuPosition(null);
    }
  }, [fileActionMenuId]);

  useEffect(() => {
    if (!linkActionMenuId) return;
    const close = () => setLinkActionMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [linkActionMenuId]);

  useEffect(() => {
    if (!linkActionMenuId) {
      setLinkActionMenuPosition(null);
    }
  }, [linkActionMenuId]);

  useEffect(() => {
    if (!memberActionMenuId) return;
    const close = () => setMemberActionMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [memberActionMenuId]);

  useEffect(() => {
    if (!memberActionMenuId) {
      setMemberActionMenuPosition(null);
    }
  }, [memberActionMenuId]);

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
    const match = assetId.match(/^([0-9a-fA-F-]{36})-(?:image|video|file|link)-\d+$/);
    return match?.[1] || null;
  }, []);

  const findMessageIdByAsset = useCallback((assetId: string, assetUrl: string) => {
    const fromAssetId = parseMessageIdFromAssetId(assetId);
    if (fromAssetId) return fromAssetId;
    const normalizedUrl = assetUrl.trim();
    const target = messagesRef.current.find((message) => {
      if ((message.videoUrl || '').trim() === normalizedUrl) return true;
      if ((message.fileUrl || '').trim() === normalizedUrl) return true;
      const urls = message.imageUrls && message.imageUrls.length > 0
        ? message.imageUrls
        : message.imageUrl
          ? [message.imageUrl]
          : [];
      if (urls.some((url) => (url || '').trim() === normalizedUrl)) return true;
      return extractLinksFromText(message.text).some((link) => link.trim() === normalizedUrl);
    });
    return target?.id || null;
  }, [parseMessageIdFromAssetId]);

  const jumpToOriginalMessage = useCallback(async (assetId: string, assetUrl: string) => {
    const findAndScroll = () => {
      const messageId = findMessageIdByAsset(assetId, assetUrl);
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
  }, [findMessageIdByAsset, onJumpToMessage, onLoadMoreHistory]);

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

      if (latest.videoUrl?.trim()) {
        const videoUrl = latest.videoUrl.trim();
        if (!next.media.some((item) => item.url === videoUrl)) {
          next.media.unshift({
            id: `local-media-${latest.id}-video`,
            url: videoUrl,
            type: 'video',
            createdAt,
          });
          changed = true;
        }
      }

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
      } catch {
        // Ignore — e.g. user left the group while assets were loading.
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

  const handleTabContentScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      if (element.scrollHeight - element.scrollTop - element.clientHeight > 160) return;
      if (assetLoadingByTab[activeTab] || !assetHasMoreByTab[activeTab]) return;
      void loadAssetsForTab(activeTab);
    },
    [activeTab, assetHasMoreByTab, assetLoadingByTab, loadAssetsForTab],
  );

  useEffect(() => {
    if (infoView !== 'files') return;
    if (assetLoadingByTab[activeTab] || !assetHasMoreByTab[activeTab]) return;
    const element = tabContentRef.current;
    if (!element) return;
    if (element.scrollHeight <= element.clientHeight + 16) {
      void loadAssetsForTab(activeTab);
    }
  }, [activeTab, assetHasMoreByTab, assetItemsByTab, assetLoadingByTab, infoView, loadAssetsForTab]);

  const openActionMenuAt = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const viewportPadding = 8;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );
    const top = Math.min(rect.bottom + 6, window.innerHeight - 360);
    return { top, left };
  }, []);

  const renderTabLoadingFooter = () =>
    assetLoadingByTab[activeTab] ? (
      <div className="py-4 text-center text-sm text-muted-foreground">Đang tải...</div>
    ) : null;

  const renderMediaGrid = () => (
    mediaItems.length > 0 ? (
      <>
        <div className="space-y-5">
          {groupItemsByCalendarDate(mediaItems).map((group) => (
            <div key={group.key} className="space-y-2">
              <h4 className="text-[14px] font-semibold text-slate-700">{group.title}</h4>
              <div className="grid grid-cols-2 gap-1">
                {group.items.map((item) => (
                  <div key={item.id} className="group/item relative aspect-square bg-background">
                    <button
                      type="button"
                      onClick={() => {
                        const index = mediaItems.findIndex((media) => media.id === item.id);
                        setMediaLightboxIndex(index >= 0 ? index : 0);
                      }} className="h-full w-full overflow-hidden"
                      title="Mở media"
                    >
                      {item.type === 'video' ? (
                        <video
                          src={item.url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img src={item.url} alt="Media đã gửi" className="h-full w-full object-cover" loading="lazy" />
                      )}
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
                        const position = openActionMenuAt(event);
                        setMediaActionMenuPosition(position);
                        setMediaActionMenuId((prev) => (prev === item.id ? null : item.id));
                      }} className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover/item:opacity-100 hover:bg-black/60"
                      title="Tùy chọn"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {mediaActionMenuId === item.id && mediaActionMenuPosition && (
                      <div
                        className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl"
                        style={{ top: mediaActionMenuPosition.top, left: mediaActionMenuPosition.left }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            if (item.type === 'video') {
                              await copyText(item.url, 'Đã sao chép link video.');
                            } else {
                              await copyImageToClipboard(item.url);
                            }
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
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
                              imageUrl: item.type === 'image' ? item.url : undefined,
                              imageUrls: item.type === 'image' ? [item.url] : undefined,
                              videoUrl: item.type === 'video' ? item.url : undefined,
                              timestamp: parseBackendDate(item.createdAt) ?? new Date(),
                              isOwn: true,
                            });
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Chuyển tiếp
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void jumpToOriginalMessage(item.id, item.url);
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Xem tin nhắn gốc
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            downloadMedia(item.url, `media-${item.id}`);
                            setMediaActionMenuId(null);
                          }} className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Lưu về máy
                        </button>
                        <div className="my-1 h-px bg-muted" />
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
        {renderTabLoadingFooter()}
      </>
    ) : (
      <EmptyInfoTab icon={<ImageIcon className="h-5 w-5" />} text="Chưa có ảnh hoặc video" />
    )
  );

  const renderFileList = () => (
    fileItems.length > 0 ? (
      <>
        <div className="space-y-5">
          {groupItemsByCalendarDate(fileItems).map((group) => (
            <div key={group.key} className="space-y-2">
              <h4 className="text-[14px] font-semibold text-slate-700">{group.title}</h4>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="group/item relative flex items-center gap-3 rounded-xl bg-background px-3 py-3 hover:bg-muted"
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{item.label}</span>
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        const position = openActionMenuAt(event);
                        setFileActionMenuPosition(position);
                        setFileActionMenuId((prev) => (prev === item.id ? null : item.id));
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition group-hover/item:opacity-100 hover:bg-muted"
                      title="Tùy chọn"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {fileActionMenuId === item.id && fileActionMenuPosition && (
                      <div
                        className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl"
                        style={{ top: fileActionMenuPosition.top, left: fileActionMenuPosition.left }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            await copyText(item.url, 'Đã sao chép link file.');
                            setFileActionMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onForwardMedia?.({
                              id: `forward-file-${item.id}`,
                              senderId: currentUserId || 'me',
                              text: item.label,
                              fileUrl: item.url,
                              fileName: item.label,
                              timestamp: parseBackendDate(item.createdAt) ?? new Date(),
                              isOwn: true,
                            });
                            setFileActionMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Chuyển tiếp
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void jumpToOriginalMessage(item.id, item.url);
                            setFileActionMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Xem tin nhắn gốc
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            downloadMedia(item.url, item.label);
                            setFileActionMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Lưu về máy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {renderTabLoadingFooter()}
      </>
    ) : (
      <EmptyInfoTab icon={<FileText className="h-5 w-5" />} text="Chưa có file" />
    )
  );

  const renderLinkList = () => (
    linkItems.length > 0 ? (
      <>
        <div className="space-y-5">
          {groupItemsByCalendarDate(linkItems).map((group) => (
            <div key={group.key} className="space-y-2">
              <h4 className="text-[14px] font-semibold text-slate-700">{group.title}</h4>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="group/item relative flex items-center gap-3 rounded-xl bg-background px-3 py-3 hover:bg-muted"
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <LinkIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{item.host}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.url}</span>
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        const position = openActionMenuAt(event);
                        setLinkActionMenuPosition(position);
                        setLinkActionMenuId((prev) => (prev === item.id ? null : item.id));
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition group-hover/item:opacity-100 hover:bg-muted"
                      title="Tùy chọn"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {linkActionMenuId === item.id && linkActionMenuPosition && (
                      <div
                        className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl"
                        style={{ top: linkActionMenuPosition.top, left: linkActionMenuPosition.left }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            await copyText(item.url, 'Đã sao chép link.');
                            setLinkActionMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onForwardMedia?.({
                              id: `forward-link-${item.id}`,
                              senderId: currentUserId || 'me',
                              text: item.url,
                              timestamp: parseBackendDate(item.createdAt) ?? new Date(),
                              isOwn: true,
                            });
                            setLinkActionMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Chuyển tiếp
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void jumpToOriginalMessage(item.id, item.url);
                            setLinkActionMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Xem tin nhắn gốc
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            window.open(item.url, '_blank', 'noopener,noreferrer');
                            setLinkActionMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[15px] text-foreground hover:bg-muted"
                        >
                          Mở liên kết
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {renderTabLoadingFooter()}
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

  if (infoView === 'search') {
    return (
      <aside
        className="hidden h-full min-h-0 w-[320px] shrink-0 overflow-hidden border-l border-border bg-card xl:flex xl:flex-col"
        style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
      >
        {renderMessageSearchView()}
      </aside>
    );
  }

  if (isGroupChat && infoView === 'overview') {
    const toggleGroupSection = (section: keyof typeof groupSectionsOpen) => {
      setGroupSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
    };
    const sortedMembers = [...groupMembers]
      .filter((member) => member.memberStatus !== 'PENDING')
      .sort((a, b) => {
      if (a.id === groupCreatorId) return -1;
      if (b.id === groupCreatorId) return 1;
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.name.localeCompare(b.name, 'vi');
    });
    const pendingMembers = [...groupMembers]
      .filter((member) => member.memberStatus === 'PENDING')
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    const approvedMemberCount = groupMembers.filter((member) => member.memberStatus !== 'PENDING').length;

    const renderGroupSectionHeader = (
      section: keyof typeof groupSectionsOpen,
      label: string,
    ) => (
      <button
        type="button"
        onClick={() => toggleGroupSection(section)} className="flex min-h-[56px] w-full items-center justify-between rounded-lg px-3 text-left hover:bg-muted"
      >
        <span className="text-[15px] font-semibold text-foreground">{label}</span>
        <ChevronUp className={`h-4.5 w-4.5 text-foreground transition-transform ${groupSectionsOpen[section] ? '' : 'rotate-180'}`} />
      </button>
    );

    return (
      <>
      <aside
        className="hidden h-full min-h-0 w-[320px] shrink-0 overflow-y-auto border-l border-border bg-card px-4 py-4 xl:flex xl:flex-col"
        style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
      >
        <div className="shrink-0 px-1 pb-5 text-center">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="mx-auto block cursor-pointer"
            title={isGroupChat ? user.name : 'Xem trang cá nhân'}
          >
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatar}
              userId={user.id}
              variant={isGroupChat ? 'group' : 'user'}
              rounded="full"
              className="mx-auto h-24 w-24"
            />
          </button>
          <h3 className="mt-3 truncate text-lg font-semibold tracking-tight text-foreground">{user.name}</h3>
          <p className="text-xs text-muted-foreground">
            {approvedMemberCount} thành viên
            {isGroupCreator && pendingMembers.length > 0 ? ` · ${pendingMembers.length} chờ duyệt` : ''}
          </p>
        </div>

        {renderQuickActions()}

        <div className="space-y-2">
          {renderGroupSectionHeader('info', 'Thông tin về đoạn chat')}
          {groupSectionsOpen.info && (
            <div className="px-3 pb-3 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={onOpenPinnedMessages}
                className="flex w-full items-center gap-3 rounded-lg py-2 text-left text-foreground hover:bg-muted cursor-pointer"
                title="Xem tin nhắn đã ghim"
              >
                <Pin className="h-5 w-5 shrink-0 fill-gray-900 text-foreground" />
                <span className="text-[15px] font-semibold">Xem tin nhắn đã ghim</span>
              </button>
            </div>
          )}

          {renderGroupSectionHeader('customize', 'Tùy chỉnh đoạn chat')}
          {groupSectionsOpen.customize && (
            <div className="space-y-1 px-3 pb-3 text-sm text-foreground">
              <button type="button" onClick={onOpenRenameGroup} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-muted cursor-pointer">
                <Pencil className="h-5 w-5 shrink-0 text-foreground" />
                <span className="text-[15px] font-semibold">Đổi tên đoạn chat</span>
              </button>
              <button type="button" onClick={onOpenChangeGroupImage} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-muted cursor-pointer">
                <ImagePlus className="h-5 w-5 shrink-0 text-foreground" />
                <span className="text-[15px] font-semibold">Thay đổi ảnh</span>
              </button>
              <button type="button" onClick={onOpenNicknames} className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-muted cursor-pointer">
                <Type className="h-5 w-5 shrink-0 text-foreground" />
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

          {canManageMemberApproval && (
            <>
              {renderGroupSectionHeader('options', 'Tùy chọn nhóm')}
              {groupSectionsOpen.options && (
                <div className="space-y-2 px-3 pb-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3 rounded-lg py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-foreground">Phê duyệt thành viên</p>
                      <p className="text-xs text-muted-foreground">
                        Thành viên tham gia qua liên kết hoặc được mời cần được bạn duyệt. Người do quản trị viên thêm sẽ vào nhóm ngay.
                      </p>
                    </div>
                    <Switch
                      checked={memberApprovalRequired}
                      onCheckedChange={(checked) => onMemberApprovalChange?.(checked)}
                      aria-label="Phê duyệt thành viên"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {renderGroupSectionHeader('joinLink', 'Liên kết tham gia')}
          {groupSectionsOpen.joinLink && (
            <div className="space-y-3 px-3 pb-3 text-sm">
              {joinLinkLoading ? (
                <p className="text-muted-foreground">Đang tải liên kết...</p>
              ) : joinLink ? (
                <>
                  <div className="relative">
                    <input
                      readOnly
                      value={joinLink}
                      className="w-full rounded-xl border border-border bg-muted py-2 pl-3 pr-10 text-xs text-foreground outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Sao chép liên kết"
                      title="Sao chép liên kết"
                      onClick={() => {
                        void navigator.clipboard.writeText(joinLink).then(
                          () => toast.success('Đã sao chép liên kết tham gia.'),
                          () => toast.error('Không thể sao chép liên kết.'),
                        );
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-200 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  {memberApprovalRequired && (
                    <p className="text-xs text-muted-foreground">
                      Người tham gia qua liên kết này cần được quản trị viên phê duyệt trước khi vào nhóm.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Không thể tải liên kết tham gia.</p>
              )}
            </div>
          )}

          {renderGroupSectionHeader('members', 'Thành viên trong đoạn chat')}
          {groupSectionsOpen.members && (
            <div className="space-y-3 px-3 pb-3 pt-1">
              {isGroupCreator && pendingMembers.length > 0 && (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Chờ phê duyệt ({pendingMembers.length})
                  </p>
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <UserAvatar
                        name={member.name}
                        avatarUrl={member.avatar}
                        userId={member.id}
                        rounded="full"
                        className="h-10 w-10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-foreground">{member.name}</p>
                        <p className="truncate text-sm text-amber-700 dark:text-amber-300">Đang chờ phê duyệt</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onApproveMember?.(member.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                          title="Duyệt"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectMember?.(member.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-gray-200 hover:bg-muted cursor-pointer dark:ring-gray-700"
                          title="Từ chối"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sortedMembers.map((member) => {
                const isCreator = member.id === groupCreatorId;
                const isCurrentUser = member.id === currentUserId;
                const subtitle = isCreator ? 'Quản trị viên' : isCurrentUser ? 'Bạn' : 'Do bạn thêm';
                const canShowMemberMenu = isGroupCreator && !isCreator;

                return (
                  <div key={member.id} className="relative flex items-center gap-3">
                      <UserAvatar
                        name={member.name}
                        avatarUrl={member.avatar}
                        userId={member.id}
                        rounded="full"
                        className="h-10 w-10"
                      />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-foreground">{member.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                    </div>
                    {canShowMemberMenu && (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            const menuWidth = 256;
                            const viewportPadding = 8;
                            const left = Math.min(
                              Math.max(viewportPadding, rect.right - menuWidth),
                              window.innerWidth - menuWidth - viewportPadding,
                            );
                            const top = Math.min(rect.bottom + 6, window.innerHeight - 120);
                            setMemberActionMenuPosition({ top, left });
                            setMemberActionMenuId((prev) => (prev === member.id ? null : member.id));
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted cursor-pointer"
                          title="Tùy chọn thành viên"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        {memberActionMenuId === member.id && memberActionMenuPosition && (
                          <div
                            className="fixed z-[350] w-64 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl"
                            style={{ top: memberActionMenuPosition.top, left: memberActionMenuPosition.left }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onRequestRemoveMember?.(member.id, member.name);
                                setMemberActionMenuId(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-[15px] text-red-600 hover:bg-muted dark:text-red-400"
                            >
                              Xóa thành viên ra khỏi nhóm
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={onOpenAddMembers}
                className="flex w-full items-center gap-3 rounded-lg py-1 text-left hover:bg-muted cursor-pointer"
                title="Thêm người"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground">
                  <UserPlus className="h-5 w-5" />
                </span>
                <span className="text-[15px] font-semibold text-foreground">Thêm người</span>
              </button>
            </div>
          )}

          <section>
            <button
              type="button"
              className="flex min-h-[56px] w-full items-center justify-between rounded-lg px-3 text-left hover:bg-muted cursor-pointer"
              onClick={() => setIsMediaSectionOpen((prev) => !prev)}
            >
              <span className="text-[15px] font-semibold text-foreground">Phương tiện, File, Link</span>
              <ChevronUp className={`h-4.5 w-4.5 text-foreground transition-transform ${isMediaSectionOpen ? '' : 'rotate-180'}`} />
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
                  <ImageIcon className="h-5 w-5 text-foreground" />
                  <span className="text-[15px] font-semibold text-foreground">Phương tiện</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('files');
                    setInfoView('files');
                  }} className="flex w-full items-center gap-4 text-left"
                >
                  <FileText className="h-5 w-5 text-foreground" />
                  <span className="text-[15px] font-semibold text-foreground">File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('links');
                    setInfoView('files');
                  }} className="flex w-full items-center gap-4 text-left"
                >
                  <LinkIcon className="h-5 w-5 text-foreground" />
                  <span className="text-[15px] font-semibold text-foreground">Link</span>
                </button>
              </div>
            )}
          </section>

          <div className="mt-4 space-y-2 border-t border-border px-1 pt-4">
            {isGroupCreator && (
              <button
                type="button"
                onClick={onDissolveGroup}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
              >
                Giải tán nhóm
              </button>
            )}
            <button
              type="button"
              onClick={onLeaveGroup}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
            >
              Rời nhóm
            </button>
          </div>
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
            {activeLightboxMedia.type === 'video' ? (
              <video
                src={activeLightboxMedia.url}
                controls
                autoPlay
                playsInline
                className="max-h-[92vh] max-w-[92vw] object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              <img
                src={activeLightboxMedia.url}
                alt="Media"
                className="max-h-[92vh] max-w-[92vw] object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            )}
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
      className="hidden xl:flex h-full min-h-0 w-[320px] shrink-0 overflow-hidden border-l border-border bg-card flex-col"
      style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      {infoView === 'overview' ? (
        <div className="flex h-full min-h-0 flex-col px-5 py-5">
          <div className="shrink-0 text-center">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="mx-auto block cursor-pointer"
              title="Xem trang cá nhân"
            >
              <UserAvatar
                name={user.name}
                avatarUrl={user.avatar}
                userId={user.id}
                rounded="full"
                className="w-24 h-24 mx-auto"
              />
            </button>
            <h3 className="mt-3 text-lg font-semibold text-foreground tracking-tight">{user.name}</h3>
            {formatLastActiveLabel(user.isOnline, user.lastActiveAt) ? (
              <p className="text-xs text-muted-foreground">{formatLastActiveLabel(user.isOnline, user.lastActiveAt)}</p>
            ) : null}
          </div>

          <div className="mt-6">{renderQuickActions()}</div>

          <section className="mt-8 shrink-0">
            <button
              type="button"
              className="flex w-full items-center justify-between py-2 text-left cursor-pointer"
              onClick={() => setIsMediaSectionOpen((prev) => !prev)}
            >
              <span className="text-[15px] font-semibold text-foreground">Phương tiện, File, Link</span>
              <ChevronUp className={`h-4.5 w-4.5 text-foreground transition-transform ${isMediaSectionOpen ? '' : 'rotate-180'}`} />
            </button>
            {isMediaSectionOpen && <div className="mt-4 space-y-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('media');
                  setInfoView('files');
                }} className="flex w-full items-center gap-4 text-left"
              >
                <ImageIcon className="h-5 w-5 text-foreground" />
                <span className="text-[15px] font-semibold text-foreground">Phương tiện</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('files');
                  setInfoView('files');
                }} className="flex w-full items-center gap-4 text-left"
              >
                <FileText className="h-5 w-5 text-foreground" />
                <span className="text-[15px] font-semibold text-foreground">File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('links');
                  setInfoView('files');
                }} className="flex w-full items-center gap-4 text-left"
              >
                <LinkIcon className="h-5 w-5 text-foreground" />
                <span className="text-[15px] font-semibold text-foreground">Link</span>
              </button>
            </div>}
          </section>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col px-5 py-5">
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setInfoView('overview')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
              title="Quay lại"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h3 className="text-lg font-semibold text-foreground">Phương tiện, File, Link</h3>
          </div>

          <div className="mt-8 grid shrink-0 grid-cols-3 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('media')} className={`pb-3 text-center text-sm font-semibold transition-colors ${ activeTab === 'media' ? 'border-b-[3px] border-emerald-600 text-emerald-600' : 'text-muted-foreground hover:text-foreground dark:hover:text-gray-100' }`}
            >
              Phương tiện
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('files')} className={`pb-3 text-center text-sm font-semibold transition-colors ${ activeTab === 'files' ? 'border-b-[3px] border-emerald-600 text-emerald-600' : 'text-muted-foreground hover:text-foreground dark:hover:text-gray-100' }`}
            >
              File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('links')} className={`pb-3 text-center text-sm font-semibold transition-colors ${ activeTab === 'links' ? 'border-b-[3px] border-emerald-600 text-emerald-600' : 'text-muted-foreground hover:text-foreground dark:hover:text-gray-100' }`}
            >
              Link
            </button>
          </div>

          <div
            ref={tabContentRef}
            className="min-h-0 flex-1 overflow-y-auto pt-5"
            onScroll={handleTabContentScroll}
          >
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
          {activeLightboxMedia.type === 'video' ? (
            <video
              src={activeLightboxMedia.url}
              controls
              autoPlay
              playsInline
              className="max-h-[92vh] max-w-[92vw] object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              src={activeLightboxMedia.url}
              alt="Media"
              className="max-h-[92vh] max-w-[92vw] object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          )}
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
    <div className="flex flex-col items-center justify-center rounded-xl bg-background px-4 py-8 text-center text-sm text-muted-foreground">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm dark:shadow-none">
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
    isRefreshing: isRefreshingConversations,
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
  const [isChatInfoPanelOpen, setIsChatInfoPanelOpen] = useState(true);
  const [pinnedConversationUserIds, setPinnedConversationUserIds] = useState<string[]>([]);
  const [fetchedChatUser, setFetchedChatUser] = useState<ChatUser | null>(null);
  const [isFetchingChatUser, setIsFetchingChatUser] = useState(false);
  const [isMessagingBlocked, setIsMessagingBlocked] = useState(false);
  const [isConvLocked, setIsConvLocked] = useState(false);
  const [serverGroupConversations, setServerGroupConversations] = useState<Conversation[]>([]);
  const [groupConversationsReady, setGroupConversationsReady] = useState(false);
  const [groupMembersById, setGroupMembersById] = useState<Record<string, ChatUser[]>>({});
  const [groupCreatorById, setGroupCreatorById] = useState<Record<string, string>>({});
  const [groupMemberApprovalById, setGroupMemberApprovalById] = useState<Record<string, boolean>>({});
  const [leaveGroupModalMode, setLeaveGroupModalMode] = useState<'confirm' | 'transfer' | null>(null);
  const [isDissolveGroupModalOpen, setIsDissolveGroupModalOpen] = useState(false);
  const [isDissolvingGroup, setIsDissolvingGroup] = useState(false);
  const [groupJoinModalToken, setGroupJoinModalToken] = useState<string | null>(null);
  const [leaveGroupNewAdminId, setLeaveGroupNewAdminId] = useState('');
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingGroupMember, setIsRemovingGroupMember] = useState(false);
  const joinTokenHandledRef = useRef<string | null>(null);
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
    if (conv) {
      return {
        id: conv.user.id,
        name: conv.user.name,
        avatar: conv.user.avatar,
        isOnline: conv.user.isOnline ?? false,
        lastActiveAt: conv.user.lastActiveAt,
      };
    }
    if (isActiveGroupChat) return null;
    return fetchedChatUser;
  }, [activeChatUserId, conversations, fetchedChatUser, isActiveGroupChat]);

  useEffect(() => {
    if (!activeChatUserId || isActiveGroupChat) {
      setFetchedChatUser(null);
      setIsFetchingChatUser(false);
      return;
    }
    if (conversations.some((conversation) => conversation.user.id === activeChatUserId)) {
      setFetchedChatUser(null);
      setIsFetchingChatUser(false);
      return;
    }

    let cancelled = false;
    setIsFetchingChatUser(true);
    void authService
      .getUserById(activeChatUserId)
      .then((user) => {
        if (cancelled) return;
        setFetchedChatUser({
          id: user.id,
          name: user.fullName?.trim() || user.username || 'Người dùng',
          avatar: resolveUserAvatarUrl(user.avatarUrl) || '',
          isOnline: false,
        });
      })
      .catch(() => {
        if (!cancelled) setFetchedChatUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsFetchingChatUser(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeChatUserId, conversations, isActiveGroupChat]);

  useEffect(() => {
    if (!activeChatUserId || isActiveGroupChat) {
      setIsMessagingBlocked(false);
      setIsConvLocked(false);
      return;
    }

    let cancelled = false;
    void userSettingsApi
      .getBlockStatus(activeChatUserId)
      .then((status) => {
        if (!cancelled) {
          setIsMessagingBlocked(status.blockedByMe);
          setIsConvLocked(status.conversationLocked || false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsMessagingBlocked(false);
          setIsConvLocked(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeChatUserId, isActiveGroupChat]);

  const activeChatThemeColor = useMemo(() => {
    if (!activeChatUserId) return null;
    return conversations.find((conversation) => conversation.user.id === activeChatUserId)?.themeColor ?? null;
  }, [activeChatUserId, conversations]);

  // Keep the last known chat user so the window stays visible while switching chats
  if (activeChatUser) {
    lastActiveChatUserRef.current = activeChatUser;
  }

  const activePrivateConversation = useMemo(() => {
    if (!activeChatUserId || isActiveGroupChat) return null;
    return conversations.find((conversation) => conversation.user.id === activeChatUserId) ?? null;
  }, [activeChatUserId, conversations, isActiveGroupChat]);

  const effectiveChatUser: ChatUser | null =
    activeChatUser ??
    (lastActiveChatUserRef.current?.id === activeChatUserId ? lastActiveChatUserRef.current : null);

  const isAcceptedFriendChat = Boolean(activePrivateConversation && !activePrivateConversation.isStranger);
  const isStrangerChat = !isActiveGroupChat && Boolean(effectiveChatUser) && !isAcceptedFriendChat;
  const canMessage = Boolean(isActiveGroupChat || effectiveChatUser) && !isMessagingBlocked && !isConvLocked;
  const messagingDisabledReason = isConvLocked
    ? 'Cuộc hội thoại này đã bị khóa bởi quản trị viên'
    : isMessagingBlocked
    ? 'Bạn đã chặn người này nên không thể nhắn tin'
    : 'Bạn không thể nhắn tin với người này';
  const canStartCalls = (isActiveGroupChat || isAcceptedFriendChat) && !isMessagingBlocked && !isConvLocked;

  const selectableFriends = useMemo(
    () => baseConversationItems.filter((conversation) => !conversation.isStranger && !conversation.isGroup).map((c) => c.user),
    [baseConversationItems],
  );

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
        const previewText = mapContentToConversationPreview(summary?.lastMessageContent);
        const preview = previewText
          ? formatConversationPreview(previewText, summary?.lastMessageSenderId === currentUser?.id)
          : '';
        const parsed = parseBackendDate(summary?.lastMessageCreatedAt || group.createdAt);
        const timestamp = parsed ? formatRelativeConversationTime(parsed) : '';
        const lastActivityAt = parsed ? parsed.getTime() : 0;

        return {
        id: group.id,
        user: {
          id: `group:${group.id}`,
          name: group.name,
          avatar:
            group.avatarUrl?.trim() || '',
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
      const approvalMap: Record<string, boolean> = {};
      groups.forEach((group) => {
        const chatUserId = `group:${group.id}`;
        membersMap[chatUserId] = mapGroupMembersToChatUsers(group.members);
        creatorsMap[chatUserId] = group.createdBy;
        approvalMap[chatUserId] = Boolean(group.memberApprovalRequired);
      });

      setServerGroupConversations(mapped);
      setOverrides((prev) => {
        const next = { ...prev };
        mapped.forEach((conversation) => {
          const conversationId = conversation.user.id;
          const existing = prev[conversationId];
          const serverActivity = conversation.lastActivityAt ?? 0;
          const existingActivity = existing?.lastActivityAt ?? 0;
          if (existingActivity > serverActivity && existing?.lastMessage) {
            next[conversationId] = {
              ...existing,
            };
            return;
          }
          next[conversationId] = {
            ...(existing ?? {}),
            lastMessage: conversation.lastMessage,
            timestamp: conversation.timestamp,
            lastActivityAt: conversation.lastActivityAt,
          };
        });
        return next;
      });
      setGroupMembersById((prev) => ({ ...prev, ...membersMap }));
      setGroupCreatorById((prev) => ({ ...prev, ...creatorsMap }));
      setGroupMemberApprovalById((prev) => ({ ...prev, ...approvalMap }));
    } catch {
      // keep current state on failure
    } finally {
      setGroupConversationsReady(true);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadGroupConversations();
  }, [loadGroupConversations]);

  useEffect(() => {
    const token = searchParams.get('join');
    if (!token || !currentUser?.id) return;
    if (joinTokenHandledRef.current === token) return;
    joinTokenHandledRef.current = token;
    setGroupJoinModalToken(token);
    setSearchParams({}, { replace: true });
  }, [currentUser?.id, searchParams, setSearchParams]);

  const handleGroupJoinLinkClick = useCallback((token: string) => {
    setGroupJoinModalToken(token);
  }, []);

  const handleGroupJoinedFromLink = useCallback(
    async (conversationId: string) => {
      await loadGroupConversations();
      setSearchParams({ with: `group:${conversationId}` });
      toast.success('Bạn đã tham gia nhóm chat.');
    },
    [loadGroupConversations, setSearchParams],
  );

  const handleOpenGroupFromJoinLink = useCallback(
    (conversationId: string) => {
      setSearchParams({ with: `group:${conversationId}` });
    },
    [setSearchParams],
  );

  const applyGroupConversationResponse = useCallback((group: Awaited<ReturnType<typeof chatService.getMyGroupConversations>>[number]) => {
    const chatUserId = `group:${group.id}`;
    const conversation: Conversation = {
      id: group.id,
      user: {
        id: chatUserId,
        name: group.name,
        avatar:
          group.avatarUrl?.trim() || '',
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
      [chatUserId]: mapGroupMembersToChatUsers(group.members),
    }));
    setGroupCreatorById((prev) => ({ ...prev, [chatUserId]: group.createdBy }));
    setGroupMemberApprovalById((prev) => ({ ...prev, [chatUserId]: Boolean(group.memberApprovalRequired) }));
  }, [overrides]);

  const refreshGroupMembers = useCallback(async (conversationId: string) => {
    try {
      const groups = await chatService.getMyGroupConversations();
      const group = groups.find((item) => item.id === conversationId);
      if (!group) return;
      applyGroupConversationResponse(group);
    } catch {
      // keep current member list on failure
    }
  }, [applyGroupConversationResponse]);

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
              lastMessage: buildConversationPreviewFromContent(last.text, last.senderId, currentUser.id, {
                deleted: last.deleted,
                status: last.status,
              }),
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

      const previewMessage = buildConversationPreviewFromContent(msg.content, msg.senderId, myId, {
        deleted: msg.deleted,
        status: msg.status,
      });

      setOverrides((prev) => {
        const prevOverride = prev[otherUserId];
        // A moderation/recall update can arrive for a message that is no longer the
        // conversation's latest — don't let it clobber a newer preview that's already shown.
        const isStillLatest =
          !prevOverride?.lastActivityAt || newMsg.timestamp.getTime() >= prevOverride.lastActivityAt;
        return {
          ...prev,
          [otherUserId]: {
            ...(prevOverride ?? {}),
            ...(previewMessage && isStillLatest
              ? {
                  lastMessage: previewMessage,
                  timestamp: 'Vừa xong',
                  lastActivityAt: newMsg.timestamp.getTime(),
                }
              : {}),
            isUnread: activeChatUserId !== otherUserId,
          },
        };
      });

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

      if (
        msg.conversationId &&
        newMsg.systemType === 'chat_action' &&
        newMsg.systemActionType &&
        MEMBERSHIP_CHAT_ACTIONS.has(newMsg.systemActionType)
      ) {
        void refreshGroupMembers(msg.conversationId);
      }

      if (msg.senderId !== myId && !msg.conversationId) {
        sendMessageDelivered(msg.id);
        if (activeChatUserId === otherUserId) {
          sendConversationSeen(otherUserId);
        }
      }
    },
    [activeChatUserId, currentUser?.id, refreshGroupMembers, sendConversationSeen, sendMessageDelivered],
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

  const handleToggleChatInfoPanel = useCallback(() => {
    setIsChatInfoPanelOpen((prev) => !prev);
  }, []);

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
    if (message.videoUrl) {
      return `${VIDEO_MESSAGE_PREFIX}${JSON.stringify({
        videoUrl: message.videoUrl,
        durationSec: message.videoDurationSec,
        mimeType: message.videoMimeType,
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
      applyGroupConversationResponse(updated);
      const needsApproval = selectedAddGroupMemberIds.some((id) =>
        updated.members.some((member) => member.userId === id && member.memberStatus === 'PENDING'),
      );
      setIsAddGroupMembersOpen(false);
      setSelectedAddGroupMemberIds([]);
      setAddGroupMemberSearch('');
      toast.success(
        needsApproval
          ? 'Đã mời thành viên — đang chờ quản trị viên duyệt.'
          : 'Đã thêm thành viên vào nhóm.',
      );
    } catch (error: any) {
      toast.error(error?.message || 'Không thể thêm thành viên.');
    } finally {
      setIsAddingGroupMembers(false);
    }
  }, [activeChatUserId, applyGroupConversationResponse, selectedAddGroupMemberIds]);

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
        avatarUrl: '',
        memberIds: selectedGroupMemberIds,
      });

      const chatUserId = `group:${created.id}`;
      const conversation: Conversation = {
        id: created.id,
        user: {
          id: chatUserId,
          name: created.name,
          avatar:
            created.avatarUrl?.trim() || '',
          isOnline: false,
        },
        lastMessage: 'Chưa có tin nhắn',
        timestamp: formatRelativeConversationTime(created.createdAt) || 'Vừa xong',
        lastActivityAt: parseBackendDate(created.createdAt)?.getTime() ?? Date.now(),
        isUnread: false,
        isGroup: true,
      };

      const memberProfiles: ChatUser[] = created.members.map((m) => ({
        id: m.userId,
        name: m.fullName || m.username || 'Người dùng',
        avatar:
          m.avatarUrl?.trim() || '',
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
    if (!connected) {
      toast.error('Chưa kết nối realtime. Vui lòng đợi vài giây rồi thử lại.');
      return;
    }
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
  }, [activeChatUser?.avatar, activeChatUser?.name, activeChatUserId, connected, currentUser, groupMembersById, voiceCall]);

  const handleStartVideoCall = useCallback(() => {
    if (!activeChatUserId) return;
    if (!connected) {
      toast.error('Chưa kết nối realtime. Vui lòng đợi vài giây rồi thử lại.');
      return;
    }
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
  }, [activeChatUser?.avatar, activeChatUser?.name, activeChatUserId, connected, currentUser, groupMembersById, voiceCall]);

  const handleCallAgain = useCallback(
    (mediaType?: 'audio' | 'video') => {
      // Mặc định luôn là thoại nếu không truyền rõ — tránh gọi nhầm video.
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
    { key: 'strangers', label: 'Người lạ' },
  ];

  const filteredConversations = conversations
    .filter((conv) => {
      if (activeFilter === 'unread' && !conv.isUnread) return false;
      if (activeFilter === 'strangers' && !conv.isStranger) return false;
      if (activeFilter === 'all' && conv.isStranger) return false;
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

  const handleToggleMemberApproval = useCallback(async (enabled: boolean) => {
    if (!activeChatUserId?.startsWith('group:') || !isActiveGroupCreator) return;
    const conversationId = activeChatUserId.replace('group:', '');
    const previousValue = groupMemberApprovalById[activeChatUserId] ?? false;
    setGroupMemberApprovalById((prev) => ({ ...prev, [activeChatUserId]: enabled }));
    try {
      const updated = await chatService.updateGroupConversation(conversationId, { memberApprovalRequired: enabled });
      applyGroupConversationResponse(updated);
      toast.success(enabled ? 'Đã bật phê duyệt thành viên.' : 'Đã tắt phê duyệt thành viên.');
    } catch {
      setGroupMemberApprovalById((prev) => ({ ...prev, [activeChatUserId]: previousValue }));
      toast.error('Không thể cập nhật cài đặt phê duyệt.');
    }
  }, [activeChatUserId, applyGroupConversationResponse, groupMemberApprovalById, isActiveGroupCreator]);

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

  const removeGroupConversation = useCallback(
    (chatUserId: string) => {
      setServerGroupConversations((prev) => prev.filter((item) => item.user.id !== chatUserId));
      setGroupMembersById((prev) => {
        const next = { ...prev };
        delete next[chatUserId];
        return next;
      });
      setGroupCreatorById((prev) => {
        const next = { ...prev };
        delete next[chatUserId];
        return next;
      });
      setGroupMemberApprovalById((prev) => {
        const next = { ...prev };
        delete next[chatUserId];
        return next;
      });
      if (activeChatUserId === chatUserId) {
        setSearchParams({});
      }
    },
    [activeChatUserId, setSearchParams],
  );

  const executeLeaveGroup = useCallback(
    async (newAdminUserId?: string) => {
      if (!activeChatUserId?.startsWith('group:')) return;
      const conversationId = activeChatUserId.replace('group:', '');
      const chatUserId = activeChatUserId;
      setIsLeavingGroup(true);
      setSearchParams({});
      try {
        await chatService.leaveGroupConversation(
          conversationId,
          newAdminUserId ? { newAdminUserId } : undefined,
        );
        removeGroupConversation(chatUserId);
        setLeaveGroupModalMode(null);
        toast.success('Đã rời nhóm.');
      } catch (error) {
        setSearchParams({ with: chatUserId });
        toast.error(error instanceof Error ? error.message : 'Không thể rời nhóm.');
      } finally {
        setIsLeavingGroup(false);
      }
    },
    [activeChatUserId, removeGroupConversation, setSearchParams],
  );

  const handleLeaveGroupClick = useCallback(() => {
    if (!activeChatUserId?.startsWith('group:')) return;
    if (isActiveGroupCreator) {
      const approvedMembers = (groupMembersById[activeChatUserId] ?? []).filter(
        (member) => member.memberStatus !== 'PENDING' && member.id !== currentUser?.id,
      );
      if (approvedMembers.length === 0) {
        toast.error('Không còn thành viên khác để chuyển quyền quản trị.');
        return;
      }
      setLeaveGroupNewAdminId(approvedMembers[0]?.id ?? '');
      setLeaveGroupModalMode('transfer');
      return;
    }
    setLeaveGroupModalMode('confirm');
  }, [activeChatUserId, currentUser?.id, groupMembersById, isActiveGroupCreator]);

  const handleDissolveGroupClick = useCallback(() => {
    if (!activeChatUserId?.startsWith('group:') || !isActiveGroupCreator) return;
    setIsDissolveGroupModalOpen(true);
  }, [activeChatUserId, isActiveGroupCreator]);

  const executeDissolveGroup = useCallback(async () => {
    if (!activeChatUserId?.startsWith('group:')) return;
    const conversationId = activeChatUserId.replace('group:', '');
    setIsDissolvingGroup(true);
    try {
      await chatService.dissolveGroupConversation(conversationId);
      removeGroupConversation(activeChatUserId);
      setIsDissolveGroupModalOpen(false);
      toast.success('Đã giải tán nhóm chat.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể giải tán nhóm.');
    } finally {
      setIsDissolvingGroup(false);
    }
  }, [activeChatUserId, removeGroupConversation]);

  const handleApproveGroupMember = useCallback(async (memberUserId: string) => {
    if (!activeChatUserId?.startsWith('group:') || !isActiveGroupCreator) return;
    const conversationId = activeChatUserId.replace('group:', '');
    try {
      const updated = await chatService.approveGroupMember(conversationId, memberUserId);
      applyGroupConversationResponse(updated);
      toast.success('Đã phê duyệt thành viên.');
    } catch {
      toast.error('Không thể phê duyệt thành viên.');
    }
  }, [activeChatUserId, applyGroupConversationResponse, isActiveGroupCreator]);

  const handleRejectGroupMember = useCallback(async (memberUserId: string) => {
    if (!activeChatUserId?.startsWith('group:') || !isActiveGroupCreator) return;
    const conversationId = activeChatUserId.replace('group:', '');
    try {
      const updated = await chatService.rejectGroupMember(conversationId, memberUserId);
      applyGroupConversationResponse(updated);
      toast.success('Đã từ chối thành viên.');
    } catch {
      toast.error('Không thể từ chối thành viên.');
    }
  }, [activeChatUserId, applyGroupConversationResponse, isActiveGroupCreator]);

  const handleRequestRemoveGroupMember = useCallback((memberUserId: string, memberName: string) => {
    if (!activeChatUserId?.startsWith('group:') || !isActiveGroupCreator) return;
    setRemoveMemberTarget({ id: memberUserId, name: memberName });
  }, [activeChatUserId, isActiveGroupCreator]);

  const executeRemoveGroupMember = useCallback(async () => {
    if (!activeChatUserId?.startsWith('group:') || !removeMemberTarget) return;
    const conversationId = activeChatUserId.replace('group:', '');
    setIsRemovingGroupMember(true);
    try {
      const updated = await chatService.removeGroupMember(conversationId, removeMemberTarget.id);
      applyGroupConversationResponse(updated);
      setRemoveMemberTarget(null);
      toast.success('Đã xóa thành viên khỏi nhóm.');
    } catch {
      toast.error('Không thể xóa thành viên khỏi nhóm.');
    } finally {
      setIsRemovingGroupMember(false);
    }
  }, [activeChatUserId, applyGroupConversationResponse, removeMemberTarget]);

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
      className="h-screen bg-background overflow-hidden"
      style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      <Header />


      <div className="flex h-[calc(100vh-56px)] mt-14 overflow-hidden p-2 gap-2">
        <div
          className={`bg-card border border-border rounded-xl flex flex-col transition-all duration-300 ease-in-out ${ activeChatUser ? 'w-0 -translate-x-full lg:w-[380px] lg:translate-x-0' : 'w-[380px]' }`}
        >
          <div className="flex flex-col h-full min-w-[380px]">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-[1.75rem] font-semibold tracking-tight">Đoạn chat</h1>
                  <span
                    className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted'}`}
                    title={connected ? 'Đã kết nối realtime' : 'Chưa kết nối'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadFriends}
                    disabled={isRefreshingConversations}
                    className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                    title="Tải lại danh sách"
                  >
                    <RefreshCw className={`w-5 h-5 text-muted-foreground ${isRefreshingConversations ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsCreateGroupOpen(true)} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                    title="Tạo nhóm chat"
                  >
                    <UserRoundPlus className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm trên Messenger"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background text-foreground placeholder:text-muted-foreground rounded-full text-sm outline-none focus:bg-muted transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${ activeFilter === filter.key ? filter.key === 'strangers' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-600' : 'bg-background text-muted-foreground hover:bg-muted' }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingConversations && conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>
              ) : friendsError ? (
                <div className="text-center py-8 text-sm">
                  <p className="text-red-500 mb-2">Không thể tải danh sách bạn bè</p>
                  <button onClick={loadFriends} className="text-emerald-500 hover:underline text-sm cursor-pointer">
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
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {activeFilter === 'strangers'
                    ? 'Chưa có tin nhắn từ người lạ.'
                    : conversations.length === 0
                      ? 'Chưa có đoạn chat nào.'
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
                canMessage={canMessage}
                messagingDisabledReason={messagingDisabledReason}
                isStrangerChat={isStrangerChat}
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
                  !canStartCalls
                    ? false
                    : !voiceCall.hasActiveCall && !voiceCall.isRinging
                      ? true
                      : voiceCall.activePeerUserId === effectiveChatUser.id ||
                        (isActiveGroupChat &&
                          voiceCall.activeGroupConversationId === effectiveChatUser.id.replace('group:', ''))
                }
                canStartVideoCall={canStartCalls && !voiceCall.hasActiveCall && !voiceCall.isRinging}
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
                onGroupJoinLinkClick={handleGroupJoinLinkClick}
                isChatInfoOpen={isChatInfoPanelOpen}
                onToggleChatInfo={handleToggleChatInfoPanel}
              />
            </div>
          ) : activeChatUserId && (loadingConversations || isFetchingChatUser || (isActiveGroupChat && !effectiveChatUser && !groupConversationsReady)) ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm bg-card rounded-xl border border-border">
              Đang tải...
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-card rounded-xl border border-border">
              <div className="text-center px-6">
                <div className="w-24 h-24 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="w-12 h-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Tin nhắn của bạn</h2>
                <p className="text-muted-foreground text-sm">Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
              </div>
            </div>
          )}

          {effectiveChatUser && isChatInfoPanelOpen && (
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
              memberApprovalRequired={activeChatUserId ? Boolean(groupMemberApprovalById[activeChatUserId]) : false}
              canManageMemberApproval={isActiveGroupCreator}
              onMemberApprovalChange={handleToggleMemberApproval}
              onRequestRemoveMember={handleRequestRemoveGroupMember}
              onApproveMember={handleApproveGroupMember}
              onRejectMember={handleRejectGroupMember}
              onLeaveGroup={handleLeaveGroupClick}
              onDissolveGroup={handleDissolveGroupClick}
              isGroupCreator={isActiveGroupCreator}
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
            className={`flex max-h-[86vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl ${ groupSettingsModal === 'rename' ? 'max-w-[620px]' : 'max-w-[620px]' }`}
          >
            <div className="relative flex min-h-[70px] shrink-0 items-center justify-center border-b border-border px-5 py-3">
              <h3 className="text-[24px] font-bold leading-tight text-foreground">
                {groupSettingsModal === 'rename'
                  ? 'Đổi tên đoạn chat'
                  : groupSettingsModal === 'image'
                    ? 'Thay đổi ảnh'
                    : 'Biệt danh'}
              </h3>
              <button
                type="button"
                onClick={() => setGroupSettingsModal(null)}
                disabled={isGroupSettingsBusy} className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted disabled:opacity-60"
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
                <p className="mb-3 px-1 text-[17px] leading-6 text-foreground">
                  Mọi người đều biết khi tên nhóm chat thay đổi.
                </p>

                <label className="block rounded-[18px] border border-emerald-600 px-5 pb-3 pt-4 shadow-[0_0_0_2px_#10b981]">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-[13px] leading-4 text-emerald-600">Tên đoạn chat</span>
                    <span className="text-[15px] leading-4 text-muted-foreground">{groupNameDraft.length}/500</span>
                  </div>
                  <input
                    value={groupNameDraft}
                    onChange={(event) => setGroupNameDraft(event.target.value.slice(0, 500))}
                    className="h-6 w-full bg-transparent text-[17px] leading-6 text-foreground outline-none"
                    autoFocus
                  />
                </label>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setGroupSettingsModal(null)}
                    disabled={isGroupSettingsBusy} className="h-10 rounded-lg px-4 text-[17px] font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
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
                    } className="h-10 rounded-lg bg-emerald-600 px-5 text-[17px] font-semibold text-white hover:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground"
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
                    className="relative overflow-hidden rounded-full border border-border bg-background"
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
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Chưa có ảnh</div>
                    )}
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground">Kéo thanh để căn ảnh trước khi lưu.</p>

                <div className="space-y-2 rounded-xl border border-border bg-background p-2.5">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Phóng to / thu nhỏ</label>
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
                    <label className="mb-1 block text-sm font-medium text-foreground">Di chuyển ngang</label>
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
                    <label className="mb-1 block text-sm font-medium text-foreground">Di chuyển dọc</label>
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
                    disabled={isGroupSettingsBusy} className="h-10 flex-1 rounded-lg border border-border bg-card text-[15px] font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={openGroupImagePicker}
                    disabled={isGroupSettingsBusy}
                    className="h-10 flex-1 rounded-lg border border-border bg-card text-[15px] font-semibold text-foreground hover:bg-muted disabled:opacity-60 cursor-pointer"
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
                    disabled={isGroupSettingsBusy || !groupImagePreview} className="h-10 flex-1 rounded-lg bg-emerald-600 text-[15px] font-semibold text-white hover:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground"
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
                        <UserAvatar
                          name={realName}
                          avatarUrl={member.avatar}
                          userId={member.id}
                          rounded="full"
                          className="h-12 w-12"
                        />
                        {editing ? (
                          <>
                            <input
                              value={nicknameDraft}
                              onChange={(event) => setNicknameDraft(event.target.value)}
                              className="h-11 min-w-0 flex-1 rounded-full bg-background px-4 text-[16px] outline-none focus:bg-muted"
                              placeholder={realName}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveNickname(member.id, nicknameDraft)}
                              disabled={isGroupSettingsBusy} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:opacity-60"
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
                              <p className="truncate text-[16px] font-semibold text-foreground">{realName}</p>
                              <p className="truncate text-sm text-muted-foreground">{member.nickname || 'Đặt biệt danh'}</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNicknameEditingUserId(member.id);
                                setNicknameDraft(member.nickname || '');
                              }} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
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
          <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">Tạo nhóm chat</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateGroupOpen(false);
                  setGroupNameInput('');
                  setSelectedGroupMemberIds([]);
                }} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Tên nhóm (tùy chọn)</label>
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="Ví dụ: Nhóm dự án KLTN"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Chọn thành viên</p>
                <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border p-2">
                  {selectableFriends.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Chưa có bạn bè để tạo nhóm chat</div>
                  ) : (
                    <div className="space-y-1">
                      {selectableFriends.map((friend) => {
                        const selected = selectedGroupMemberIds.includes(friend.id);
                        return (
                          <button
                            key={friend.id}
                            onClick={() => toggleGroupMemberSelection(friend.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                          >
                            <UserAvatar name={friend.name} avatarUrl={friend.avatar} userId={friend.id} rounded="full" className="h-9 w-9" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{friend.name}</span>
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border ${ selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border bg-card text-transparent' }`}
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

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                onClick={() => {
                  setIsCreateGroupOpen(false);
                  setGroupNameInput('');
                  setSelectedGroupMemberIds([]);
                }} className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroupChat}
                disabled={selectedGroupMemberIds.length < 2}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-muted cursor-pointer"
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddGroupMembersOpen && activeChatUserId?.startsWith('group:') && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35 p-4">
          <div className="flex max-h-[86vh] w-full max-w-[660px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="relative flex shrink-0 items-center justify-center border-b border-border px-5 py-4">
              <h3 className="text-[24px] font-bold text-foreground">Thêm người</h3>
              <button
                onClick={closeAddGroupMembersModal}
                disabled={isAddingGroupMembers}
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60 cursor-pointer"
                title="Đóng"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="shrink-0 px-5 pb-4 pt-5">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={addGroupMemberSearch}
                  onChange={(e) => setAddGroupMemberSearch(e.target.value)}
                  placeholder="Tìm kiếm"
                  className="h-11 w-full rounded-full bg-background pl-11 pr-4 text-[16px] outline-none transition-colors focus:bg-muted"
                />
              </div>

              <div className="mt-7 min-h-[112px] text-sm text-muted-foreground">
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
                            <UserAvatar
                              name={friend.name}
                              avatarUrl={friend.avatar}
                              userId={friend.id}
                              rounded="full"
                              className="h-12 w-12 border-2 border-emerald-600"
                            />
                            <button
                              type="button"
                              onClick={() => toggleAddGroupMemberSelection(id)} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-foreground shadow-sm dark:shadow-none hover:bg-muted"
                              title="Bỏ chọn"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="line-clamp-2 w-full text-sm leading-tight text-muted-foreground">{friend.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              <h4 className="mb-3 text-[24px] font-bold text-foreground">Gợi ý</h4>
              {addableGroupMembers.length === 0 ? (
                <div className="rounded-xl bg-background px-4 py-8 text-center text-sm text-muted-foreground">
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
                        onClick={() => toggleAddGroupMemberSelection(friend.id)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors ${ selected ? 'bg-muted' : 'hover:bg-muted' }`}
                      >
                        <UserAvatar name={friend.name} avatarUrl={friend.avatar} userId={friend.id} rounded="full" className="h-10 w-10" />
                        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-foreground">
                          {friend.name}
                        </span>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${ selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-500 bg-card text-transparent' }`}
                        >
                          <Check className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border px-5 py-4">
              <button
                onClick={handleAddGroupMembers}
                disabled={selectedAddGroupMemberIds.length === 0 || isAddingGroupMembers}
                className="h-11 w-full rounded-lg bg-emerald-600 text-[16px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground cursor-pointer"
              >
                {isAddingGroupMembers ? 'Đang thêm...' : 'Thêm người'}
              </button>
            </div>
          </div>
        </div>
      )}

      {forwardMessage && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-[18px] font-semibold text-foreground">Chuyển tiếp tin nhắn</h3>
              <button
                onClick={() => {
                  setForwardMessage(null);
                  setSelectedForwardTargetIds([]);
                }} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="mb-2 text-sm font-medium text-foreground">Chọn cuộc trò chuyện</p>
              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border p-2">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Chưa có cuộc trò chuyện để chuyển tiếp</div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => {
                      const targetId = conversation.user.id;
                      const selected = selectedForwardTargetIds.includes(targetId);
                      return (
                        <button
                          key={`forward-${targetId}`}
                          onClick={() => toggleForwardTargetSelection(targetId)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                        >
                          <UserAvatar
                            name={conversation.user.name}
                            avatarUrl={conversation.user.avatar}
                            userId={conversation.user.id}
                            variant={conversation.isGroup ? 'group' : 'user'}
                            rounded="full"
                            className="h-9 w-9"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                            {conversation.user.name}
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded border ${ selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border bg-card text-transparent' }`}
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

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                onClick={() => {
                  setForwardMessage(null);
                  setSelectedForwardTargetIds([]);
                }} className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitForward}
                disabled={selectedForwardTargetIds.length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-muted cursor-pointer"
              >
                Chuyển tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {groupJoinModalToken && (
        <GroupJoinLinkModal
          token={groupJoinModalToken}
          onClose={() => setGroupJoinModalToken(null)}
          onJoined={(conversationId) => void handleGroupJoinedFromLink(conversationId)}
          onOpenGroup={handleOpenGroupFromJoinLink}
        />
      )}

      {isDissolveGroupModalOpen && activeChatUserId?.startsWith('group:') && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-lg font-bold text-foreground">Giải tán nhóm</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Toàn bộ thành viên sẽ bị xóa khỏi nhóm và lịch sử chat nhóm sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setIsDissolveGroupModalOpen(false)}
                disabled={isDissolvingGroup}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDissolvingGroup}
                onClick={() => void executeDissolveGroup()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-gray-600"
              >
                {isDissolvingGroup ? 'Đang giải tán...' : 'Giải tán nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeMemberTarget && activeChatUserId?.startsWith('group:') && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-lg font-bold text-foreground">Xóa thành viên</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Bạn có chắc muốn xóa <span className="font-semibold text-foreground">{removeMemberTarget.name}</span> khỏi nhóm? Người này sẽ không nhận tin nhắn mới từ nhóm cho đến khi được mời lại.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setRemoveMemberTarget(null)}
                disabled={isRemovingGroupMember}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isRemovingGroupMember}
                onClick={() => void executeRemoveGroupMember()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-gray-600"
              >
                {isRemovingGroupMember ? 'Đang xóa...' : 'Xóa thành viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {leaveGroupModalMode && activeChatUserId?.startsWith('group:') && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {leaveGroupModalMode === 'confirm' ? (
              <>
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-lg font-bold text-foreground">Rời nhóm</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Bạn có chắc muốn rời nhóm này? Bạn sẽ không nhận tin nhắn mới từ nhóm cho đến khi được mời lại.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setLeaveGroupModalMode(null)}
                    disabled={isLeavingGroup}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isLeavingGroup}
                    onClick={() => void executeLeaveGroup()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-gray-600"
                  >
                    {isLeavingGroup ? 'Đang rời...' : 'Rời nhóm'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-lg font-bold text-foreground">Chuyển quyền quản trị</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Bạn cần chọn một thành viên làm quản trị viên mới trước khi rời nhóm.
                  </p>
                </div>
                <div className="px-5 py-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Quản trị viên mới
                  </label>
                  <select
                    value={leaveGroupNewAdminId}
                    onChange={(event) => setLeaveGroupNewAdminId(event.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none"
                  >
                    {(groupMembersById[activeChatUserId] ?? [])
                      .filter((member) => member.memberStatus !== 'PENDING' && member.id !== currentUser?.id)
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setLeaveGroupModalMode(null)}
                    disabled={isLeavingGroup}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!leaveGroupNewAdminId || isLeavingGroup}
                    onClick={() => void executeLeaveGroup(leaveGroupNewAdminId)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-gray-600"
                  >
                    {isLeavingGroup ? 'Đang rời...' : 'Rời nhóm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




