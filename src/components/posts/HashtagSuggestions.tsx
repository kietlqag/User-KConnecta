import { useEffect, useState } from 'react';
import { Loader2, Hash, RotateCw, X } from 'lucide-react';
import { interestService } from '@/services/interestService';
import { insertHashtagAtCursor } from '@/utils/hashtagInsert';

interface HashtagSuggestionsProps {
  content: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onContentChange: (value: string) => void;
}

export function HashtagSuggestions({ content, textareaRef, onContentChange }: HashtagSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const trimmed = content.trim();

  useEffect(() => {
    if (trimmed.length < 3) {
      setSuggestions([]);
      setHasAttempted(false);
    }
  }, [trimmed]);

  const fetchSuggestions = async () => {
    if (trimmed.length < 3) return;
    setLoading(true);
    setHasAttempted(true);
    try {
      const result = await interestService.suggestHashtags(trimmed);
      setSuggestions(result);
    } catch (err) {
      console.error('Failed to fetch hashtag suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  if (trimmed.length < 3) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Đang phân tích bài viết để gợi ý...</span>
      </div>
    );
  }

  if (!hasAttempted || suggestions.length === 0) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={fetchSuggestions}
          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary transition-all duration-200 cursor-pointer"
        >
          <Hash className="h-3 w-3 text-primary" />
          Gợi ý hashtag
        </button>
        {hasAttempted && suggestions.length === 0 && (
          <span className="text-xs text-muted-foreground">Không tìm thấy gợi ý phù hợp</span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Gợi ý hashtag:</span>
      {suggestions.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() =>
            insertHashtagAtCursor(textareaRef?.current ?? null, content, tag, onContentChange)
          }
          className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 cursor-pointer"
        >
          {tag}
        </button>
      ))}
      <button
        type="button"
        onClick={fetchSuggestions}
        title="Tải lại gợi ý"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
      >
        <RotateCw className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {
          setSuggestions([]);
          setHasAttempted(false);
        }}
        title="Ẩn gợi ý"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}