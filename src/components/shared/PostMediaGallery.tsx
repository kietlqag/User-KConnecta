import { FileText } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export type PostGalleryItem = { type: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; url: string };

interface PostMediaGalleryProps {
  items: PostGalleryItem[];
  /** Called with index into original `items` when user activates a tile. */
  onMediaClick?: (itemIndex: number) => void;
  className?: string;
}

function MediaTile({
  item,
  overlay,
  onActivate,
}: {
  item: PostGalleryItem;
  overlay?: string | null;
  onActivate?: () => void;
}) {
  const clickable = Boolean(onActivate);
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={`relative h-full min-h-0 w-full overflow-hidden bg-black ${
        clickable ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70' : ''
      }`}
      onClick={clickable ? onActivate : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate?.();
              }
            }
          : undefined
      }
    >
      {item.type === 'IMAGE' ? (
        <ImageWithFallback src={item.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : item.type === 'DOCUMENT' ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 p-3 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="h-10 w-10" />
          <span className="text-xs font-semibold">Tải tài liệu</span>
        </a>
      ) : (
        <video
          src={item.url}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}
      {overlay ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white sm:text-3xl">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}

const gap = 'gap-px';

/**
 * Facebook-style multi-media layout for feed posts.
 * — 2: half + half · 3: wide left + two stacked right · 4: 2×2 · 5+: 2 tall left + 3 right, +N on last if more.
 */
export function PostMediaGallery({ items, onMediaClick, className = '' }: PostMediaGalleryProps) {
  const resolved = items
    .map((it, index) => ({ ...it, index, url: (it.url || '').trim() }))
    .filter((it) => Boolean(it.url));
  const n = resolved.length;
  if (n === 0) return null;

  const go = (originalIndex: number) => () => onMediaClick?.(originalIndex);

  const shell = `mx-auto w-full max-h-[min(520px,85vw)] bg-black ${className}`.trim();

  if (n === 2) {
    return (
      <div className={`flex aspect-[5/3] w-full min-h-[140px] ${gap} ${shell}`}>
        {resolved.map((item) => (
          <div key={`${item.url}-${item.index}`} className="relative min-h-0 min-w-0 flex-1 self-stretch">
            <MediaTile item={item} onActivate={go(item.index)} />
          </div>
        ))}
      </div>
    );
  }

  if (n === 3) {
    return (
      <div className={`flex aspect-[4/3] w-full min-h-[160px] ${gap} ${shell}`}>
        <div className="relative min-h-0 min-w-0 flex-[2] self-stretch">
          <MediaTile item={resolved[0]} onActivate={go(resolved[0].index)} />
        </div>
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col self-stretch ${gap}`}>
          <div className="relative min-h-0 flex-1 basis-0">
            <MediaTile item={resolved[1]} onActivate={go(resolved[1].index)} />
          </div>
          <div className="relative min-h-0 flex-1 basis-0">
            <MediaTile item={resolved[2]} onActivate={go(resolved[2].index)} />
          </div>
        </div>
      </div>
    );
  }

  if (n === 4) {
    return (
      <div className={`grid aspect-square w-full min-h-[160px] grid-cols-2 grid-rows-2 ${gap} ${shell}`}>
        {resolved.map((item) => (
          <div key={`${item.url}-${item.index}`} className="relative min-h-0 min-w-0">
            <MediaTile item={item} onActivate={go(item.index)} />
          </div>
        ))}
      </div>
    );
  }

  const extra = resolved.length - 5;
  const overlay = extra > 0 ? `+${extra}` : null;

  return (
    <div className={`flex aspect-square w-full min-h-[180px] ${gap} ${shell}`}>
      <div className={`flex min-h-0 min-w-0 flex-[3] flex-col self-stretch ${gap}`}>
        <div className="relative min-h-0 flex-1 basis-0">
          <MediaTile item={resolved[0]} onActivate={go(resolved[0].index)} />
        </div>
        <div className="relative min-h-0 flex-1 basis-0">
          <MediaTile item={resolved[1]} onActivate={go(resolved[1].index)} />
        </div>
      </div>
      <div className={`flex min-h-0 min-w-0 flex-[2] flex-col self-stretch ${gap}`}>
        <div className="relative min-h-0 flex-1 basis-0">
          <MediaTile item={resolved[2]} onActivate={go(resolved[2].index)} />
        </div>
        <div className="relative min-h-0 flex-1 basis-0">
          <MediaTile item={resolved[3]} onActivate={go(resolved[3].index)} />
        </div>
        <div className="relative min-h-0 flex-1 basis-0">
          <MediaTile item={resolved[4]} overlay={overlay} onActivate={go(resolved[4].index)} />
        </div>
      </div>
    </div>
  );
}
