import { RecentSearchItem } from '@/features/search/types/search.types';

const STORAGE_KEY = 'kconnecta_search_history';
const MAX_ITEMS = 10;

export const searchHistoryService = {
  getAll(): RecentSearchItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RecentSearchItem[]) : [];
    } catch {
      return [];
    }
  },

  add(item: Omit<RecentSearchItem, 'id'>): void {
    const history = searchHistoryService.getAll();
    // Remove duplicate text (same query already saved)
    const deduped = history.filter(
      (h) => h.text.toLowerCase() !== item.text.toLowerCase(),
    );
    const next: RecentSearchItem = {
      ...item,
      id: Date.now().toString(),
    };
    const trimmed = [next, ...deduped].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  },

  remove(id: string): void {
    const history = searchHistoryService.getAll().filter((h) => h.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
