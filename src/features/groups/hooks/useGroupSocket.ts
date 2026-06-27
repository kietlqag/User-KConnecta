import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { getWsBaseUrl } from '@/utils/apiBaseUrl';

export interface GroupRealtimeEvent {
  event: string;
  groupId: string;
}

/**
 * Subscribes to a group's realtime topic (`/topic/group/{groupId}`) and invokes
 * `onEvent` whenever the group's membership changes (a member leaves or is removed),
 * so open group views can refresh avatars and the member count without a reload.
 */
export function useGroupSocket(
  groupId: string | null | undefined,
  enabled: boolean,
  onEvent: (event: GroupRealtimeEvent) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!groupId || !enabled) return;

    const client = new Client({
      brokerURL: `${getWsBaseUrl()}/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/group/${groupId}`, (frame) => {
          try {
            onEventRef.current(JSON.parse(frame.body) as GroupRealtimeEvent);
          } catch (error) {
            console.error('[useGroupSocket] Failed to parse group event:', error);
          }
        });
      },
      onStompError: (frame) => {
        console.error('[useGroupSocket] STOMP error:', frame.headers?.message);
      },
      onWebSocketError: (error) => {
        console.error('[useGroupSocket] WebSocket error:', error);
      },
    });

    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [groupId, enabled]);
}
