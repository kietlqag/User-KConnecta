import React, { useEffect, useState } from 'react';
import { UserPlus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/shared';
import { friendService, type FriendApiResponse } from '@/services/friendService';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

export const FriendSuggestions = () => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<FriendApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (!currentUser?.id) return;

    setLoading(true);
    friendService.getSuggestions(currentUser.id)
      .then((data) => {
        setSuggestions(data);
      })
      .catch((err) => {
        console.error('Failed to fetch suggestions:', err);
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  const handleAddFriend = async (targetId: string, name: string) => {
    if (!currentUser?.id) return;
    try {
      await friendService.sendFriendRequest(currentUser.id, targetId);
      toast.success(`Đã gửi lời mời kết bạn đến ${name}`);
      setSuggestions((prev) => prev.filter((s) => s.userId !== targetId));
    } catch (error) {
      toast.error('Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
    }
  };

  const handleRemoveSuggestion = (targetId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.userId !== targetId));
  };

  const scrollLeft = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const scrollRight = () => {
    setCurrentIndex((prev) => Math.min(suggestions.length - 1, prev + 1));
  };

  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow mb-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900 font-bold text-lg">Bạn bè có thể biết</h3>
        <button
          className="text-blue-600 text-sm font-medium hover:underline cursor-pointer"
          onClick={() => navigate('/friends?tab=suggestions')}
        >
          Xem tất cả
        </button>
      </div>

      <div className="relative group">
        <div className="flex gap-2 overflow-hidden scroll-smooth">
          {loading ? (
            <div className="flex gap-2 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[180px] h-[320px] bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div 
              className="flex gap-2 transition-transform duration-300 ease-in-out" 
              style={{ transform: `translateX(-${currentIndex * 188}px)` }}
            >
              {suggestions.map((user) => (
                <div 
                  key={user.userId}
                  className="min-w-[180px] w-[180px] flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div
                    className="h-[180px] overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/profile/${user.userId}`)}
                  >
                    <UserAvatar
                      name={user.fullName}
                      avatarUrl={user.avatarUrl}
                      userId={user.userId}
                    />
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h4
                        className="font-bold text-[15px] text-gray-900 line-clamp-1 hover:underline cursor-pointer"
                        onClick={() => navigate(`/profile/${user.userId}`)}
                      >
                        {user.fullName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.mutualFriends > 0 ? `${user.mutualFriends} bạn chung` : 'Gợi ý cho bạn'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAddFriend(user.userId, user.fullName)}
                        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
                      >
                        <UserPlus size={16} className="shrink-0" />
                        <span className="truncate">Thêm bạn bè</span>
                      </button>
                      <button
                        onClick={() => handleRemoveSuggestion(user.userId)}
                        className="flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 cursor-pointer"
                      >
                        <X size={16} />
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scroll Buttons */}
        {!loading && currentIndex > 0 && (
          <button 
            onClick={scrollLeft}
            className="absolute left-[-12px] top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-gray-600 hover:bg-gray-50 z-20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {!loading && suggestions.length > 3 && currentIndex < suggestions.length - 3 && (
          <button 
            onClick={scrollRight}
            className="absolute right-[-12px] top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-gray-600 hover:bg-gray-50 z-20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};
