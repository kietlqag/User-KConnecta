import { useCallback, useEffect, useRef, useState } from 'react';
import { UserPlus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/shared';
import { friendService, type FriendApiResponse } from '@/services/friendService';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

const CARD_WIDTH = 172;
const CARD_GAP = 12;
const SCROLL_STEP = (CARD_WIDTH + CARD_GAP) * 2;

export const FriendSuggestions = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<FriendApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const currentUser = authService.getCurrentUser();

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    setLoading(true);
    friendService
      .getSuggestions(currentUser.id)
      .then(setSuggestions)
      .catch((err) => {
        console.error('Failed to fetch suggestions:', err);
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [suggestions, loading, updateScrollButtons]);

  const handleAddFriend = async (targetId: string, name: string) => {
    if (!currentUser?.id) return;
    try {
      await friendService.sendFriendRequest(currentUser.id, targetId);
      toast.success(`Đã gửi lời mời kết bạn đến ${name}`);
      setSuggestions((prev) => prev.filter((s) => s.userId !== targetId));
    } catch {
      toast.error('Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
    }
  };

  const handleRemoveSuggestion = (targetId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.userId !== targetId));
  };

  const scrollBy = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' });
  };

  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl bg-card p-4 shadow-sm border border-border">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Bạn bè có thể biết</h3>
        <button
          type="button"
          className="cursor-pointer text-sm font-semibold text-emerald-600 hover:underline"
          onClick={() => navigate('/friends')}
        >
          Xem tất cả
        </button>
      </div>

      <div className="group/carousel relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[308px] shrink-0 animate-pulse rounded-lg bg-muted"
                  style={{ width: CARD_WIDTH }}
                />
              ))
            : suggestions.map((user) => (
                <article
                  key={user.userId}
                  className="flex shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none"
                  style={{ width: CARD_WIDTH }}
                >
                  <button
                    type="button"
                    className="block h-[172px] w-full cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/profile/${user.userId}`)}
                    aria-label={`Xem trang cá nhân của ${user.fullName}`}
                  >
                    <UserAvatar
                      name={user.fullName}
                      avatarUrl={user.avatarUrl}
                      userId={user.userId}
                      className="h-full w-full"
                    />
                  </button>

                  <div className="flex flex-1 flex-col gap-2.5 p-3">
                    <div className="min-h-[52px]">
                      <button
                        type="button"
                        title={user.fullName}
                        className="line-clamp-2 text-left text-[15px] font-bold leading-snug text-foreground hover:underline"
                        onClick={() => navigate(`/profile/${user.userId}`)}
                      >
                        {user.fullName}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.mutualFriends > 0
                          ? `${user.mutualFriends} bạn chung`
                          : 'Gợi ý cho bạn'}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddFriend(user.userId, user.fullName)}
                        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        <UserPlus className="h-4 w-4 shrink-0" />
                        Thêm bạn bè
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSuggestion(user.userId)}
                        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-muted px-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <X className="h-4 w-4 shrink-0" />
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
              ))}
        </div>

        {!loading && canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-[calc(50%-18px)] z-10 flex h-9 w-9 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md opacity-0 transition-opacity hover:bg-muted group-hover/carousel:opacity-100"
            aria-label="Cuộn trái"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {!loading && canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-[calc(50%-18px)] z-10 flex h-9 w-9 translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md opacity-0 transition-opacity hover:bg-muted group-hover/carousel:opacity-100"
            aria-label="Cuộn phải"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};
