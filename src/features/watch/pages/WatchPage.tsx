import { useState, useEffect } from 'react';
import { WatchHeader, ReelPlayer, ReelNavigation } from '../components';
import { Reel, ReelComment } from '../types/watch.types';
import reelImage from 'figma:asset/31a71acf4ef3fd228bada3a6b0e3bebe7634528f.png';
import reelImage2 from 'figma:asset/c7a8ce7ba396d53b08d61568bbcaba1bfb78fb98.png';

const mockReels: Reel[] = [
  {
    id: '1',
    videoUrl: reelImage,
    thumbnail: reelImage,
    creator: {
      id: '101',
      name: 'Sinh viên HCMUTE - Trường ĐH Công nghệ Kỹ thuật TPHCM',
      avatar: 'https://images.unsplash.com/photo-1695800998493-ccff5ea292ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHByb2Zlc3Npb25hbCUyMEFzaWFuJTIweG91bmclMjBtYW58ZW58MXx8fHwxNzY5NjY2MzY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      verified: true,
    },
    caption: 'Lễ tốt nghiệp HCMUTE năm nay... Xem thêm',
    music: {
      name: 'Nhạc truyền thống',
      artist: 'HCMUTE',
    },
    likes: 2400,
    comments: 108,
    shares: 59,
    views: 15000,
    duration: 30,
  },
  {
    id: '2',
    videoUrl: reelImage2,
    thumbnail: reelImage2,
    creator: {
      id: '102',
      name: 'Etang Rendezvous',
      avatar: 'https://images.unsplash.com/photo-1738566061505-556830f8b8f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGJ1c2luZXNzJTIwQXNpYW4lMjBtYW58ZW58MXx8fHwxNzY5NjY2MzcxfDA&ixlib=rb-4.1.0&q=80&w=1080',
      verified: true,
    },
    caption: 'Chăng trái chi chung vật cấu một thì khiến lẫn phủ nhi đại vennent vào không hào sát nghiệp !',
    music: {
      name: 'Âm thanh gốc',
      artist: 'Etang Rendezvous',
    },
    likes: 90800,
    comments: 251,
    shares: 313,
    views: 428500,
    duration: 45,
  },
  {
    id: '3',
    videoUrl: 'https://images.unsplash.com/photo-1718307701476-bf46ac964396?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGNhc3VhbCUyMFZpZXRuYW1lc2UlMjB3b21hbnxlbnwxfHx8fDE3Njk2NjYzNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    thumbnail: 'https://images.unsplash.com/photo-1718307701476-bf46ac964396?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGNhc3VhbCUyMFZpZXRuYW1lc2UlMjB3b21hbnxlbnwxfHx8fDE3Njk2NjYzNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    creator: {
      id: '103',
      name: 'Thu Hà',
      avatar: 'https://images.unsplash.com/photo-1718307701476-bf46ac964396?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGNhc3VhbCUyMFZpZXRuYW1lc2UlMjB3b21hbnxlbnwxfHx8fDE3Njk2NjYzNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      verified: true,
    },
    caption: 'Hướng dẫn trang điểm tự nhiên cho mùa hè ☀️ #makeup #beauty',
    music: {
      name: 'Summer Vibes',
      artist: 'Chill Beats',
    },
    likes: 3200,
    comments: 156,
    shares: 78,
    views: 22000,
    duration: 60,
  },
];

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
      content: 'Có lẽ một của SV và của GV của trường. Tình cờ xem clip thầy con đang phát biểu trong lễ tốt nghiệp trên một giảng đường rất... Xem thêm',
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
      content: '2 mẹ con rất vui về, cảm ơn minh thị',
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
      content: 'Cô bé nói giọng miền trung, Kg biết là mình Đinh hay Phú Thú ta 😂',
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
      content: 'Việt lành luôn...',
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
      content: 'Cảm ơn đã chia sẻ 🙏',
      timestamp: '5 giờ',
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
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const currentReel = mockReels[currentReelIndex];
  const currentComments = mockCommentsMap[currentReel.id] || [];

  const handlePrevious = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(currentReelIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentReelIndex < mockReels.length - 1) {
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
    <div className="min-h-screen bg-black">
      <WatchHeader />
      
      {/* Main Content Area */}
      <div className="pt-14 h-screen relative">
        <ReelPlayer 
          reel={currentReel} 
          comments={currentComments}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={currentReelIndex > 0}
          hasNext={currentReelIndex < mockReels.length - 1}
        />
      </div>

      {/* Progress Indicator */}
      <div className="fixed top-14 left-0 right-0 h-1 bg-gray-800 z-50">
        <div
          className="h-full bg-emerald-600 transition-all duration-300"
          style={{
            width: `${((currentReelIndex + 1) / mockReels.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};