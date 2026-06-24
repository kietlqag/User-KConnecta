import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';

const STORY_REPLY_PREFIX = '__STORY_REPLY__:';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Laugh,
  Meh,
  Angry,
  Zap,
  ThumbsUp,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Plus,
  X,
  Link2,
  Flag,
  Trash2,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { storyService, type StoryResponse } from '@/services/storyService';
import { useDeleteStoryMutation } from '@/features/stories/hooks/useStories';
import { resolveStoryTextSize } from '@/lib/storyShareText';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import logoV2 from '@/assets/LogoKConnecta_V2.png';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StorySlide {
  id: string;
  imageUrl: string | null;
  altText: string | null;
  backgroundColor: string | null;
  textContent: string | null;
  textColor: string | null;
  textSize: number | null;
  textPosX: number | null;
  textPosY: number | null;
  linkedPostId: string | null;
  durationMs: number;
  createdAt: string;
}

interface StoryAuthor {
  userId: string;
  name: string;
  avatarUrl: string;
  slides: StorySlide[];
}

const REACTIONS = [
  { icon: ThumbsUp, label: 'Thích', emoji: '👍', color: 'text-emerald-500' },
  { icon: Heart, label: 'Yêu thích', emoji: '❤️', color: 'text-red-500' },
  { icon: Laugh, label: 'Haha', emoji: '😂', color: 'text-yellow-500' },
  { icon: Zap, label: 'Wow', emoji: '⚡', color: 'text-yellow-500' },
  { icon: Meh, label: 'Buồn', emoji: '😢', color: 'text-yellow-500' },
  { icon: Angry, label: 'Phẫn nộ', emoji: '😡', color: 'text-orange-500' },
];

function groupStoriesByUser(stories: StoryResponse[]): StoryAuthor[] {
  const map = new Map<string, StoryAuthor>();
  for (const s of stories) {
    if (!map.has(s.userId)) {
      map.set(s.userId, {
        userId: s.userId,
        name: s.userFullName,
        avatarUrl: s.userAvatarUrl,
        slides: [],
      });
    }
    map.get(s.userId)!.slides.push({
      id: s.id,
      imageUrl: s.imageUrl,
      altText: s.altText ?? null,
      backgroundColor: s.backgroundColor,
      textContent: s.textContent,
      textColor: s.textColor,
      textSize: s.textSize,
      textPosX: s.textPosX,
      textPosY: s.textPosY,
      linkedPostId: s.linkedPostId ?? null,
      durationMs: 5000,
      createdAt: s.createdAt,
    });
  }
  return Array.from(map.values());
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

// Parses the stored backgroundColor value (hex, gradient CSS, or image URL)
// and returns the correct CSS properties to apply it.
function parseBgStyle(value: string | null): CSSProperties {
  const v = value ?? '#1877f2';
  if (v.startsWith('linear-gradient') || v.startsWith('radial-gradient')) {
    return { backgroundImage: v };
  }
  if (v.startsWith('/') || v.startsWith('http') || v.startsWith('blob:') || v.startsWith('data:')) {
    return {
      backgroundImage: `url(${v})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return { backgroundColor: v };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StoryViewerPage() {
  const navigate = useNavigate();
  const { authorId } = useParams<{ authorId?: string }>();
  const currentUser = authService.getCurrentUser();

  const [authors, setAuthors] = useState<StoryAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAuthorIndex, setCurrentAuthorIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: number; emoji: string; x: number }>>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const { sendMessage } = useRealtimeCall();
  const deleteStoryMutation = useDeleteStoryMutation();
  const emojiIdRef = useRef(0);
  const progressIntervalRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const loadStories = async () => {
      try {
        const allStories = await storyService.getAllActiveStories();
        let merged = allStories;

        if (authorId) {
          const authorStories = await storyService.getActiveStoriesByUser(authorId);
          const byId = new Map<string, StoryResponse>();
          for (const story of allStories) byId.set(story.id, story);
          for (const story of authorStories) byId.set(story.id, story);
          merged = Array.from(byId.values());
        }

        const grouped = groupStoriesByUser(merged);
        setAuthors(grouped);
        const idx = grouped.findIndex((a) => a.userId === authorId);
        setCurrentAuthorIndex(idx >= 0 ? idx : 0);
      } catch {
        setAuthors([]);
      } finally {
        setLoading(false);
      }
    };

    void loadStories();
  }, [authorId]);

  const author = authors[currentAuthorIndex];
  const slide = author?.slides[currentSlideIndex];
  const totalSlides = author?.slides.length ?? 0;
  const isOwnStory = author?.userId === currentUser?.id;

  const handleSendReply = useCallback(() => {
    if (!replyText.trim() || !author || !slide) return;
    const ctx = JSON.stringify({
      authorId: author.userId,
      authorName: author.name,
      authorAvatarUrl: author.avatarUrl,
      slideImageUrl: slide.imageUrl,
      slideBackgroundColor: slide.backgroundColor,
      text: replyText.trim(),
    });
    sendMessage(author.userId, `${STORY_REPLY_PREFIX}${ctx}`);
    setReplyText('');
  }, [replyText, author, slide, sendMessage]);

  const handleSendReaction = useCallback((emoji: string) => {
    if (!author || !slide) return;
    const id = ++emojiIdRef.current;
    const x = Math.floor(Math.random() * 180 - 90);
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== id)), 1400);
    const ctx = JSON.stringify({
      authorId: author.userId,
      authorName: author.name,
      authorAvatarUrl: author.avatarUrl,
      slideImageUrl: slide.imageUrl,
      slideBackgroundColor: slide.backgroundColor,
      text: emoji,
    });
    sendMessage(author.userId, `${STORY_REPLY_PREFIX}${ctx}`);
  }, [author, slide, sendMessage]);

  const goNextSlide = useCallback(() => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex((p) => p + 1);
      setProgress(0);
      progressRef.current = 0;
    } else if (currentAuthorIndex < authors.length - 1) {
      setCurrentAuthorIndex((p) => p + 1);
      setCurrentSlideIndex(0);
      setProgress(0);
      progressRef.current = 0;
    } else {
      navigate('/home');
    }
  }, [currentSlideIndex, totalSlides, currentAuthorIndex, authors.length, navigate]);

  const goPrevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((p) => p - 1);
      setProgress(0);
      progressRef.current = 0;
    } else if (currentAuthorIndex > 0) {
      const prevAuthor = authors[currentAuthorIndex - 1];
      setCurrentAuthorIndex((p) => p - 1);
      setCurrentSlideIndex(prevAuthor.slides.length - 1);
      setProgress(0);
      progressRef.current = 0;
    }
  }, [currentSlideIndex, currentAuthorIndex, authors]);

  // Progress bar
  useEffect(() => {
    if (!slide) return;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressRef.current = 0;
    setProgress(0);
    if (isPaused) return;

    const step = 100 / (slide.durationMs / 100);
    progressIntervalRef.current = window.setInterval(() => {
      progressRef.current += step;
      if (progressRef.current >= 100) {
        progressRef.current = 100;
        setProgress(100);
        clearInterval(progressIntervalRef.current!);
        goNextSlide();
      } else {
        setProgress(progressRef.current);
      }
    }, 100);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentAuthorIndex, currentSlideIndex, isPaused, goNextSlide, slide]);

  // Close menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (menuBtnRef.current?.contains(e.target as Node)) return;
      setIsMenuOpen(false);
      setIsPaused(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isMenuOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNextSlide();
      if (e.key === 'ArrowLeft') goPrevSlide();
      if (e.key === 'Escape') navigate('/home');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNextSlide, goPrevSlide, navigate]);

  const handleSelectAuthor = (index: number) => {
    setCurrentAuthorIndex(index);
    setCurrentSlideIndex(0);
    setProgress(0);
    progressRef.current = 0;
  };

  const handleOpenLinkedPost = useCallback(() => {
    if (!slide?.linkedPostId) return;
    navigate(`/home?post=${encodeURIComponent(slide.linkedPostId)}`);
  }, [navigate, slide?.linkedPostId]);

  const handleDeleteStory = useCallback(async () => {
    if (!slide || !author || deleteStoryMutation.isPending) return;

    const deletedStoryId = slide.id;
    const previousAuthors = authors;

    setIsMenuOpen(false);
    setIsPaused(true);

    const nextAuthors = authors
      .map((item) =>
        item.userId !== author.userId
          ? item
          : { ...item, slides: item.slides.filter((s) => s.id !== deletedStoryId) },
      )
      .filter((item) => item.slides.length > 0);

    if (nextAuthors.length === 0) {
      setAuthors([]);
      try {
        await deleteStoryMutation.mutateAsync(deletedStoryId);
        navigate('/home');
      } catch {
        setAuthors(previousAuthors);
        setIsPaused(false);
      }
      return;
    }

    let nextAuthorIndex = currentAuthorIndex;
    let nextSlideIndex = currentSlideIndex;
    const updatedAuthor = nextAuthors.find((item) => item.userId === author.userId);

    if (!updatedAuthor) {
      nextAuthorIndex = Math.min(currentAuthorIndex, nextAuthors.length - 1);
      nextSlideIndex = 0;
    } else if (currentSlideIndex >= updatedAuthor.slides.length) {
      nextSlideIndex = updatedAuthor.slides.length - 1;
    }

    setAuthors(nextAuthors);
    setCurrentAuthorIndex(nextAuthorIndex);
    setCurrentSlideIndex(nextSlideIndex);
    setProgress(0);
    progressRef.current = 0;

    try {
      await deleteStoryMutation.mutateAsync(deletedStoryId);
      setIsPaused(false);
    } catch {
      setAuthors(previousAuthors);
      setCurrentAuthorIndex(currentAuthorIndex);
      setCurrentSlideIndex(currentSlideIndex);
      setIsPaused(false);
    }
  }, [
    slide,
    author,
    deleteStoryMutation,
    authors,
    currentAuthorIndex,
    currentSlideIndex,
    navigate,
  ]);

  if (loading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
    );
  }

  if (!author || !slide) {
    return (
      <div className="flex h-screen bg-black items-center justify-center flex-col gap-4">
        <p className="text-white text-lg">Không có tin nào để hiển thị</p>
        <button
          onClick={() => navigate('/home')}
          className="px-6 py-2 bg-white dark:bg-gray-800 text-black rounded-full font-semibold hover:bg-muted transition"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* ─── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-[360px] shrink-0 bg-white dark:bg-gray-800 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            onClick={() => navigate('/home')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={logoV2} alt="KConnecta" className="h-10 object-contain" />
        </div>

        <div className="px-4 pb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tin</h1>
        </div>

        {/* Create Story */}
        <div className="px-4 py-2">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tin của bạn</p>
          <button
            onClick={() => navigate('/stories/create')}
            className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-muted transition cursor-pointer"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 text-emerald-600 shrink-0">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Tạo tin</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bạn có thể chia sẻ ảnh hoặc viết gì đó.</p>
            </div>
          </button>
        </div>

        {/* Story List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 py-2">Tất cả tin</p>
          {authors.length === 0 ? (
            <p className="text-sm text-gray-400 px-2">Chưa có tin nào.</p>
          ) : (
            <div className="space-y-1">
              {authors.map((a, index) => (
                <button
                  key={a.userId}
                  onClick={() => handleSelectAuthor(index)}
                  className={`flex items-center gap-3 w-full rounded-lg px-2 py-2 transition cursor-pointer text-left ${
                    index === currentAuthorIndex ? 'bg-emerald-50' : 'hover:bg-muted'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={a.avatarUrl}
                      alt={a.name}
                      className="h-14 w-14 rounded-full object-cover border-[3px] border-emerald-500"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{a.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {a.slides.length} thẻ · {timeAgo(a.slides[0].createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Viewer ──────────────────────────────────────────────────── */}
      <main className="flex-1 relative flex items-start justify-center overflow-y-auto bg-neutral-900 py-4 sm:items-center">
        {currentAuthorIndex > 0 && (
          <button
            onClick={() => handleSelectAuthor(currentAuthorIndex - 1)}
            className="absolute left-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 shadow-lg hover:bg-white dark:bg-gray-800 transition cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="flex min-h-full flex-col items-center justify-center gap-3">

        {/* Story Card */}
        <div
          className="relative select-none"
          style={{
            width: 'min(360px, calc(100vw - 32px))',
            height: 'min(600px, calc(100dvh - 190px))',
          }}
        >
          {/* Background layer */}
          {slide.imageUrl ? (
            <div
              className="absolute inset-0 scale-100 rounded-2xl"
              style={{
                backgroundImage: `url(${slide.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(10px) brightness(0.7)',
                opacity: 0.45,
              }}
            />
          ) : (
            <div
              className="absolute inset-0 rounded-2xl"
              style={parseBgStyle(slide.backgroundColor)}
            />
          )}

          {/* Content layer */}
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt={slide.altText ?? 'story'}
              className="relative z-10 h-full w-full rounded-2xl object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="relative z-10 h-full w-full rounded-2xl"
              style={parseBgStyle(slide.backgroundColor)}
            />
          )}

          {/* Text overlay */}
          {slide.textContent && (
            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 px-3 max-w-[85%]"
              style={{
                left: `${slide.textPosX ?? 50}%`,
                top: `${slide.textPosY ?? 50}%`,
              }}
            >
              <p
                className="font-bold text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] whitespace-pre-wrap break-words"
                style={{
                  color: slide.textColor || '#ffffff',
                  fontSize: `${resolveStoryTextSize(slide.textContent, slide.textSize)}px`,
                  lineHeight: 1.2,
                }}
              >
                {slide.textContent}
              </p>
            </div>
          )}

          {/* Progress Bars */}
          <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
            {author.slides.map((s, i) => (
              <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{
                    width:
                      i < currentSlideIndex
                        ? '100%'
                        : i === currentSlideIndex
                          ? `${progress}%`
                          : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author Header */}
          <div className="absolute top-8 left-3 right-3 z-30 flex items-center gap-2">
            <img
              src={author.avatarUrl}
              alt={author.name}
              className="h-9 w-9 rounded-full border-2 border-emerald-400 object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white drop-shadow truncate">{author.name}</p>
              <p className="text-xs text-white/80 drop-shadow">{timeAgo(slide.createdAt)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMuted((m) => !m)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition cursor-pointer"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsPaused((p) => !p)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition cursor-pointer"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <div className="relative">
                <button
                  ref={menuBtnRef}
                  onClick={(e) => { e.stopPropagation(); setIsMenuOpen((o) => !o); setIsPaused(true); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition cursor-pointer"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {isMenuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-1 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/stories/${author.userId}`;
                        navigator.clipboard.writeText(url);
                        setIsMenuOpen(false);
                        setIsPaused(false);
                      }}
                      className="group flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 transition-colors"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 transition-all duration-150 group-hover:bg-gray-200 dark:hover:bg-gray-700 group-hover:scale-105">
                        <Link2 className="h-4 w-4" />
                      </span>
                      <span className="transition-transform duration-150 group-hover:translate-x-0.5">Sao chép liên kết</span>
                    </button>
                    {!isOwnStory && (
                      <button
                        type="button"
                        onClick={() => { setIsMenuOpen(false); setIsPaused(false); }}
                        className="group flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-all duration-150 group-hover:bg-red-100 group-hover:scale-105">
                          <Flag className="h-4 w-4" />
                        </span>
                        <span className="transition-transform duration-150 group-hover:translate-x-0.5">Báo cáo tin</span>
                      </button>
                    )}
                    {isOwnStory && (
                      <button
                        type="button"
                        disabled={deleteStoryMutation.isPending}
                        onClick={() => { void handleDeleteStory(); }}
                        className="group flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-60"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-all duration-150 group-hover:bg-red-100 group-hover:scale-105">
                          <Trash2 className="h-4 w-4" />
                        </span>
                        <span className="transition-transform duration-150 group-hover:translate-x-0.5">Xóa tin này</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tap areas */}
          {slide.linkedPostId ? (
            <div className="absolute inset-0 z-10 flex">
              <div className="w-[18%] cursor-pointer" onClick={goPrevSlide} />
              <div
                className="flex-1 cursor-pointer"
                onClick={handleOpenLinkedPost}
                title="Xem bài viết live"
              />
              <div className="w-[18%] cursor-pointer" onClick={goNextSlide} />
            </div>
          ) : (
            <div className="absolute inset-0 z-10 flex">
              <div className="flex-1 cursor-pointer" onClick={goPrevSlide} />
              <div className="flex-1 cursor-pointer" onClick={goNextSlide} />
            </div>
          )}

          {slide.linkedPostId ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenLinkedPost();
              }}
              className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white dark:bg-gray-800/90 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-lg transition hover:bg-white dark:bg-gray-800 cursor-pointer"
            >
              Xem bài live
            </button>
          ) : null}

          {/* Floating emoji reactions */}
          {floatingEmojis.map(({ id, emoji, x }) => (
            <div
              key={id}
              className="float-emoji"
              style={{ bottom: '24px', left: `calc(50% + ${x}px)` }}
            >
              {emoji}
            </div>
          ))}
        </div>

        {/* Reply Bar — only visible when viewing someone else's story */}
        {!isOwnStory && (
          <div className="flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white dark:bg-gray-800/10 border border-white/30 px-4 py-2">
              <img
                src={currentUser?.avatarUrl || 'https://i.pravatar.cc/80?img=14'}
                alt="me"
                className="h-6 w-6 rounded-full object-cover shrink-0"
              />
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && replyText.trim()) handleSendReply();
                }}
                placeholder="Gửi tin nhắn..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              />
              {replyText.trim() && (
                <button
                  onClick={handleSendReply}
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition shrink-0"
                >
                  Gửi
                </button>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              {REACTIONS.map(({ icon: Icon, label, emoji, color }) => (
                <button
                  key={label}
                  title={label}
                  onClick={() => handleSendReaction(emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800/10 hover:bg-white dark:bg-gray-800/25 transition cursor-pointer ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
        )}

        </div>{/* end flex-col wrapper */}

        {currentAuthorIndex < authors.length - 1 && (
          <button
            onClick={() => handleSelectAuthor(currentAuthorIndex + 1)}
            className="absolute right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 shadow-lg hover:bg-white dark:bg-gray-800 transition cursor-pointer"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </main>
    </div>
  );
}
