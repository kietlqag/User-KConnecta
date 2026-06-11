import { useCallback, useEffect, useRef, useState } from 'react';

const WINDOW_MS = 60_000;

export function useSpamCounter(maxMessages: number, enabled: boolean) {
  const timestampsRef = useRef<number[]>([]);
  const [sentCount, setSentCount] = useState(0);

  const prune = useCallback(() => {
    const cutoff = Date.now() - WINDOW_MS;
    timestampsRef.current = timestampsRef.current.filter((ts) => ts > cutoff);
    setSentCount(timestampsRef.current.length);
  }, []);

  const recordSend = useCallback(() => {
    if (!enabled || maxMessages <= 0) return;
    prune();
    timestampsRef.current.push(Date.now());
    setSentCount(timestampsRef.current.length);
  }, [enabled, maxMessages, prune]);

  useEffect(() => {
    if (!enabled) {
      timestampsRef.current = [];
      setSentCount(0);
      return;
    }
    prune();
    const id = window.setInterval(prune, 1000);
    return () => window.clearInterval(id);
  }, [enabled, prune]);

  const isNearLimit = enabled && sentCount >= Math.max(1, maxMessages - 3);
  const isAtLimit = enabled && sentCount >= maxMessages;

  return {
    sentCount,
    maxMessages,
    enabled,
    isNearLimit,
    isAtLimit,
    recordSend,
  };
}
