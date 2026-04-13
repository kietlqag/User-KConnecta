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

function formatTimestamp(iso?: string | null) {
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Vá»«a xong';
  if (diffMinutes < 60) return `${diffMinutes} phÃºt`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giá»`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngÃ y`;

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
          friends.map((f) => chatService.getChatHistory(currentUser.id, f.userId)),
        );

        const mapped: Conversation[] = friends.map((f, index) => {
          const historyResult = histories[index];
          const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
          const last = history.length > 0 ? history[history.length - 1] : null;

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
            },
            lastMessage: last?.content?.trim() || 'Hai báº¡n Ä‘Ã£ káº¿t báº¡n. HÃ£y báº¯t Ä‘áº§u cuá»™c trÃ² chuyá»‡n.',
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

