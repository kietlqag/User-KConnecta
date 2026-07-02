import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationService } from '@/services/notificationService';
import { authService } from '@/services/authService';
import { NotificationQueue } from './notificationQueue';
import type { Notification } from './types/notifications.types';

const POLL_INTERVAL_MS = 30_000;

function dispatchUnreadCountChanged(unreadCount: number) {
  window.dispatchEvent(
    new CustomEvent('notification:unread-changed', { detail: { unreadCount } })
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const queueRef = useRef(new NotificationQueue());
  const seenIdsRef = useRef(new Set<string>());
  const initializedRef = useRef(false);

  // String — stable value, no reference churn across renders
  const userId = authService.getCurrentUser()?.id ?? null;

  const processQueue = useCallback(() => {
    const queue = queueRef.current;
    if (queue.isEmpty()) return;
    setNotifications((prev) => {
      const next = [...prev];
      while (!queue.isEmpty()) {
        const n = queue.dequeue()!;
        if (!next.some((x) => x.id === n.id)) next.unshift(n);
      }
      return next;
    });
  }, []);

  const fetchAndEnqueue = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await notificationService.getNotifications(userId);

      if (!initializedRef.current) {
        // First load: populate directly, mark all IDs as seen
        initializedRef.current = true;
        data.forEach((n) => seenIdsRef.current.add(n.id));
        setNotifications(data);
        setUnreadCount(data.filter((n) => n.isUnread).length);
        return;
      }

      // Subsequent polls: enqueue only genuinely new notifications FIFO
      const newOnes = data.filter((n) => !seenIdsRef.current.has(n.id));
      if (newOnes.length > 0) {
        // Server returns newest→oldest; reverse so oldest enters queue first (FIFO)
        [...newOnes].reverse().forEach((n) => {
          seenIdsRef.current.add(n.id);
          queueRef.current.enqueue(n);
        });
        processQueue();

        // Real-time ban detection: if any new SYSTEM notification signals a comment ban,
        // update the cached auth user immediately so CommentSection locks without reload.
        const hasCommentBan = newOnes.some(
          (n) => n.type === 'system' && n.text.includes('tạm cấm bình luận'),
        );
        if (hasCommentBan) {
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            authService.saveCurrentUser({ ...currentUser, commentLocked: true });
          }
        }
      }

      setUnreadCount(data.filter((n) => n.isUnread).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [userId, processQueue]); // userId is a string — stable reference

  // Initial fetch — depends only on userId (string), not the function itself
  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    fetchAndEnqueue().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Poll every 30s — only restarts when userId or fetchAndEnqueue actually changes
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(fetchAndEnqueue, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId, fetchAndEnqueue]);

  // Manual refresh trigger (accept/reject invite etc.)
  useEffect(() => {
    const handler = () => fetchAndEnqueue();
    window.addEventListener('notification:refresh', handler);
    return () => window.removeEventListener('notification:refresh', handler);
  }, [fetchAndEnqueue]);

  const markAsRead = useCallback(async (notificationId: string) => {
    let wasUnread = false;
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === notificationId);
      wasUnread = Boolean(target?.isUnread);
      if (!wasUnread) return prev;
      return prev.map((n) => (n.id === notificationId ? { ...n, isUnread: false } : n));
    });
    if (!wasUnread) return;

    setUnreadCount((c) => {
      const next = Math.max(0, c - 1);
      dispatchUnreadCountChanged(next);
      return next;
    });

    try {
      await notificationService.markAsRead(notificationId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
      window.dispatchEvent(new Event('notification:refresh'));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    setUnreadCount(0);
    dispatchUnreadCountChanged(0);

    try {
      await notificationService.markAllAsRead(userId);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      window.dispatchEvent(new Event('notification:refresh'));
    }
  }, [userId]);

  const updateNotification = useCallback((id: string, patch: Partial<Notification>) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const updateNotificationsByRelatedId = useCallback((relatedId: string, patch: Partial<Notification>) => {
    setNotifications((prev) => {
      let unreadCleared = 0;
      const next = prev.map((n) => {
        if (n.relatedId !== relatedId) return n;
        if (patch.isUnread === false && n.isUnread) unreadCleared += 1;
        return { ...n, ...patch };
      });
      if (unreadCleared > 0) {
        setUnreadCount((c) => {
          const nextCount = Math.max(0, c - unreadCleared);
          dispatchUnreadCountChanged(nextCount);
          return nextCount;
        });
      }
      return next;
    });
  }, []);

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, updateNotification, updateNotificationsByRelatedId };
}
