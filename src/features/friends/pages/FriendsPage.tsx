import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FriendsLeftSidebar, FriendCard, FriendRequestCard } from '../components';
import { FriendsTab } from '../components/FriendsLeftSidebar/FriendsLeftSidebar';
import { Friend, FriendRequest } from '../types/friends.types';
import { MainLayout } from '../../../layouts';
import { friendService, FRIENDSHIP_CHANGED_EVENT } from '../../../services/friendService';
import { authService } from '../../../services/authService';
import { toast } from 'sonner';

const PAGE_SIZE = 8;
const FRIEND_GRID_CLASS =
  'grid grid-cols-[repeat(auto-fill,minmax(min(190px,100%),1fr))] gap-3 sm:gap-4';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=random&name=User';

export const FriendsPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as FriendsTab) || 'home';
  const [activeTab, setActiveTab] = useState<FriendsTab>(initialTab);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => prev + PAGE_SIZE);
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    }
  }, []);

  const currentUser = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [requestsData, suggestionsData, friendsData] = await Promise.all([
        friendService.getFriendRequests(currentUser.id),
        friendService.getSuggestions(currentUser.id),
        friendService.getFriends(currentUser.id),
      ]).catch((err) => {
        toast.error(err.message || 'Không thể tải dữ liệu bạn bè');
        throw err;
      });

      setFriendRequests(
        requestsData.map((r) => ({
          id: r.friendshipId!,
          userId: r.userId,
          name: r.fullName,
          avatar: r.avatarUrl ?? DEFAULT_AVATAR,
          mutualFriends: r.mutualFriends,
          timestamp: r.createdAt
            ? new Date(r.createdAt).toLocaleDateString('vi-VN')
            : '',
        }))
      );

      setSuggestions(
        suggestionsData.map((s) => ({
          id: s.userId,
          userId: s.userId,
          name: s.fullName,
          avatar: s.avatarUrl ?? DEFAULT_AVATAR,
          mutualFriends: s.mutualFriends,
          isFriend: false,
        }))
      );

      setFriends(
        friendsData.map((f) => ({
          id: f.friendshipId!,
          userId: f.userId,
          name: f.fullName,
          avatar: f.avatarUrl ?? DEFAULT_AVATAR,
          mutualFriends: f.mutualFriends,
          isFriend: true,
        }))
      );
      setPendingRequests({});
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    window.addEventListener(FRIENDSHIP_CHANGED_EVENT, fetchData);
    return () => window.removeEventListener(FRIENDSHIP_CHANGED_EVENT, fetchData);
  }, [fetchData]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab]);

  const handleAcceptRequest = async (id: string) => {
    const target = friendRequests.find((r) => r.id === id);
    await friendService.acceptFriendRequest(id);
    setFriendRequests((prev) => prev.filter((req) => req.id !== id));
    toast.success(`Đã chấp nhận lời mời kết bạn từ ${target?.name ?? 'người dùng'}`);
  };

  const handleDeleteRequest = async (id: string) => {
    await friendService.deleteFriendship(id);
    setFriendRequests((prev) => prev.filter((req) => req.id !== id));
  };

  const handleAddFriend = async (userId: string) => {
    if (!currentUser) return;
    const target = suggestions.find((s) => s.userId === userId);
    const res = await friendService.sendFriendRequest(currentUser.id, userId);
    if (res.friendshipId) {
      setPendingRequests((prev) => ({ ...prev, [userId]: res.friendshipId! }));
    }
    toast.success(`Đã gửi lời mời kết bạn đến ${target?.name ?? 'người dùng'}`);
  };

  const handleCancelFriendRequest = async (userId: string) => {
    const friendshipId = pendingRequests[userId];
    if (!friendshipId) return;
    await friendService.deleteFriendship(friendshipId);
    setPendingRequests((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    toast.success('Đã hủy lời mời kết bạn');
  };

  const handleRemoveSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((sug) => sug.id !== id));
  };

  const handleUnfriend = async (id: string) => {
    await friendService.deleteFriendship(id);
    setFriends((prev) => prev.filter((f) => f.id !== id));
    window.dispatchEvent(new Event(FRIENDSHIP_CHANGED_EVENT));
    toast.success('Đã hủy kết bạn');
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-16 text-gray-500">Đang tải...</div>;
    }

    if (activeTab === 'requests') {
      return (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Lời mời kết bạn
            <span className="ml-2 text-gray-500 font-normal">{friendRequests.length}</span>
          </h2>
          {friendRequests.length === 0 ? (
            <p className="text-gray-500">Không có lời mời kết bạn nào.</p>
          ) : (
            <div className={FRIEND_GRID_CLASS}>
              {friendRequests.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeTab === 'suggestions') {
      const visible = suggestions.slice(0, visibleCount);
      const hasMore = visibleCount < suggestions.length;
      return (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Những người bạn có thể biết</h2>
          {suggestions.length === 0 ? (
            <p className="text-gray-500">Không có gợi ý nào.</p>
          ) : (
            <>
              <div className={FRIEND_GRID_CLASS}>
                {visible.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onAddFriend={handleAddFriend}
                    onCancelFriendRequest={handleCancelFriendRequest}
                    pendingFriendshipId={pendingRequests[friend.userId]}
                    onRemoveSuggestion={handleRemoveSuggestion}
                    showRemove
                  />
                ))}
              </div>
              {hasMore && <div ref={sentinelCallbackRef} className="h-8" />}
            </>
          )}
        </section>
      );
    }

    if (activeTab === 'all-friends') {
      const visible = friends.slice(0, visibleCount);
      const hasMore = visibleCount < friends.length;
      return (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Tất cả bạn bè
            <span className="ml-2 text-gray-500 font-normal">{friends.length}</span>
          </h2>
          {friends.length === 0 ? (
            <p className="text-gray-500">Bạn chưa có bạn bè nào.</p>
          ) : (
            <>
              <div className={FRIEND_GRID_CLASS}>
                {visible.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onUnfriend={handleUnfriend}
                  />
                ))}
              </div>
              {hasMore && <div ref={sentinelCallbackRef} className="h-8" />}
            </>
          )}
        </section>
      );
    }

    // home tab
    return (
      <>
        {friendRequests.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Lời mời kết bạn
                <span className="ml-2 text-gray-500 font-normal">{friendRequests.length}</span>
              </h2>
              <button
                onClick={() => setActiveTab('requests')}
                className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                Xem tất cả
              </button>
            </div>
            <div className={FRIEND_GRID_CLASS}>
              {friendRequests.slice(0, 4).map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          </section>
        )}

        {suggestions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Những người bạn có thể biết</h2>
              <button
                onClick={() => setActiveTab('suggestions')}
                className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                Xem tất cả
              </button>
            </div>
            <div className={FRIEND_GRID_CLASS}>
              {suggestions.slice(0, 4).map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onAddFriend={handleAddFriend}
                  onCancelFriendRequest={handleCancelFriendRequest}
                  pendingFriendshipId={pendingRequests[friend.userId]}
                  onRemoveSuggestion={handleRemoveSuggestion}
                  showRemove
                />
              ))}
            </div>
          </section>
        )}

        {friendRequests.length === 0 && suggestions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Không có lời mời kết bạn mới</h3>
            <p className="text-gray-600">Hãy khám phá và kết nối với những người bạn có thể biết</p>
          </div>
        )}
      </>
    );
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1920px]">
        <div className="flex min-w-0">
          <FriendsLeftSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            requestCount={friendRequests.length}
          />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </MainLayout>
  );
};
