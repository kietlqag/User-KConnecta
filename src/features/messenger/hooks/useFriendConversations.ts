import { useState, useEffect, useCallback } from 'react';
import { friendService } from '@/services/friendService';
import { authService } from '@/services/authService';
import type { Conversation } from '../types/messenger.types';

interface UseFriendConversationsResult {
  conversations: Conversation[];
  loading: boolean;
  error: boolean;
  reload: () => void;
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
      .then((friends) => {
        setConversations(
          friends.map((f) => ({
            id: f.friendshipId ?? f.userId,
            user: {
              id: f.userId,
              name: f.fullName,
              avatar: f.avatarUrl ?? '',
            },
            lastMessage: 'Bạn bè · Nhấn để nhắn tin',
            timestamp: '',
            isUnread: false,
          }))
        );
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
