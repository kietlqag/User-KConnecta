import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { getWsBaseUrl } from '@/utils/apiBaseUrl';
import type {
  IncomingChatMessage,
  IncomingCallSignal,
  IncomingMessageStatus,
  IncomingPresenceStatus,
  OutgoingCallSignal,
} from '../types/message.types';

/**
 * Quản lý kết nối WebSocket STOMP cho chat realtime + signaling call.
 */
export function useChatSocket(
  token: string | null | undefined,
  onMessage: (msg: IncomingChatMessage) => void,
  onCallSignal?: (signal: IncomingCallSignal) => void,
  onMessageStatus?: (status: IncomingMessageStatus) => void,
  onPresenceStatus?: (status: IncomingPresenceStatus) => void,
) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  const onMessageRef = useRef(onMessage);
  const onCallSignalRef = useRef(onCallSignal);
  const onMessageStatusRef = useRef(onMessageStatus);
  const onPresenceStatusRef = useRef(onPresenceStatus);
  onMessageRef.current = onMessage;
  onCallSignalRef.current = onCallSignal;
  onMessageStatusRef.current = onMessageStatus;
  onPresenceStatusRef.current = onPresenceStatus;

  useEffect(() => {
    if (!token) return;

    const wsUrl = `${getWsBaseUrl()}/ws`;

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
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

        client.publish({
          destination: '/app/presence.init',
          body: '{}',
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.error('[useChatSocket] STOMP error:', frame.headers?.message);
      },
      onWebSocketError: (e) => {
        console.error('[useChatSocket] WebSocket error:', e);
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
    } else {
      console.warn('[useChatSocket] Not connected, cannot send message');
    }
  }, []);

  const sendCallSignal = useCallback((signal: OutgoingCallSignal) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/call.signal',
        body: JSON.stringify(signal),
      });
    } else {
      console.warn('[useChatSocket] Not connected, cannot send call signal');
    }
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

  return { connected, sendMessage, sendCallSignal, sendMessageDelivered, sendConversationSeen };
}
