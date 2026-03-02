import { Plus } from 'lucide-react';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface Story {
  id: string;
  userName: string;
  userAvatar: string;
  isCreate?: boolean;
}

export function Stories() {
  const stories: Story[] = [
    { id: '0', userName: 'Tạo tin', userAvatar: '', isCreate: true },
    { id: '1', userName: 'Nguyễn Đạp Thành', userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { id: '2', userName: 'Quỳnh Phạm', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { id: '3', userName: 'Nhà sách sự kiện', userAvatar: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=150' },
    { id: '4', userName: 'Lương Văn Đức', userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
    { id: '5', userName: 'Nguyễn Văn A', userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
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