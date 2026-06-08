import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';

export function useMessengerUnreadCount() {
  const [count, setCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const reloadTimerRef = useRef<number | null>(null);
  const { subscribeMessages } = useRealtimeCall();

  useEffect(() => {
    const syncAuth = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
    return () => window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
  }, []);

  const reload = useCallback(() => {
    if (!currentUser?.id) {
      setCount(0);
      return;
    }
    chatService
      .getTotalPrivateUnreadCount()
      .then(setCount)
      .catch(() => setCount(0));
  }, [currentUser?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const scheduleReload = () => {
      if (reloadTimerRef.current !== null) return;
      reloadTimerRef.current = window.setTimeout(() => {
        reloadTimerRef.current = null;
        reload();
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
  }, [currentUser?.id, subscribeMessages, reload]);

  return count;
}
