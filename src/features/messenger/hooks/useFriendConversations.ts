import { useState, useEffect, useCallback, useRef } from 'react';
import { friendService, FRIENDSHIP_CHANGED_EVENT } from '@/services/friendService';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import type { Conversation } from '../types/messenger.types';

interface UseFriendConversationsResult {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface UseFriendConversationsOptions {
  includeGroups?: boolean;
}

const CALL_LOG_PREFIX = '__CALL_LOG__:';
const REPLY_PREFIX = '__REPLY__:';
const VOICE_MESSAGE_PREFIX = '__VOICE__:';
const IMAGE_MESSAGE_PREFIX = '__IMAGE__:';
const FILE_MESSAGE_PREFIX = '__FILE__:';
const VIDEO_SHARE_PREFIX = '__VIDEO_SHARE__:';
const CHAT_ACTION_PREFIX = '__CHAT_ACTION__:';
const STORY_REPLY_PREFIX = '__STORY_REPLY__:';

function mapBackendContentToPreview(content?: string | null) {
  const raw = content?.trim();
  if (!raw) return '';

  if (raw.startsWith(VOICE_MESSAGE_PREFIX)) {
    return 'Tin nhắn thoại';
  }

  if (raw.startsWith(IMAGE_MESSAGE_PREFIX)) {
    return 'Ảnh';
  }
  
  if (raw.startsWith(VIDEO_SHARE_PREFIX)) {
    return 'Video';
  }

  if (raw.startsWith(FILE_MESSAGE_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(FILE_MESSAGE_PREFIX.length));
      return typeof payload?.fileName === 'string' && payload.fileName.trim() ? payload.fileName.trim() : 'File';
    } catch {
      return 'File';
    }
  }

  if (raw.startsWith(CHAT_ACTION_PREFIX)) {
    return '';
  }

  if (raw.startsWith(STORY_REPLY_PREFIX) || raw.includes('STORY_REPLY')) {
    try {
      const rawPayload = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : '';
      const payload = rawPayload ? JSON.parse(rawPayload) : null;
      if (typeof payload?.text === 'string' && payload.text.trim()) {
        return payload.text.trim();
      }
    } catch {
      // ignore invalid payload and fallback
    }
    return 'Đã trả lời tin';
  }

  if (raw.startsWith(REPLY_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(REPLY_PREFIX.length));
      return typeof payload?.text === 'string' ? payload.text.trim() : raw;
    } catch {
      return raw;
    }
  }

  if (!raw.startsWith(CALL_LOG_PREFIX)) {
    return raw;
  }

  try {
    const payload = JSON.parse(raw.slice(CALL_LOG_PREFIX.length));
    const mediaType: 'audio' | 'video' =
      payload?.mediaType === 'video' || String(payload?.label || '').toLowerCase().includes('video')
        ? 'video'
        : 'audio';

    if (typeof payload?.label === 'string' && payload.label.trim()) {
      return payload.label.trim();
    }
    if (payload?.kind === 'completed') {
      return mediaType === 'video' ? 'Cuộc gọi video hoàn thành' : 'Cuộc gọi thoại hoàn thành';
    }
    return mediaType === 'video' ? 'Đã bỏ lỡ cuộc gọi video' : 'Đã bỏ lỡ cuộc gọi thoại';
  } catch {
    return 'Đã bỏ lỡ cuộc gọi thoại';
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

function formatTimestamp(iso?: string | null) {
  if (!iso) return '';

  const date = parseBackendDate(iso);
  if (!date) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${Math.max(1, diffMonths)} tháng`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${Math.max(1, diffYears)} năm`;
}

export function useFriendConversations(options: UseFriendConversationsOptions = {}): UseFriendConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const includeGroups = Boolean(options.includeGroups);
  const loadInFlightRef = useRef<Promise<void> | null>(null);
  const reloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const syncAuth = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
    return () => window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
  }, []);

  const load = useCallback(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    if (loadInFlightRef.current) return;

    setLoading(true);
    setError(null);

    loadInFlightRef.current = Promise.all([
      friendService.getFriends(currentUser.id),
      includeGroups ? chatService.getMyGroupConversations() : Promise.resolve([]),
    ])
      .then(async ([friends, groups]) => {
        const summaries = await chatService.getConversationSummaries({
          peerUserIds: friends.map((friend) => friend.userId),
          conversationIds: groups.map((group) => group.id),
        });
        const privateSummaryByPeer = new Map(
          summaries
            .filter((item) => item.peerUserId)
            .map((item) => [item.peerUserId as string, item]),
        );
        const groupSummaryByConversation = new Map(
          summaries
            .filter((item) => item.conversationId)
            .map((item) => [item.conversationId as string, item]),
        );

        const friendItems = friends.map((friend) => {
          const summary = privateSummaryByPeer.get(friend.userId);
          const rawPreview = mapBackendContentToPreview(summary?.lastMessageContent);
          const isOwnLastMessage = Boolean(
            summary?.lastMessageSenderId && currentUser.id && summary.lastMessageSenderId === currentUser.id,
          );
          const unreadCount = Math.max(0, summary?.unreadCount ?? 0);
          const isUnread = unreadCount > 0;
          const previewTimestamp = summary?.lastMessageCreatedAt || friend.createdAt;
          const sortAt = (parseBackendDate(previewTimestamp) ?? new Date(0)).getTime();

          return {
            sortAt: Number.isFinite(sortAt) ? sortAt : 0,
            conversation: {
              id: friend.friendshipId ?? friend.userId,
              user: {
                id: friend.userId,
                name: friend.fullName,
                avatar:
                  friend.avatarUrl ??
                  `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(
                    friend.fullName || 'User',
                  )}`,
                isOnline: false,
              },
              lastMessage:
                formatConversationPreview(rawPreview, isOwnLastMessage) ||
                'Hai bạn đã kết bạn. Hãy bắt đầu cuộc trò chuyện.',
              timestamp: formatTimestamp(previewTimestamp),
              lastActivityAt: Number.isFinite(sortAt) ? sortAt : 0,
              isUnread,
            } satisfies Conversation,
          };
        });

        const groupItems = groups.map((group) => {
          const summary = groupSummaryByConversation.get(group.id);
          const rawPreview = mapBackendContentToPreview(summary?.lastMessageContent);
          const isOwnLastMessage = Boolean(
            summary?.lastMessageSenderId && currentUser.id && summary.lastMessageSenderId === currentUser.id,
          );
          const previewTimestamp = summary?.lastMessageCreatedAt || group.createdAt;
          const sortAt = (parseBackendDate(previewTimestamp) ?? new Date(0)).getTime();

          return {
            sortAt: Number.isFinite(sortAt) ? sortAt : 0,
            conversation: {
              id: group.id,
              user: {
                id: `group:${group.id}`,
                name: group.name,
                avatar:
                  group.avatarUrl ||
                  `https://ui-avatars.com/api/?background=2563eb&color=ffffff&bold=true&name=${encodeURIComponent(
                    group.name || 'Group',
                  )}`,
                isOnline: false,
              },
              lastMessage: formatConversationPreview(rawPreview, isOwnLastMessage) || 'Nhóm chat đã được tạo.',
              timestamp: formatTimestamp(previewTimestamp),
              lastActivityAt: Number.isFinite(sortAt) ? sortAt : 0,
              isUnread: false,
              isGroup: true,
              themeColor: group.themeColor,
            } satisfies Conversation,
          };
        });

        setConversations(
          [...friendItems, ...groupItems]
            .sort((first, second) => second.sortAt - first.sortAt)
            .map((item) => item.conversation),
        );
      })
      .catch(() => {
        setConversations([]);
        setError('Không thể tải cuộc trò chuyện');
      })
      .finally(() => {
        loadInFlightRef.current = null;
        setLoading(false);
      });
  }, [currentUser?.id, includeGroups]);

  const { subscribeMessages } = useRealtimeCall();

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.addEventListener(FRIENDSHIP_CHANGED_EVENT, load);
    return () => window.removeEventListener(FRIENDSHIP_CHANGED_EVENT, load);
  }, [load]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const scheduleReload = () => {
      if (reloadTimerRef.current !== null) return;
      reloadTimerRef.current = window.setTimeout(() => {
        reloadTimerRef.current = null;
        load();
      }, 800);
    };

    const unsubMsg = subscribeMessages((msg) => {
      if (msg.senderId !== currentUser.id) {
        scheduleReload();
      }
    });

    return () => {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
      unsubMsg();
    };
  }, [currentUser?.id, subscribeMessages, load]);

  return { conversations, loading, error, reload: load };
}





