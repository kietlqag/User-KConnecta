import { Loader2, UserPlus } from 'lucide-react';
import { Friend } from '../../types/friends.types';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface SuggestionsSidebarProps {
  suggestions: Friend[];
  loading: boolean;
  selectedUserId: string | null;
  pendingRequests: Record<string, string>;
  hiddenIds: Set<string>;
  onSelect: (userId: string) => void;
  onAddFriend: (userId: string) => Promise<void>;
  onCancelFriendRequest: (userId: string) => Promise<void>;
  onRemove: (id: string) => void;
  onBack: () => void;
}

export const SuggestionsSidebar = ({
  suggestions,
  loading,
  selectedUserId,
  pendingRequests,
  hiddenIds,
  onSelect,
  onAddFriend,
  onCancelFriendRequest,
  onRemove,
  onBack,
}: SuggestionsSidebarProps) => {
  const visible = suggestions.filter((s) => !hiddenIds.has(s.id));

  return (
    <div className="hidden h-full w-[clamp(300px,24vw,380px)] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white md:flex">
      <div className="shrink-0 border-b border-gray-100 px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer"
            aria-label="Quay lại"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-500">Bạn bè</span>
        </div>
        <h1 className="text-[28px] font-bold leading-tight text-gray-900">Gợi ý</h1>
        <p className="mt-1 text-[15px] font-semibold text-gray-800">Những người bạn có thể biết</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sidebar-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : visible.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500">Không có gợi ý nào.</p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((friend) => (
              <li key={friend.id}>
                <SuggestionItem
                  friend={friend}
                  selected={selectedUserId === friend.userId}
                  isPending={!!pendingRequests[friend.userId]}
                  onSelect={onSelect}
                  onAddFriend={onAddFriend}
                  onCancelFriendRequest={onCancelFriendRequest}
                  onRemove={onRemove}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

interface SuggestionItemProps {
  friend: Friend;
  selected: boolean;
  isPending: boolean;
  onSelect: (userId: string) => void;
  onAddFriend: (userId: string) => Promise<void>;
  onCancelFriendRequest: (userId: string) => Promise<void>;
  onRemove: (id: string) => void;
}

const SuggestionItem = ({
  friend,
  selected,
  isPending,
  onSelect,
  onAddFriend,
  onCancelFriendRequest,
  onRemove,
}: SuggestionItemProps) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(friend.userId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(friend.userId);
        }
      }}
      className={`group flex cursor-pointer gap-2 rounded-lg p-2 transition-colors ${
        selected ? 'bg-emerald-50' : 'hover:bg-gray-100'
      }`}
    >
      <ImageWithFallback
        src={friend.avatar}
        alt={friend.name}
        className="h-[60px] w-[60px] shrink-0 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] font-semibold leading-tight ${
            selected ? 'text-emerald-800' : 'text-gray-900'
          }`}
        >
          {friend.name}
        </p>
        <p className="truncate text-[11px] leading-tight text-gray-500">
          {friend.mutualFriends > 0
            ? `${friend.mutualFriends} bạn chung`
            : 'Gợi ý cho bạn'}
        </p>

        <div className="mt-1.5 flex gap-1.5">
          {isPending ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onCancelFriendRequest(friend.userId);
              }}
              className="flex h-7 min-w-0 flex-1 items-center justify-center rounded-md bg-gray-200 px-2 text-[11px] font-semibold text-gray-800 transition-colors hover:bg-gray-300 cursor-pointer"
            >
              Hủy lời mời
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onAddFriend(friend.userId);
              }}
              className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
            >
              <UserPlus className="h-3 w-3 shrink-0" />
              <span className="truncate">Thêm bạn bè</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(friend.id);
            }}
            className="h-7 shrink-0 rounded-md bg-gray-200 px-3 text-[11px] font-semibold text-gray-800 transition-colors hover:bg-gray-300 cursor-pointer"
          >
            Gỡ
          </button>
        </div>
      </div>
    </div>
  );
};
