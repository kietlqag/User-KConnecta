import { useState, useEffect, useCallback } from 'react';
import { friendService } from '@/services/friendService';
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import type { Conversation } from '../types/messenger.types';

interface UseFriendConversationsResult {
  conversations: Conversation[];
  loading: boolean;
  error: boolean;
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
    try {
      const payload = JSON.parse(raw.slice(CHAT_ACTION_PREFIX.length));
      const actor = typeof payload?.actorName === 'string' ? payload.actorName : 'Người dùng';
      const value = typeof payload?.value === 'string' ? payload.value : '';
      switch (payload?.type) {
        case 'rename_conversation':
          return `${actor} đã đổi tên đoạn chat${value ? ` thành ${value}` : ''}.`;
        case 'change_group_photo':
          return `${actor} đã đổi ảnh nhóm.`;
        case 'change_theme':
          return `${actor} đã đổi chủ đề đoạn chat.`;
        case 'change_nickname':
          return `${actor} đã đổi biệt danh.`;
        case 'clear_nickname':
          return `${actor} đã gỡ biệt danh.`;
        case 'add_members':
          return `${actor} đã thêm người vào nhóm.`;
        case 'pin_message':
          return `${actor} đã ghim một tin nhắn.`;
        case 'unpin_message':
          return `${actor} đã bỏ ghim một tin nhắn.`;
        default:
          return raw;
      }
    } catch {
      return raw;
    }
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

function formatTimestamp(iso?: string | null) {
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày`;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function useFriendConversations(options: UseFriendConversationsOptions = {}): UseFriendConversationsResult {
  const currentUser = authService.getCurrentUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const includeGroups = Boolean(options.includeGroups);

  const load = useCallback(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    Promise.all([
      friendService.getFriends(currentUser.id),
      includeGroups ? chatService.getMyGroupConversations() : Promise.resolve([]),
    ])
      .then(async ([friends, groups]) => {
        const friendHistories = await Promise.allSettled(
          friends.map((friend) => chatService.getChatHistory(currentUser.id, friend.userId, { limit: 1 })),
        );
        const groupHistories = await Promise.allSettled(
          groups.map((group) => chatService.getGroupChatHistory(group.id, { limit: 1 })),
        );

        const friendItems = friends.map((friend, index) => {
          const historyResult = friendHistories[index];
          const history = historyResult.status === 'fulfilled' ? historyResult.value.messages : [];
          const last = history.length > 0 ? history[history.length - 1] : null;
          const rawPreview = mapBackendContentToPreview(last?.content);
          const isOwnLastMessage = Boolean(last?.senderId && currentUser.id && last.senderId === currentUser.id);
          const sortAt = new Date(last?.createdAt || friend.createdAt || 0).getTime();

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
              timestamp: formatTimestamp(last?.createdAt || friend.createdAt),
              isUnread: false,
            } satisfies Conversation,
          };
        });

        const groupItems = groups.map((group, index) => {
          const historyResult = groupHistories[index];
          const history = historyResult.status === 'fulfilled' ? historyResult.value.messages : [];
          const last = history.length > 0 ? history[history.length - 1] : null;
          const rawPreview = mapBackendContentToPreview(last?.content);
          const isOwnLastMessage = Boolean(last?.senderId && currentUser.id && last.senderId === currentUser.id);
          const sortAt = new Date(last?.createdAt || group.createdAt || 0).getTime();

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
              timestamp: formatTimestamp(last?.createdAt || group.createdAt),
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
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id, includeGroups]);

  useEffect(() => {
    load();
  }, [load]);

  return { conversations, loading, error, reload: load };
}

