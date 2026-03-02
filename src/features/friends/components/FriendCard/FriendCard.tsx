import { MessageCircle, UserMinus, UserPlus, X } from 'lucide-react';
import { Friend } from '../../types/friends.types';

interface FriendCardProps {
  friend: Friend;
  onMessage?: (id: string) => void;
  onUnfriend?: (id: string) => void;
  onAddFriend?: (id: string) => void;
  onRemoveSuggestion?: (id: string) => void;
  showRemove?: boolean;
}

export const FriendCard = ({ 
  friend, 
  onMessage, 
  onUnfriend, 
  onAddFriend,
  onRemoveSuggestion,
  showRemove = false 
}: FriendCardProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        <img
          src={friend.avatar}
          alt={friend.name}
          className="w-full h-[280px] object-cover"
        />
        {showRemove && onRemoveSuggestion && (
          <button
            onClick={() => onRemoveSuggestion(friend.id)}
            className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 hover:underline cursor-pointer">
          {friend.name}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          {friend.mutualFriends} bạn chung
        </p>
        
        <div className="flex gap-2">
          {friend.isFriend ? (
            <>
              {onMessage && (
                <button
                  onClick={() => onMessage(friend.id)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Nhắn tin
                </button>
              )}
              {onUnfriend && (
                <button
                  onClick={() => onUnfriend(friend.id)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <UserMinus className="w-4 h-4" />
                  Hủy kết bạn
                </button>
              )}
            </>
          ) : (
            onAddFriend && (
              <button
                onClick={() => onAddFriend(friend.id)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Thêm bạn bè
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
