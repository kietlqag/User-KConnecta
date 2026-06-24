let activeChatKey: string | null = null;

export function setActiveChatKey(key: string | null): void {
  activeChatKey = key?.trim() || null;
}

export function getActiveChatKey(): string | null {
  return activeChatKey;
}

export function clearActiveChatKey(): void {
  activeChatKey = null;
}

export function isMessageForActiveChat(params: {
  senderId: string;
  receiverId?: string | null;
  conversationId?: string | null;
  currentUserId: string;
}): boolean {
  if (!activeChatKey) return false;

  if (params.conversationId) {
    const groupKey = params.conversationId.startsWith('group:')
      ? params.conversationId
      : `group:${params.conversationId}`;
    return activeChatKey === groupKey || activeChatKey === params.conversationId;
  }

  const otherUserId =
    params.senderId === params.currentUserId ? params.receiverId : params.senderId;
  return Boolean(otherUserId && activeChatKey === otherUserId);
}
