import { vi } from '@/constants/vi';
import { formatVi } from '@/constants/formatVi';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import type { IncomingChatMessage } from '../types/message.types';
import { mapContentToConversationPreview } from '../utils/conversationPreview';
import { getNotifyMessagesEnabled } from '../utils/messageNotificationPrefs';
import {
  isConversationMuted,
  resolveConversationKeyFromMessage,
} from '../utils/conversationMutePrefs';
import { isMessageForActiveChat, setActiveChatKey, clearActiveChatKey } from '../utils/activeChatTracker';
import { playMessageNotificationSound } from '../utils/messageNotificationSound';
import { notifyMessengerUnreadChanged } from '../utils/messengerEvents';

export { MESSENGER_UNREAD_CHANGED_EVENT, notifyMessengerUnreadChanged } from '../utils/messengerEvents';

function buildMessageDeepLink(msg: IncomingChatMessage): string {
  if (msg.conversationId) {
    const id = msg.conversationId.startsWith('group:') ? msg.conversationId : `group:${msg.conversationId}`;
    return `/messages?with=${encodeURIComponent(id)}`;
  }
  return `/messages?with=${encodeURIComponent(msg.senderId)}`;
}

function resolveSenderLabel(msg: IncomingChatMessage): string {
  return msg.senderUsername?.trim() || vi.messenger.unknownSender;
}

async function maybeShowBrowserNotification(title: string, body: string, tag: string, onClickPath: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return;

  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return;
    }
  }
  if (permission !== 'granted') return;

  const notif = new Notification(title, {
    body,
    tag,
    icon: '/favicon.ico',
  });

  notif.onclick = () => {
    window.focus();
    window.location.href = onClickPath;
    notif.close();
  };
}

function notifyIncomingMessage(msg: IncomingChatMessage, currentUserId: string, navigate: (path: string) => void) {
  if (!getNotifyMessagesEnabled()) return;
  if (isConversationMuted(resolveConversationKeyFromMessage(msg))) return;
  if (msg.senderId === currentUserId) return;
  if (isMessageForActiveChat({
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    conversationId: msg.conversationId,
    currentUserId,
  })) {
    return;
  }

  const preview = mapContentToConversationPreview(msg.content) || vi.messenger.newMessage;
  const senderLabel = resolveSenderLabel(msg);
  const deepLink = buildMessageDeepLink(msg);

  notifyMessengerUnreadChanged();
  playMessageNotificationSound();

  toast(senderLabel, {
    description: preview,
    action: {
      label: vi.messenger.viewMessage,
      onClick: () => navigate(deepLink),
    },
  });

  void maybeShowBrowserNotification(
    formatVi(vi.messenger.messageFrom, { name: senderLabel }),
    preview,
    `chat-${msg.id}`,
    deepLink,
  );
}

/** Sync active chat from /messages route and show toast/browser notifications for new messages. */
export function useMessageNotifications() {
  const { subscribeMessages } = useRealtimeCall();
  const navigate = useNavigate();
  const location = useLocation();
  const recentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (location.pathname.startsWith('/messages')) {
      const withParam = new URLSearchParams(location.search).get('with');
      setActiveChatKey(withParam);
    } else {
      clearActiveChatKey();
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser?.id) return;

    return subscribeMessages((msg) => {
      if (!msg?.id || msg.senderId === currentUser.id) return;
      if (recentIdsRef.current.has(msg.id)) return;
      recentIdsRef.current.add(msg.id);
      if (recentIdsRef.current.size > 200) {
        const first = recentIdsRef.current.values().next().value;
        if (first) recentIdsRef.current.delete(first);
      }
      notifyIncomingMessage(msg, currentUser.id, navigate);
    });
  }, [subscribeMessages, navigate]);
}
