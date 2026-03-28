import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { useState, useRef, useEffect } from 'react';

interface Story {
  id: string;
  userName: string;
  userAvatar: string;
  isCreate?: boolean;
}

export function Stories() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const stories: Story[] = [
    { id: '0', userName: 'Tạo tin', userAvatar: '', isCreate: true },
    { id: '1', userName: 'Nguyễn Đạp Thành', userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { id: '2', userName: 'Quỳnh Phạm', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { id: '3', userName: 'Nhà sách sự kiện', userAvatar: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=150' },
    { id: '4', userName: 'Lương Văn Đức', userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
    { id: '5', userName: 'Nguyễn Văn A', userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { id: '6', userName: 'Trần Thị B', userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    { id: '7', userName: 'Lê Văn C', userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
    { id: '8', userName: 'Phạm Thị D', userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  ];

  // Skip 3 stories per click (story width: 112px + gap: 8px = 120px per story)
  const STORIES_TO_SKIP = 3;
  const STORY_WIDTH = 120; // 112px width + 8px gap

  const updateScrollButtons = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    // Re-check when window resizes
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, []);

  const handleNext = () => {
    if (containerRef.current) {
      const newPosition = scrollPosition + (STORIES_TO_SKIP * STORY_WIDTH);
      const maxScroll = containerRef.current.scrollWidth - containerRef.current.clientWidth;
      const targetPosition = Math.min(newPosition, maxScroll);
      
      containerRef.current.scrollTo({
        left: targetPosition,
        behavior: 'smooth'
      });
      setScrollPosition(targetPosition);
    }
  };

  const handlePrevious = () => {
    if (containerRef.current) {
      const newPosition = Math.max(0, scrollPosition - (STORIES_TO_SKIP * STORY_WIDTH));
      
      containerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft);
    updateScrollButtons();
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 relative">
      {/* Previous Button */}
      {canScrollLeft && (
        <button
          onClick={handlePrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          title="Previous"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
      )}

      {/* Next Button */}
      {canScrollRight && (
        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          title="Next"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      )}

      {/* Stories Container */}
      <div 
        ref={containerRef}
        className="flex gap-2 overflow-x-hidden scrollbar-hide"
        onScroll={handleScroll}
      >
        {stories.map((story) => (
          <div
            key={story.id}
            className="flex-shrink-0 w-[112px] cursor-pointer group"
          >
            <div className="relative">
              {story.isCreate ? (
                <div className="w-[112px] h-[160px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                  <div className="h-[110px] bg-gradient-to-br from-gray-100 to-gray-200"></div>
                  <div className="h-[50px] flex items-center justify-center">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center -mt-5 border-4 border-white">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-[112px] h-[160px] rounded-xl overflow-hidden border-[3px] border-emerald-500 group-hover:border-emerald-600 transition-colors">
                  <ImageWithFallback
                    src={story.userAvatar}
                    alt={story.userName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 w-10 h-10 rounded-full border-[3px] border-emerald-500 bg-white overflow-hidden">
                    <ImageWithFallback
                      src={story.userAvatar}
                      alt={story.userName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-900 line-clamp-2 text-center">
                  {story.userName}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}