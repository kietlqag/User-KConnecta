import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, AuthUser } from '../../../../services/authService';
import { useStoriesQuery, type OptimisticStory } from '../../../stories/hooks/useStories';

interface StoryGroup {
  userId: string;
  userFullName: string;
  userAvatarUrl: string;
  thumbnail: string | null;
  backgroundColor: string | null;
  count: number;
  isPending?: boolean;
}

function buildGroups(stories: OptimisticStory[], currentUserId?: string): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const s of stories) {
    if (s.privacy === 'ONLY_ME' && s.userId !== currentUserId) continue;
    if (!map.has(s.userId)) {
      map.set(s.userId, {
        userId: s.userId,
        userFullName: s.userFullName,
        userAvatarUrl: s.userAvatarUrl,
        thumbnail: s.imageUrl,
        backgroundColor: s.backgroundColor,
        count: 1,
        isPending: s.isPending,
      });
    } else {
      const g = map.get(s.userId)!;
      g.count++;
      if (!g.thumbnail && s.imageUrl) g.thumbnail = s.imageUrl;
      if (s.isPending) g.isPending = true;
    }
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });
  return groups;
}

export function Stories() {
  const navigate = useNavigate();
  const [currentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: stories = [] } = useStoriesQuery();
  const storyGroups = buildGroups(stories, currentUser?.id);

  const STORIES_TO_SKIP = 3;
  const STORY_WIDTH = 120;

  const updateScrollButtons = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [storyGroups]);

  const handleNext = () => {
    if (containerRef.current) {
      const newPosition = scrollPosition + STORIES_TO_SKIP * STORY_WIDTH;
      const maxScroll = containerRef.current.scrollWidth - containerRef.current.clientWidth;
      const targetPosition = Math.min(newPosition, maxScroll);
      containerRef.current.scrollTo({ left: targetPosition, behavior: 'smooth' });
      setScrollPosition(targetPosition);
    }
  };

  const handlePrevious = () => {
    if (containerRef.current) {
      const newPosition = Math.max(0, scrollPosition - STORIES_TO_SKIP * STORY_WIDTH);
      containerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft);
    updateScrollButtons();
  };

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 mb-4 relative border border-border">
      {canScrollLeft && (
        <button
          onClick={handlePrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-hidden scrollbar-hide"
        onScroll={handleScroll}
      >
        {/* Create Story card */}
        <div
          className="flex-shrink-0 w-[112px] cursor-pointer group"
          onClick={() => navigate('/stories/create')}
        >
          <div className="relative w-[112px] h-[160px] bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 flex flex-col">
            <div className="h-[105px] w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
              <img
                src={currentUser?.avatarUrl || 'https://i.pravatar.cc/80?img=14'}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-[55px] bg-white dark:bg-gray-800 flex flex-col items-center justify-center relative">
              <div className="absolute -top-5 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800">
                <Plus className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center line-clamp-2">Tạo tin</p>
          </div>
        </div>

        {/* Story group cards */}
        {storyGroups.map((group) => (
          <div
            key={group.userId}
            className="flex-shrink-0 w-[112px] cursor-pointer group"
            onClick={() => !group.isPending && navigate(`/stories/${group.userId}`)}
          >
            <div className={`relative w-[112px] h-[160px] rounded-xl overflow-hidden border-[3px] border-emerald-500 group-hover:border-emerald-600 transition-colors ${group.isPending ? 'opacity-60' : ''}`}>
              {group.thumbnail ? (
                <img
                  src={group.thumbnail}
                  alt={group.userFullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: group.backgroundColor || '#1877f2' }}
                />
              )}
              {group.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              <div className="absolute top-2 left-2 w-10 h-10 rounded-full border-[3px] border-emerald-500 bg-white dark:bg-gray-800 overflow-hidden">
                <img
                  src={group.userAvatarUrl}
                  alt={group.userFullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 text-center">
                {group.userFullName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
