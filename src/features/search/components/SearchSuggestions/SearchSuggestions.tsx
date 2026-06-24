import { useState, useEffect, useRef } from 'react';
import { X, Clock, User, Users, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecentSearchItem } from '../../types/search.types';
import { searchService, SearchSuggestionDto } from '@/services/searchService';
import { searchHistoryService } from '@/services/searchHistoryService';

interface SearchSuggestionsProps {
  query: string;
  onClose: () => void;
}

export const SearchSuggestions = ({ query, onClose }: SearchSuggestionsProps) => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SearchSuggestionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RecentSearchItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedQuery = query.trim();

  // Load history from localStorage whenever we switch to the "recent" view
  useEffect(() => {
    if (!trimmedQuery) {
      setHistory(searchHistoryService.getAll());
    }
  }, [trimmedQuery]);

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
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 max-h-[500px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
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
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  {item.type === 'person'
                    ? <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    : <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  }
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-sm truncate">{item.text}</div>
                <div className="text-xs text-gray-400">
                  {item.type === 'person' ? 'Người dùng' : 'Nhóm'}
                </div>
              </div>
            </button>
          ))}

          {/* ── No API results ── */}
          {!loading && !showRecent && suggestions.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              Không tìm thấy kết quả cho "{query}"
            </div>
          )}

          {/* ── Recent Search History ── */}
          {showRecent && history.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              Chưa có lịch sử tìm kiếm
            </div>
          )}

          {showRecent && history.map((item) => (
            <div
              key={item.id}
              onClick={() => handleHistoryClick(item)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                {item.type === 'person'
                  ? <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  : item.type === 'group'
                  ? <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  : <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                }
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-sm truncate">{item.text}</div>
                <div className="text-xs text-gray-400">
                  {item.type === 'person' ? 'Người dùng'
                    : item.type === 'group' ? 'Nhóm'
                    : 'Tìm kiếm'}
                </div>
              </div>
              <button
                onClick={(e) => handleRemoveHistory(e, item.id)}
                className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer"
                title="Xóa"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          ))}

          {/* ── Tip when typing ── */}
          {!loading && !showRecent && (
            <button
              type="button"
              onClick={() => goSearch(trimmedQuery)}
              className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400 hover:bg-muted transition-colors cursor-pointer"
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
