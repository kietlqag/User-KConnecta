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

const CALL_LOG_PREFIX = '__CALL_LOG__:';
const REPLY_PREFIX = '__REPLY__:';
const VOICE_MESSAGE_PREFIX = '__VOICE__:';
const IMAGE_MESSAGE_PREFIX = '__IMAGE__:';
const FILE_MESSAGE_PREFIX = '__FILE__:';
const VIDEO_SHARE_PREFIX = '__VIDEO_SHARE__:';

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

export function useFriendConversations(): UseFriendConversationsResult {
  const currentUser = authService.getCurrentUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    friendService
      .getFriends(currentUser.id)
      .then(async (friends) => {
        const histories = await Promise.allSettled(
          friends.map((f) => chatService.getChatHistory(currentUser.id, f.userId, { limit: 1 })),
        );

        const mapped: Conversation[] = friends.map((f, index) => {
          const historyResult = histories[index];
          const history = historyResult.status === 'fulfilled' ? historyResult.value.messages : [];
          const last = history.length > 0 ? history[history.length - 1] : null;
          const rawPreview = mapBackendContentToPreview(last?.content);
          const isOwnLastMessage = Boolean(last?.senderId && currentUser?.id && last.senderId === currentUser.id);

          return {
            id: f.friendshipId ?? f.userId,
            user: {
              id: f.userId,
              name: f.fullName,
              avatar:
                f.avatarUrl ??
                `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(
                  f.fullName || 'User',
                )}`,
              isOnline: false,
            },
            lastMessage:
              formatConversationPreview(rawPreview, isOwnLastMessage) ||
              'Hai bạn đã kết bạn. Hãy bắt đầu cuộc trò chuyện.',
            timestamp: formatTimestamp(last?.createdAt || f.createdAt),
            isUnread: false,
          };
        });

        setConversations(mapped);
      })
      .catch(() => {
        setConversations([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { conversations, loading, error, reload: load };
}

