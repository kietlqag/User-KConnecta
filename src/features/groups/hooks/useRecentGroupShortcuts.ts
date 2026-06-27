import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { useJoinedGroups, useManagedGroups } from './useGroups';
import type { Group } from '../types/groups.types';
import {
  getRecentGroupVisits,
  RECENT_GROUP_VISITS_CHANGED_EVENT,
} from '../utils/recentGroupVisitsStorage';

const DEFAULT_LIMIT = 4;

export function useRecentGroupShortcuts(limit = DEFAULT_LIMIT) {
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.id;
  const { data: joinedGroups = [] } = useJoinedGroups('recent');
  const { data: managedGroups = [] } = useManagedGroups('recent');
  const [visitRevision, setVisitRevision] = useState(0);

  useEffect(() => {
    const syncVisits = () => setVisitRevision((value) => value + 1);
    window.addEventListener(RECENT_GROUP_VISITS_CHANGED_EVENT, syncVisits);
    return () => window.removeEventListener(RECENT_GROUP_VISITS_CHANGED_EVENT, syncVisits);
  }, []);

  return useMemo(() => {
    if (!userId) return [];

    const eligibleGroups = new Map<string, Group>();
    for (const group of [...managedGroups, ...joinedGroups]) {
      eligibleGroups.set(group.id, group);
    }

    const shortcuts: Group[] = [];
    const seen = new Set<string>();

    for (const visit of getRecentGroupVisits(userId)) {
      if (shortcuts.length >= limit) break;
      const group = eligibleGroups.get(visit.id);
      if (!group || seen.has(group.id)) continue;
      shortcuts.push(group);
      seen.add(group.id);
    }

    for (const group of [...managedGroups, ...joinedGroups]) {
      if (shortcuts.length >= limit) break;
      if (seen.has(group.id)) continue;
      shortcuts.push(group);
      seen.add(group.id);
    }

    return shortcuts;
  }, [userId, joinedGroups, managedGroups, visitRevision, limit]);
}
