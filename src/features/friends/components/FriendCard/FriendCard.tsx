import { useState } from 'react';
import { Loader2, MessageCircle, UserMinus, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Friend } from '../../types/friends.types';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface FriendCardProps {
  friend: Friend;
  onMessage?: (id: string) => void;
  onUnfriend?: (id: string) => Promise<void>;
  onAddFriend?: (userId: string) => Promise<void>;
  onCancelFriendRequest?: (userId: string) => Promise<void>;
  pendingFriendshipId?: string;
  onRemoveSuggestion?: (id: string) => void;
  showRemove?: boolean;
}

export const FriendCard = ({
  friend,
  onMessage,
  onUnfriend,
  onAddFriend,
  onCancelFriendRequest,
  pendingFriendshipId,
  onRemoveSuggestion,
  showRemove = false
}: FriendCardProps) => {
  const [loading, setLoading] = useState<'add' | 'cancel' | 'unfriend' | null>(null);

  const handleAdd = async () => {
    if (!onAddFriend) return;
    setLoading('add');
    try { await onAddFriend(friend.userId); } finally { setLoading(null); }
  };

  const handleCancel = async () => {
    if (!onCancelFriendRequest) return;
    setLoading('cancel');
    try { await onCancelFriendRequest(friend.userId); } finally { setLoading(null); }
  };

  const handleUnfriend = async () => {
    if (!onUnfriend) return;
    setLoading('unfriend');
    try { await onUnfriend(friend.id); } finally { setLoading(null); }
  };

  return (
    <div className="flex bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all p-3 gap-4">
      <Link to={`/profile/${friend.userId}`} className="relative flex-shrink-0">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden border dark:border-gray-700">
          <ImageWithFallback
            src={friend.avatar}
            alt={friend.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
        {showRemove && onRemoveSuggestion && (
          <button
            onClick={(e) => { e.preventDefault(); onRemoveSuggestion(friend.id); }}
            className="absolute -top-1 -right-1 p-1.5 bg-white dark:bg-gray-700 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </Link>
      
      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
        <div>
          <Link to={`/profile/${friend.userId}`} className="block">

            <h3 className="font-bold text-gray-900 dark:text-white mb-0.5 hover:underline truncate">
              {friend.name}
            </h3>
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {friend.mutualFriends > 0 ? `${friend.mutualFriends} bạn chung` : 'Chưa có bạn chung'}
          </p>
        </div>
        
        <div className="flex gap-2 mt-2">
          {friend.isFriend ? (
            <>
              {onMessage && (
                <button
                  onClick={() => onMessage(friend.id)}
                  className="flex-1 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Nhắn tin</span>
                </button>
              )}
              {onUnfriend && (
                <button
                  onClick={handleUnfriend}
                  disabled={loading !== null}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  {loading === 'unfriend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                </button>
              )}
            </>
          ) : pendingFriendshipId ? (
            <button
              onClick={handleCancel}
              disabled={loading !== null}
              className="w-full bg-gray-200 hover:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Hủy lời mời
            </button>
          ) : (
            onAddFriend && (
              <button
                onClick={handleAdd}
                disabled={loading !== null}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
              >
                {loading === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Thêm bạn bè
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
