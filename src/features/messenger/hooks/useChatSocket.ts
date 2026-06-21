import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { getWsBaseUrl } from '@/utils/apiBaseUrl';
import { authService } from '@/services/authService';
import type {
  IncomingCallError,
  IncomingChatError,
  IncomingChatMessage,
  IncomingCallSignal,
  IncomingMessageStatus,
  IncomingPinnedMessage,
  IncomingPresenceStatus,
  IncomingNotificationEvent,
  OutgoingCallSignal,
} from '../types/message.types';

/**
 * Quản lý kết nối WebSocket STOMP cho chat realtime + signaling call.
 */
export function useChatSocket(
  token: string | null | undefined,
  onMessage: (msg: IncomingChatMessage) => void,
  onCallSignal?: (signal: IncomingCallSignal) => void,
  onCallError?: (error: IncomingCallError) => void,
  onMessageStatus?: (status: IncomingMessageStatus) => void,
  onPresenceStatus?: (status: IncomingPresenceStatus) => void,
  onPinnedMessage?: (event: IncomingPinnedMessage) => void,
  onNotificationEvent?: (event: IncomingNotificationEvent) => void,
  onChatError?: (error: IncomingChatError) => void,
) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  const onMessageRef = useRef(onMessage);
  const onCallSignalRef = useRef(onCallSignal);
  const onMessageStatusRef = useRef(onMessageStatus);
  const onCallErrorRef = useRef(onCallError);
  const onPresenceStatusRef = useRef(onPresenceStatus);
  const onPinnedMessageRef = useRef(onPinnedMessage);
  const onNotificationEventRef = useRef(onNotificationEvent);
  const onChatErrorRef = useRef(onChatError);
  onMessageRef.current = onMessage;
  onCallSignalRef.current = onCallSignal;
  onMessageStatusRef.current = onMessageStatus;
  onCallErrorRef.current = onCallError;
  onPresenceStatusRef.current = onPresenceStatus;
  onPinnedMessageRef.current = onPinnedMessage;
  onNotificationEventRef.current = onNotificationEvent;
  onChatErrorRef.current = onChatError;

  useEffect(() => {
    if (!token) return;

    const wsUrl = `${getWsBaseUrl()}/ws`;

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectionTimeout: 15000,
      beforeConnect: () => {
        const freshToken = authService.getCurrentUser()?.token?.trim();
        if (!freshToken) {
          throw new Error('Missing auth token for WebSocket');
        }
        client.connectHeaders = { Authorization: `Bearer ${freshToken}` };
      },
      onConnect: () => {
        setConnected(true);

        client.subscribe('/user/queue/messages', (frame) => {
          try {
            const msg = JSON.parse(frame.body) as IncomingChatMessage;
            onMessageRef.current(msg);
          } catch (e) {
            console.error('[useChatSocket] Failed to parse chat message:', e);
          }
        });

        client.subscribe('/user/queue/call', (frame) => {
          try {
            const signal = JSON.parse(frame.body) as IncomingCallSignal;
            onCallSignalRef.current?.(signal);
          } catch (e) {
            console.error('[useChatSocket] Failed to parse call signal:', e);
          }
        });

        client.subscribe('/user/queue/call-errors', (frame) => {
          try {
            const error = JSON.parse(frame.body) as IncomingCallError;
            onCallErrorRef.current?.(error);
          } catch (e) {
            console.error('[useChatSocket] Failed to parse call error:', e);
          }
        });

        client.subscribe('/user/queue/message-status', (frame) => {
          try {
            const status = JSON.parse(frame.body) as IncomingMessageStatus;
            onMessageStatusRef.current?.(status);
          } catch (e) {
            console.error('[useChatSocket] Failed to parse message status:', e);
          }
        });

        client.subscribe('/user/queue/presence', (frame) => {
          try {
            const status = JSON.parse(frame.body) as IncomingPresenceStatus;
            onPresenceStatusRef.current?.(status);
          } catch (e) {
            console.error('[useChatSocket] Failed to parse presence status:', e);
          }
        });

        client.subscribe('/user/queue/pinned-messages', (frame) => {
          try {
            const event = JSON.parse(frame.body) as IncomingPinnedMessage;
            onPinnedMessageRef.current?.(event);
          } catch (e) {
            console.error('[useChatSocket] Failed to parse pinned message event:', e);
          }
        });

        client.subscribe('/user/queue/notifications', (frame) => {
          try {
            const event = JSON.parse(frame.body) as IncomingNotificationEvent;
            onNotificationEventRef.current?.(event);
          } catch (e) {
            console.error('[useChatSocket] Failed to parse notification event:', e);
          }
        });

        client.subscribe('/user/queue/chat-errors', (frame) => {
          try {
            const error = JSON.parse(frame.body) as IncomingChatError;
            onChatErrorRef.current?.(error);
          } catch (e) {
            console.error('[useChatSocket] Failed to parse chat error:', e);
          }
        });

        client.publish({
          destination: '/app/presence.init',
          body: '{}',
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.error('[useChatSocket] STOMP error:', frame.headers?.message);
        setConnected(false);
      },
      onWebSocketError: () => {
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const sendMessage = useCallback((receiverId: string, content: string) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/chat.private',
        body: JSON.stringify({ receiverId, content }),
      });
      return true;
    }
    console.warn('[useChatSocket] Not connected, cannot send message');
    return false;
  }, []);

  const sendGroupMessage = useCallback((conversationId: string, content: string) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/chat.group',
        body: JSON.stringify({ conversationId, content }),
      });
      return true;
    }
    console.warn('[useChatSocket] Not connected, cannot send group message');
    return false;
  }, []);

  const sendCallSignal = useCallback((signal: OutgoingCallSignal) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/call.signal',
        body: JSON.stringify(signal),
      });
      return true;
    }
    console.warn('[useChatSocket] Not connected, cannot send call signal');
    return false;
  }, []);

  const sendMessageDelivered = useCallback((messageId: string) => {
    if (!messageId) return;
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/chat.delivered',
        body: JSON.stringify({ messageId }),
      });
    }
  }, []);

  const sendConversationSeen = useCallback((peerUserId: string) => {
    if (!peerUserId) return;
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/chat.seen',
        body: JSON.stringify({ peerUserId }),
      });
    }
  }, []);

  return { connected, sendMessage, sendGroupMessage, sendCallSignal, sendMessageDelivered, sendConversationSeen };
}
