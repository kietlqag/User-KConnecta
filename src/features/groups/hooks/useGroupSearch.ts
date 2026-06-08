import { useEffect, useMemo, useRef, useState } from 'react';
import { searchService, type SearchGroupDto } from '@/services/searchService';
import type { Group } from '../types/groups.types';

function normalize(text: string) {
  return text.trim().toLowerCase();
}

export function filterLocalGroups(groups: Group[], query: string): Group[] {
  const q = normalize(query);
  if (!q) return [];
  return groups.filter(g => normalize(g.name).includes(q));
}

export function useGroupSearchSuggestions(query: string, enabled: boolean) {
  const [groups, setGroups] = useState<SearchGroupDto[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !query.trim()) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      searchService
        .getSuggestions(query.trim())
        .then(items => setGroups(
          items
            .filter(s => s.type === 'group')
            .slice(0, 8)
            .map(s => ({
              id: s.id,
              type: 'group' as const,
              name: s.text,
              coverImage: s.avatarUrl ?? '',
              privacy: 'public' as const,
              memberCount: 0,
              isMember: false,
            })),
        ))
        .catch(() => setGroups([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, enabled]);

  return { groups, loading };
}

export function useGroupSearchResults(query: string) {
  const [groups, setGroups] = useState<SearchGroupDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setGroups([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchService
      .search(q)
      .then(data => {
        if (cancelled) return;
        setGroups(data.groups ?? []);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Không thể tìm kiếm nhóm');
        setGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return { groups, loading, error };
}

export function useMergedLocalGroups(joinedGroups: Group[], managedGroups: Group[], query: string) {
  return useMemo(() => {
    const seen = new Set<string>();
    const merged: Group[] = [];
    for (const g of [...managedGroups, ...joinedGroups]) {
      if (!seen.has(g.id)) {
        seen.add(g.id);
        merged.push(g);
      }
    }
    return filterLocalGroups(merged, query);
  }, [joinedGroups, managedGroups, query]);
}
