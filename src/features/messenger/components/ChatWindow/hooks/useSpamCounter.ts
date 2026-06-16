import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Message } from '../../../types/message.types';

const REPLY_PREFIX = '__REPLY__:';

type ConsecutiveSpamState = {
  lastContent: string;
  streak: number;
};

function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

function getSpamTrackableText(message: Message): string | null {
  if (!message.isOwn || message.deleted || message.systemType) return null;

  const raw = message.text?.trim() ?? '';
  if (!raw) return null;

  const nonTextPrefixes = [
    '__VOICE__:',
    '__IMAGE__:',
    '__FILE__:',
    '__VIDEO_SHARE__:',
    '__POST_SHARE__:',
    '__CHAT_ACTION__:',
    '__CALL_LOG__:',
    '__STORY_REPLY__:',
  ];
  if (nonTextPrefixes.some((prefix) => raw.startsWith(prefix))) return null;
  if (message.voiceAudioUrl || message.fileUrl || message.videoShareId || message.sharedPostId) return null;
  if ((message.imageUrl || message.imageUrls?.length) && !raw.startsWith(REPLY_PREFIX)) return null;

  if (raw.startsWith(REPLY_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(REPLY_PREFIX.length));
      const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
      return text ? normalizeContent(text) : null;
    } catch {
      return null;
    }
  }

  return normalizeContent(raw);
}

export function computeConsecutiveStreakFromMessages(messages: Message[]): ConsecutiveSpamState {
  let lastContent = '';
  let streak = 0;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = getSpamTrackableText(messages[i]);
    if (!text) {
      if (streak > 0) break;
      continue;
    }

    if (streak === 0) {
      lastContent = text;
      streak = 1;
    } else if (text === lastContent) {
      streak += 1;
    } else {
      break;
    }
  }

  return { lastContent, streak };
}

export function useSpamCounter(
  conversationKey: string,
  messages: Message[],
  maxConsecutive: number,
  enabled: boolean,
) {
  const pendingStreakRef = useRef(0);
  const pendingContentRef = useRef('');

  const historyState = useMemo(() => computeConsecutiveStreakFromMessages(messages), [messages]);

  useEffect(() => {
    pendingStreakRef.current = 0;
    pendingContentRef.current = '';
  }, [conversationKey]);

  useEffect(() => {
    if (pendingStreakRef.current <= 0) return;
    const pending = pendingContentRef.current;
    if (!pending) return;

    if (historyState.lastContent === pending && historyState.streak >= pendingStreakRef.current) {
      pendingStreakRef.current = 0;
      pendingContentRef.current = '';
    }
  }, [historyState]);

  const getEffectiveState = useCallback((): ConsecutiveSpamState => {
    const pending = pendingContentRef.current;
    const pendingCount = pendingStreakRef.current;

    if (pendingCount <= 0 || !pending) {
      return historyState;
    }

    if (historyState.streak === 0 || historyState.lastContent === pending) {
      const base = historyState.lastContent === pending ? historyState.streak : 0;
      return { lastContent: pending, streak: base + pendingCount };
    }

    return historyState;
  }, [historyState]);

  const isAtLimitFor = useCallback(
    (content: string) => {
      if (!enabled || maxConsecutive <= 0 || !conversationKey) return false;
      const normalized = normalizeContent(content);
      if (!normalized) return false;
      const state = getEffectiveState();
      if (state.lastContent !== normalized) return false;
      return state.streak >= maxConsecutive;
    },
    [conversationKey, enabled, getEffectiveState, maxConsecutive],
  );

  const recordSend = useCallback(
    (content: string) => {
      if (!enabled || maxConsecutive <= 0 || !conversationKey) return;
      const normalized = normalizeContent(content);
      if (!normalized) return;

      const state = getEffectiveState();
      if (state.lastContent === normalized) {
        pendingContentRef.current = normalized;
        pendingStreakRef.current += 1;
      } else {
        pendingContentRef.current = normalized;
        pendingStreakRef.current = 1;
      }
    },
    [conversationKey, enabled, getEffectiveState, maxConsecutive],
  );

  return {
    enabled,
    isAtLimitFor,
    recordSend,
  };
}
