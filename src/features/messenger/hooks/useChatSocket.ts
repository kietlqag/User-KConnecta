import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { getWsBaseUrl } from '@/utils/apiBaseUrl';
import type { IncomingChatMessage } from '../types/message.types';

/**
 * Quản lý kết nối WebSocket STOMP cho chat realtime.
 *
 * @param token  JWT token của user hiện tại (null = không connect)
 * @param onMessage  Callback được gọi mỗi khi nhận tin nhắn mới
 */
export function useChatSocket(
  token: string | null | undefined,
  onMessage: (msg: IncomingChatMessage) => void
) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  // Giữ ref để callback luôn mới nhất mà không cần reconnect
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

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
            console.error('[useChatSocket] Failed to parse message:', e);
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

  return { connected, sendMessage };
}
