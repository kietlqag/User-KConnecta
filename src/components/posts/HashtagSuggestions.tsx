import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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

  useEffect(() => {
    let cancelled = false;
    const trimmed = content.trim();

    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      interestService
        .suggestHashtags(trimmed)
        .then((result) => {
          if (!cancelled) {
            setSuggestions(result);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setLoading(false);
          }
        });
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content]);

  if (!loading && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Gợi ý hashtag:</span>
      {loading ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Đang gợi ý…
        </span>
      ) : (
        suggestions.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() =>
              insertHashtagAtCursor(textareaRef?.current ?? null, content, tag, onContentChange)
            }
            className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {tag}
          </button>
        ))
      )}
    </div>
  );
}