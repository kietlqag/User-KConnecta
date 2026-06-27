export const RECENT_GROUP_VISITS_CHANGED_EVENT = 'recent-group-visits-changed';

const MAX_STORED_VISITS = 12;

export interface RecentGroupVisit {
  id: string;
  name: string;
  icon: string;
  visitedAt: number;
}

function storageKey(userId: string) {
  return `recent-group-visits:${userId}`;
}

function readVisits(userId: string): RecentGroupVisit[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentGroupVisit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeVisits(userId: string, visits: RecentGroupVisit[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(visits));
    window.dispatchEvent(new CustomEvent(RECENT_GROUP_VISITS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function getRecentGroupVisits(userId: string): RecentGroupVisit[] {
  return readVisits(userId).sort((a, b) => b.visitedAt - a.visitedAt);
}

export function recordGroupVisit(
  userId: string,
  group: Pick<RecentGroupVisit, 'id' | 'name' | 'icon'>,
) {
  const visits = readVisits(userId).filter((visit) => visit.id !== group.id);
  visits.unshift({
    ...group,
    visitedAt: Date.now(),
  });
  writeVisits(userId, visits.slice(0, MAX_STORED_VISITS));
}
