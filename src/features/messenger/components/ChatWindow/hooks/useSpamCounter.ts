import { useCallback, useEffect, useRef, useState } from 'react';

const WINDOW_MS = 60_000;
const STORAGE_KEY = 'chat_spam_timestamps';

function loadTimestamps(): number[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - WINDOW_MS;
    return parsed.filter((ts: unknown) => typeof ts === 'number' && ts > cutoff);
  } catch {
    return [];
  }
}

function saveTimestamps(timestamps: number[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // ignore quota errors
  }
}

export function useSpamCounter(maxMessages: number, enabled: boolean) {
  const timestampsRef = useRef<number[]>(loadTimestamps());
  const [sentCount, setSentCount] = useState(timestampsRef.current.length);

  const prune = useCallback(() => {
    const cutoff = Date.now() - WINDOW_MS;
    timestampsRef.current = timestampsRef.current.filter((ts) => ts > cutoff);
    saveTimestamps(timestampsRef.current);
    setSentCount(timestampsRef.current.length);
  }, []);

  const recordSend = useCallback(() => {
    if (!enabled || maxMessages <= 0) return;
    prune();
    timestampsRef.current.push(Date.now());
    saveTimestamps(timestampsRef.current);
    setSentCount(timestampsRef.current.length);
  }, [enabled, maxMessages, prune]);

  useEffect(() => {
    if (!enabled) {
      timestampsRef.current = [];
      saveTimestamps([]);
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
