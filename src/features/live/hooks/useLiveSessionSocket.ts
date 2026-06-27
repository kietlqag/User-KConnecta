import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { getWsBaseUrl } from '@/utils/apiBaseUrl';
import type { LiveSessionRealtimeEvent } from '@/services/liveService';

export function useLiveSessionSocket(
  sessionId: string | null | undefined,
  enabled: boolean,
  onEvent: (event: LiveSessionRealtimeEvent) => void,
) {
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!sessionId || !enabled) return;

    const client = new Client({
      brokerURL: `${getWsBaseUrl()}/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/live/${sessionId}`, (frame) => {
          try {
            onEventRef.current(JSON.parse(frame.body) as LiveSessionRealtimeEvent);
          } catch (error) {
            console.error('[useLiveSessionSocket] Failed to parse live event:', error);
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.error('[useLiveSessionSocket] STOMP error:', frame.headers?.message);
      },
      onWebSocketError: (error) => {
        console.error('[useLiveSessionSocket] WebSocket error:', error);
      },
    });

    client.activate();
    return () => {
      void client.deactivate();
      setConnected(false);
    };
  }, [sessionId, enabled]);

  return { connected };
}
