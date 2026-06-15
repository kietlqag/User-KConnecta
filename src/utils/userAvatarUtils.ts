export const USER_AVATAR_BG_CLASSES = [
  'bg-emerald-600',
  'bg-blue-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-orange-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-fuchsia-600',
  'bg-lime-600',
  'bg-sky-600',
] as const;

/** Ví dụ: Quốc Kiệt → QK, Nguyễn Minh Khang → MK */
export function getDisplayNameInitials(fullName?: string | null): string {
  if (!fullName?.trim()) return '?';

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  const significant = parts.slice(-2);
  return significant.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function isPlaceholderAvatar(url?: string | null): boolean {
  if (!url?.trim()) return true;

  if (!url.includes('ui-avatars.com')) return false;

  try {
    const parsed = new URL(url);
    const name = (parsed.searchParams.get('name') || '').trim().toLowerCase();
    return !name || name === 'user' || name === 'u';
  } catch {
    return url.includes('name=User') || url.includes('name=user');
  }
}

export function getUserAvatarBgClass(seed: string): (typeof USER_AVATAR_BG_CLASSES)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return USER_AVATAR_BG_CLASSES[hash % USER_AVATAR_BG_CLASSES.length];
}
