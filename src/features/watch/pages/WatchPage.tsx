import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { ReelPlayer, ReelNavigation } from '../components';
import { Reel, ReelComment } from '../types/watch.types';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';



// Mock comments data
const mockCommentsMap: Record<string, ReelComment[]> = {
  '1': [
    {
      id: 'c1',
      author: {
        id: 'u1',
        name: 'Trần Bích Vân',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMEFzaWFuJTIwd29tYW58ZW58MXx8fHwxNzY5NjY2MzY5fDA&ixlib=rb-4.1.0&q=80&w=400',
      },
      content: 'Có lẽ đây là một trong những khoảnh khắc đẹp nhất của trường. Xem thêm',
      timestamp: '3 ngày',
      likes: 21,
    },
    {
      id: 'c2',
      author: {
        id: 'u2',
        name: 'Trần Kim Tuyền',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMEFzaWFuJTIwbWFufGVufDF8fHx8MTc2OTY2NjM2OXww&ixlib=rb-4.1.0&q=80&w=400',
      },
      content: 'Hai mẹ con rất vui, cảm ơn Minh Thư.',
      timestamp: '4 ngày',
      likes: 13,
    },
    {
      id: 'c3',
      author: {
        id: 'u3',
        name: 'Minh Hoa',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxwb3J0cmFpdCUyMEFzaWFuJTIwd29tYW58ZW58MXx8fHwxNzY5NjY2MzY5fDA&ixlib=rb-4.1.0&q=80&w=400',
      },
      content: 'Cô bé nói giọng miền Trung, không biết là Bình Định hay Phú Thọ ta 😄',
      timestamp: '4 ngày',
      likes: 13,
    },
    {
      id: 'c4',
      author: {
        id: 'u4',
        name: 'Thanh Dung',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxwb3J0cmFpdCUyMEFzaWFuJTIwbWFufGVufDF8fHx8MTc2OTY2NjM2OXww&ixlib=rb-4.1.0&q=80&w=400',
      },
      content: 'Viết lành luôn...',
      timestamp: '5 ngày',
      likes: 8,
    },
  ],
  '2': [
    {
      id: 'c5',
      author: {
        id: 'u5',
        name: 'Nguyễn Văn A',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxwb3J0cmFpdCUyMEFzaWFuJTIwbWFufGVufDF8fHx8MTc2OTY2NjM2OXww&ixlib=rb-4.1.0&q=80&w=400',
      },
      content: 'Nội dung rất hay và ý nghĩa!',
      timestamp: '2 giờ',
      likes: 45,
    },
    {
      id: 'c6',
      author: {
        id: 'u6',
        name: 'Lê Thị B',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw2fHxwb3J0cmFpdCUyMEFzaWFuJTIwd29tYW58ZW58MXx8fHwxNzY5NjY2MzY5fDA&ixlib=rb-4.1.0&q=80&w=400',
      },
      content: 'Cảm ơn đã chia sẻ ❤️',
      timestamp: '5 gi?',
      likes: 32,
    },
  ],
  '3': [
    {
      id: 'c7',
      author: {
        id: 'u7',
        name: 'Mai Anh',
        avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw3fHxwb3J0cmFpdCUyMEFzaWFuJTIwd29tYW58ZW58MXx8fHwxNzY5NjY2MzY5fDA&ixlib=rb-4.1.0&q=80&w=400',
      },
      content: 'Tutorial rất dễ hiểu, cảm ơn bạn!',
      timestamp: '1 ngày',
      likes: 89,
    },
  ],
};

export const WatchPage = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [searchParams] = useSearchParams();
  const reelId = searchParams.get('id');

  useEffect(() => {
    const fetchReels = async () => {
      try {
        setLoading(true);
        const currentUser = authService.getCurrentUser();
        const response = await postService.getAllPosts(currentUser?.id);
        const posts = response.content;

        // Filter posts with videos
        const videoPosts = posts.filter(post => 
          post.media?.some(m => m.mediaType === 'VIDEO')
        );

        const mappedReels = videoPosts.map((post): Reel => {
          const videoMedia = post.media.find(m => m.mediaType === 'VIDEO');
          const fallbackAvatar = `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(post.authorFullName || 'User')}`;
          
          return {
            id: post.id,
            videoUrl: videoMedia?.mediaUrl || videoMedia?.fileUrl || '',
            thumbnail: videoMedia?.mediaUrl || videoMedia?.fileUrl || '',
            creator: {
              id: post.authorId,
              name: post.authorFullName,
              avatar: post.authorAvatarUrl || fallbackAvatar,
            },
            caption: post.content || '',
            music: {
              name: 'Âm thanh gốc',
              artist: post.authorFullName,
            },
            likes: post.reactionCount,
            comments: post.commentCount,
            shares: post.shareCount,
            views: 0,
            duration: 0,
          };
        });

        setReels(mappedReels);

        // Handle direct link to reel
        if (reelId) {
          const index = mappedReels.findIndex(r => r.id === reelId);
          if (index !== -1) {
            setCurrentReelIndex(index);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải video:', error);
      } finally {
        setLoading(false);
      }
    };

    // If reels are already loaded, just update the index
    if (reels.length > 0 && reelId) {
      const index = reels.findIndex(r => r.id === reelId);
      if (index !== -1) {
        setCurrentReelIndex(index);
        return;
      }
    }

    void fetchReels();
  }, [reelId]);

  const currentReel = reels[currentReelIndex];


  const handlePrevious = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(currentReelIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(currentReelIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        handlePrevious();
      } else if (e.key === 'ArrowDown') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentReelIndex]);

  return (
    <div className="h-screen bg-black overflow-hidden">
      <Header />

      {/* Main Content Area */}
      <div className="mt-14 h-[calc(100vh-56px)] relative">
        {loading ? (
          <div className="flex h-full items-center justify-center text-white">Đang tải video...</div>
        ) : reels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white">Chưa có video nào.</div>
        ) : currentReel ? (
          <ReelPlayer
            reel={currentReel}
            onPrevious={handlePrevious}
            onNext={handleNext}
            hasPrevious={currentReelIndex > 0}
            hasNext={currentReelIndex < reels.length - 1}
          />
        ) : null}
      </div>

      {/* Progress Indicator */}
      {!loading && reels.length > 0 && (
        <div className="fixed top-14 left-0 right-0 h-1 bg-gray-800 z-50">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{
              width: `${((currentReelIndex + 1) / reels.length) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

