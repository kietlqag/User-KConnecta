const JOIN_LINK_PATH_PATTERN = /\/messages(?:\/|$|\?)/i;

export function parseGroupJoinTokenFromUrl(rawUrl: string): string | null {
  const value = rawUrl.trim();
  if (!value) return null;

  try {
    const url = new URL(value, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const token = url.searchParams.get('join')?.trim();
    if (!token) return null;
    if (typeof window !== 'undefined' && url.origin !== window.location.origin && !JOIN_LINK_PATH_PATTERN.test(url.pathname)) {
      return null;
    }
    return token;
  } catch {
    const match = value.match(/[?&]join=([a-zA-Z0-9_-]+)/);
    return match?.[1]?.trim() || null;
  }
}

export function extractGroupJoinTokenFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const directToken = parseGroupJoinTokenFromUrl(trimmed);
  if (directToken) return directToken;

  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch) return null;
  return parseGroupJoinTokenFromUrl(urlMatch[0]);
}

export function isGroupJoinLinkMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return Boolean(parseGroupJoinTokenFromUrl(trimmed));
}
