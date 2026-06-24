import type { IncomingChatMessage } from '../types/message.types';

const MUTED_CHATS_KEY = 'kconnecta-muted-chats';

function loadMutedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(MUTED_CHATS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

function saveMutedSet(muted: Set<string>): void {
  try {
    localStorage.setItem(MUTED_CHATS_KEY, JSON.stringify([...muted]));
  } catch {
    // ignore storage errors
  }
}

export function resolveConversationKeyFromMessage(
  msg: Pick<IncomingChatMessage, 'senderId' | 'conversationId'>,
): string {
  if (msg.conversationId) {
    return msg.conversationId.startsWith('group:')
      ? msg.conversationId
      : `group:${msg.conversationId}`;
  }
  return msg.senderId;
}

export function isConversationMuted(conversationKey: string): boolean {
  return loadMutedSet().has(conversationKey);
}

export function setConversationMuted(conversationKey: string, muted: boolean): void {
  const next = loadMutedSet();
  if (muted) next.add(conversationKey);
  else next.delete(conversationKey);
  saveMutedSet(next);
}
