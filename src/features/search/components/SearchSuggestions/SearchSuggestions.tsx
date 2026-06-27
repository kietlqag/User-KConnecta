import { useState, useEffect, useRef } from 'react';
import { X, Clock, User, Users, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecentSearchItem } from '../../types/search.types';
import { searchService, SearchSuggestionDto } from '@/services/searchService';
import { searchHistoryService } from '@/services/searchHistoryService';
import { getRelatedBlockedUserIds, USER_BLOCK_CHANGED_EVENT } from '@/services/blockedUsersService';

interface SearchSuggestionsProps {
  query: string;
  onClose: () => void;
}

export const SearchSuggestions = ({ query, onClose }: SearchSuggestionsProps) => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SearchSuggestionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RecentSearchItem[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    let cancelled = false;
    const loadBlocked = () => {
      void getRelatedBlockedUserIds(true).then((ids) => {
        if (!cancelled) setBlockedIds(ids);
      });
    };
    loadBlocked();
    window.addEventListener(USER_BLOCK_CHANGED_EVENT, loadBlocked);
    return () => {
      cancelled = true;
      window.removeEventListener(USER_BLOCK_CHANGED_EVENT, loadBlocked);
    };
  }, []);

  // Load history from localStorage whenever we switch to the "recent" view
  useEffect(() => {
    if (!trimmedQuery) {
      const items = searchHistoryService.getAll().filter(
        (item) => item.type !== 'person' || !item.targetId || !blockedIds.has(item.targetId),
      );
      setHistory(items);
    }
  }, [trimmedQuery, blockedIds]);

  // Fetch API suggestions when query changes
  useEffect(() => {
    if (!trimmedQuery) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSuggestions([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      searchService
        .getSuggestions(trimmedQuery)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmedQuery]);

  const goSearch = (text: string, type?: string) => {
    searchHistoryService.add({ type: 'keyword', text });
    const typeParam = type ? `&type=${type}` : '';
    navigate(`/search?q=${encodeURIComponent(text)}${typeParam}`);
    onClose();
  };

  const handleSuggestionClick = (item: SearchSuggestionDto) => {
    if (item.type === 'person') {
      searchHistoryService.add({
        type: 'person',
        text: item.text,
        avatar: item.avatarUrl ?? undefined,
        targetId: item.id,
      });
      navigate(`/profile/${item.id}`);
      onClose();
      return;
    }

    if (item.type === 'group') {
      searchHistoryService.add({
        type: 'group',
        text: item.text,
        avatar: item.avatarUrl ?? undefined,
        targetId: item.id,
      });
      navigate(`/groups/${item.id}`);
      onClose();
      return;
    }

    goSearch(item.text);
  };

  const handleHistoryClick = (item: RecentSearchItem) => {
    if (item.type === 'person' && item.targetId) {
      navigate(`/profile/${item.targetId}`);
      onClose();
      return;
    }

    if (item.type === 'group' && item.targetId) {
      navigate(`/groups/${item.targetId}`);
      onClose();
      return;
    }

    const type = item.type === 'keyword' ? undefined
      : item.type === 'person' ? 'people'
      : item.type === 'group'  ? 'groups'
      : undefined;
    goSearch(item.text, type);
  };

  const handleRemoveHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    searchHistoryService.remove(id);
    setHistory(searchHistoryService.getAll());
  };

  const handleClearAll = () => {
    searchHistoryService.clear();
    setHistory([]);
  };

  const showRecent = !trimmedQuery;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Suggestions Panel */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-2xl z-50 max-h-[500px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-base">
            {showRecent ? 'Tìm kiếm gần đây' : `Kết quả cho "${query}"`}
          </h3>
          {showRecent && history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        <div className="overflow-y-auto max-h-[400px]">

          {/* ── Loading spinner ── */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            </div>
          )}

          {/* ── API Suggestions ── */}
          {!loading && !showRecent && suggestions.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSuggestionClick(item)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors cursor-pointer"
            >
              {item.avatarUrl ? (
                <img
                  src={item.avatarUrl}
                  alt={item.text}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {item.type === 'person'
                    ? <User className="w-5 h-5 text-muted-foreground" />
                    : <Users className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-sm truncate">{item.text}</div>
                <div className="text-xs text-muted-foreground">
                  {item.type === 'person' ? 'Người dùng' : 'Nhóm'}
                </div>
              </div>
            </button>
          ))}

          {/* ── No API results ── */}
          {!loading && !showRecent && suggestions.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Không tìm thấy kết quả cho "{query}"
            </div>
          )}

          {/* ── Recent Search History ── */}
          {showRecent && history.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có lịch sử tìm kiếm
            </div>
          )}

          {showRecent && history.map((item) => (
            <div
              key={item.id}
              onClick={() => handleHistoryClick(item)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {item.type === 'person'
                  ? <User className="w-5 h-5 text-muted-foreground" />
                  : item.type === 'group'
                  ? <Users className="w-5 h-5 text-muted-foreground" />
                  : <Clock className="w-5 h-5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-sm truncate">{item.text}</div>
                <div className="text-xs text-muted-foreground">
                  {item.type === 'person' ? 'Người dùng'
                    : item.type === 'group' ? 'Nhóm'
                    : 'Tìm kiếm'}
                </div>
              </div>
              <button
                onClick={(e) => handleRemoveHistory(e, item.id)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer"
                title="Xóa"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}

          {/* ── Tip when typing ── */}
          {!loading && !showRecent && (
            <button
              type="button"
              onClick={() => goSearch(trimmedQuery)}
              className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-border text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Nhấn Enter để tìm kiếm "{query}"</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
