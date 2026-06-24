export function isPlaceholderAvatar(url?: string | null): boolean {
  if (!url?.trim()) return true;
  return url.includes('ui-avatars.com');
}

export function resolveUserAvatarUrl(url?: string | null): string | null {
  if (isPlaceholderAvatar(url)) return null;
  return url!.trim();
}
