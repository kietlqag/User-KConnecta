const SEEN_KEY = 'kc_feed_seen';
const MAX_SEEN = 500;

export function getSeenPostIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function markPostsSeen(ids: string[]): void {
  try {
    const seen = getSeenPostIds();
    ids.forEach((id) => seen.add(id));
    // Keep only the last MAX_SEEN entries to avoid unbounded growth
    const arr = Array.from(seen);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(arr.slice(-MAX_SEEN)));
  } catch {}
}
