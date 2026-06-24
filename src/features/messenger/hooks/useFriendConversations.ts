import { useState, useEffect, useCallback, useRef } from 'react';
import { friendService, FRIENDSHIP_CHANGED_EVENT } from '@/services/friendService';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import {
  buildConversationPreviewFromContent,
  formatConversationPreview,
  mapContentToConversationPreview,
} from '../utils/conversationPreview';
import type { Conversation } from '../types/messenger.types';
import { isMessageForActiveChat } from '../utils/activeChatTracker';

interface UseFriendConversationsResult {
  conversations: Conversation[];
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;
  reload: () => void;
}

interface UseFriendConversationsOptions {
  includeGroups?: boolean;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const includeGroups = Boolean(options.includeGroups);
  const loadInFlightRef = useRef<Promise<void> | null>(null);
  const reloadTimerRef = useRef<number | null>(null);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    const syncAuth = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
    return () => window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
  }, []);

  const load = useCallback((options?: { background?: boolean }) => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    if (loadInFlightRef.current) return;

    const background = options?.background ?? hasLoadedOnceRef.current;
    if (background) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    loadInFlightRef.current = Promise.all([
      friendService.getFriends(currentUser.id),
      includeGroups ? chatService.getMyGroupConversations() : Promise.resolve([]),
      chatService.getPrivatePeerConversations(),
    ])
      .then(async ([friends, groups, privatePeers]) => {
        const friendIds = new Set(friends.map((friend) => friend.userId));
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
          const rawPreview = mapContentToConversationPreview(summary?.lastMessageContent);
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
                name: friend.fullName?.trim() || friend.username || 'Người dùng',
                avatar: friend.avatarUrl?.trim() || '',
                isOnline: false,
              },
              lastMessage:
                formatConversationPreview(rawPreview, isOwnLastMessage) ||
                'Hai bạn đã kết bạn. Hãy bắt đầu cuộc trò chuyện.',
              timestamp: formatTimestamp(previewTimestamp),
              lastActivityAt: Number.isFinite(sortAt) ? sortAt : 0,
              isUnread,
              unreadCount,
            } satisfies Conversation,
          };
        });

        const strangerItems = privatePeers
          .filter((peer) => peer.peerUserId && !friendIds.has(peer.peerUserId))
          .map((peer) => {
            const rawPreview = mapContentToConversationPreview(peer.lastMessageContent);
            const isOwnLastMessage = Boolean(
              peer.lastMessageSenderId && currentUser.id && peer.lastMessageSenderId === currentUser.id,
            );
            const unreadCount = Math.max(0, peer.unreadCount ?? 0);
            const previewTimestamp = peer.lastMessageCreatedAt;
            const sortAt = (parseBackendDate(previewTimestamp) ?? new Date(0)).getTime();

            return {
              sortAt: Number.isFinite(sortAt) ? sortAt : 0,
              conversation: {
                id: peer.peerUserId,
                user: {
                  id: peer.peerUserId,
                  name: peer.peerName?.trim() || 'Người dùng',
                  avatar: peer.peerAvatarUrl?.trim() || '',
                  isOnline: false,
                },
                lastMessage:
                  formatConversationPreview(rawPreview, isOwnLastMessage) || 'Bắt đầu cuộc trò chuyện',
                timestamp: formatTimestamp(previewTimestamp),
                lastActivityAt: Number.isFinite(sortAt) ? sortAt : 0,
                isUnread: unreadCount > 0,
                unreadCount,
                isStranger: true,
              } satisfies Conversation,
            };
          });

        const groupItems = groups.map((group) => {
          const summary = groupSummaryByConversation.get(group.id);
          const rawPreview = mapContentToConversationPreview(summary?.lastMessageContent);
          const isOwnLastMessage = Boolean(
            summary?.lastMessageSenderId && currentUser.id && summary.lastMessageSenderId === currentUser.id,
          );
          const unreadCount = Math.max(0, summary?.unreadCount ?? 0);
          const previewTimestamp = summary?.lastMessageCreatedAt || group.createdAt;
          const sortAt = (parseBackendDate(previewTimestamp) ?? new Date(0)).getTime();

          return {
            sortAt: Number.isFinite(sortAt) ? sortAt : 0,
            conversation: {
              id: group.id,
              user: {
                id: `group:${group.id}`,
                name: group.name,
                avatar: group.avatarUrl?.trim() || '',
                isOnline: false,
              },
              lastMessage: formatConversationPreview(rawPreview, isOwnLastMessage) || 'Chưa có tin nhắn',
              timestamp: formatTimestamp(previewTimestamp),
              lastActivityAt: Number.isFinite(sortAt) ? sortAt : 0,
              isUnread: unreadCount > 0,
              unreadCount,
              isGroup: true,
              themeColor: group.themeColor,
            } satisfies Conversation,
          };
        });

        setConversations(
          [...friendItems, ...strangerItems, ...groupItems]
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
        hasLoadedOnceRef.current = true;
        setLoading(false);
        setIsRefreshing(false);
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
        load({ background: true });
      }, 800);
    };

    const unsubMsg = subscribeMessages((msg) => {
      if (msg.conversationId && !includeGroups) {
        return;
      }

      const preview = buildConversationPreviewFromContent(msg.content, msg.senderId, currentUser.id);
      const chatUserId = msg.conversationId
        ? `group:${msg.conversationId}`
        : (msg.senderId === currentUser.id ? msg.receiverId : msg.senderId);

      if (!chatUserId || !preview) {
        return;
      }

      const incomingFromOther = msg.senderId !== currentUser.id;
      const isViewingChat =
        incomingFromOther &&
        isMessageForActiveChat({
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          conversationId: msg.conversationId,
          currentUserId: currentUser.id,
        });

      setConversations((prev) => {
        const index = prev.findIndex((item) => item.user.id === chatUserId);
        if (index === -1) {
          scheduleReload();
          return prev;
        }
        const next = [...prev];
        next[index] = {
          ...next[index],
          lastMessage: preview,
          timestamp: 'Vừa xong',
          lastActivityAt: Date.now(),
          isUnread: incomingFromOther && !isViewingChat,
          unreadCount: isViewingChat
            ? 0
            : incomingFromOther
              ? Math.max(1, next[index].unreadCount ?? 0)
              : next[index].unreadCount,
        };
        return next.sort((first, second) => (second.lastActivityAt ?? 0) - (first.lastActivityAt ?? 0));
      });
    });

    return () => {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
      unsubMsg();
    };
  }, [currentUser?.id, includeGroups, subscribeMessages, load]);

  return { conversations, loading, isRefreshing, error, reload: () => load({ background: true }) };
}





