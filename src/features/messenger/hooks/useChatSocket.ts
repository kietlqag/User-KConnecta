import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { getWsBaseUrl } from '@/utils/apiBaseUrl';
import type {
  IncomingChatMessage,
  IncomingCallSignal,
  OutgoingCallSignal,
} from '../types/message.types';

/**
 * Quản lý kết nối WebSocket STOMP cho chat realtime + signaling call.
 */
export function useChatSocket(
  token: string | null | undefined,
  onMessage: (msg: IncomingChatMessage) => void,
  onCallSignal?: (signal: IncomingCallSignal) => void,
) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  const onMessageRef = useRef(onMessage);
  const onCallSignalRef = useRef(onCallSignal);
  onMessageRef.current = onMessage;
  onCallSignalRef.current = onCallSignal;

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

  return { connected, sendMessage, sendCallSignal };
}
