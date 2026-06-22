import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import type { AlbumSidebarItem } from '@/services/albumService';

const AUTO_MS = 7500;
const TRANSITION_MS = 800;

interface AlbumSidebarCarouselProps {
  albums: AlbumSidebarItem[];
}

export function AlbumSidebarCarousel({ albums }: AlbumSidebarCarouselProps) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const count = albums.length;

  const goTo = (next: number | ((i: number) => number)) => {
    setIndex((prev) => (typeof next === 'function' ? next(prev) : next));
  };

  useEffect(() => {
    if (count <= 1 || paused) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_MS);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div
          className="flex will-change-transform"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.45, 0.05, 0.25, 1)`,
          }}
        >
          {albums.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => navigate(`/albums/${album.id}`)}
              className="w-full shrink-0 text-left hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors duration-300"
            >
              <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                {album.coverUrl ? (
                  <ImageWithFallback
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    Chưa có ảnh bìa
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {album.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {album.mediaCount} ảnh/video
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo((i) => (i - 1 + count) % count)}
            className="absolute left-1 top-[28%] -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors duration-200"
            aria-label="Trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo((i) => (i + 1) % count)}
            className="absolute right-1 top-[28%] -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors duration-200"
            aria-label="Sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex justify-center gap-1.5 mt-2">
            {albums.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                  i === index ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Album ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
