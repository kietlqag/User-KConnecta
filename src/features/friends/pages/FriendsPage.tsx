import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FriendsLeftSidebar, FriendCard, FriendRequestCard } from '../components';
import { BirthdayPage } from '@/features/birthdays/components';
import { FriendsTab } from '../components/FriendsLeftSidebar/FriendsLeftSidebar';
import { MainLayout } from '../../../layouts';
import { friendService, FRIENDSHIP_CHANGED_EVENT } from '../../../services/friendService';
import { authService } from '../../../services/authService';
import { toast } from 'sonner';
import { useFriendsPageData } from '../hooks/useFriendsPageData';

const PAGE_SIZE = 8;
const HOME_SUGGESTIONS_MAX = 40;
const FRIEND_GRID_CLASS =
  'grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5';

export const FriendsPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab') as FriendsTab | 'custom-lists' | 'suggestions' | null;
  const initialTab: FriendsTab =
    initialTabParam &&
    initialTabParam !== 'custom-lists' &&
    initialTabParam !== 'suggestions' &&
    ['home', 'requests', 'all-friends', 'birthdays'].includes(initialTabParam)
      ? initialTabParam
      : 'home';
  const [activeTab, setActiveTab] = useState<FriendsTab>(initialTab);
  const [pendingRequests, setPendingRequests] = useState<Record<string, string>>({});
  const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState<Set<string>>(() => new Set());
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
  const { friendRequests, suggestions, friends, loading, error, refetch } = useFriendsPageData(
    currentUser?.id,
    activeTab,
  );

  useEffect(() => {
    if (error) {
      toast.error((error as Error).message || t('friendsPage.loadError'));
    }
  }, [error]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab]);

  const handleAcceptRequest = async (id: string) => {
    const target = friendRequests.find((r) => r.id === id);
    await friendService.acceptFriendRequest(id);
    refetch();
    toast.success(t('friendsPage.acceptSuccess', { name: target?.name ?? t('friendsPage.unknownUser') }));
  };

  const handleDeleteRequest = async (id: string) => {
    await friendService.deleteFriendship(id);
    refetch();
  };

  const handleAddFriend = async (userId: string) => {
    if (!currentUser) return;
    const target = suggestions.find((s) => s.userId === userId);
    const res = await friendService.sendFriendRequest(currentUser.id, userId);
    if (res.friendshipId) {
      setPendingRequests((prev) => ({ ...prev, [userId]: res.friendshipId! }));
    }
    toast.success(t('friendsPage.sendSuccess', { name: target?.name ?? t('friendsPage.unknownUser') }));
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
    toast.success(t('friendsPage.cancelSuccess'));
  };

  const handleRemoveSuggestion = (id: string) => {
    setHiddenSuggestionIds((prev) => new Set(prev).add(id));
  };

  const visibleSuggestions = suggestions.filter((s) => !hiddenSuggestionIds.has(s.id));
  const homeSuggestions = visibleSuggestions.slice(0, HOME_SUGGESTIONS_MAX);
  const visibleHomeSuggestions = homeSuggestions.slice(0, visibleCount);
  const hasMoreHomeSuggestions = visibleCount < homeSuggestions.length;

  const handleUnfriend = async (id: string) => {
    await friendService.deleteFriendship(id);
    window.dispatchEvent(new Event(FRIENDSHIP_CHANGED_EVENT));
    toast.success(t('friendsPage.unfriendSuccess'));
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-16 text-muted-foreground">{t('friendsPage.loading')}</div>;
    }

    if (activeTab === 'requests') {
      return (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">
            {t('friendsPage.requests')}
            <span className="ml-2 text-muted-foreground font-normal">{friendRequests.length}</span>
          </h2>
          {friendRequests.length === 0 ? (
            <p className="text-muted-foreground">{t('friendsPage.noRequests')}</p>
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

    if (activeTab === 'birthdays') {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <BirthdayPage />
        </div>
      );
    }

    if (activeTab === 'all-friends') {
      const visible = friends.slice(0, visibleCount);
      const hasMore = visibleCount < friends.length;
      return (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">
            {t('friendsPage.allFriends')}
            <span className="ml-2 text-muted-foreground font-normal">{friends.length}</span>
          </h2>
          {friends.length === 0 ? (
            <p className="text-muted-foreground">{t('friendsPage.noFriends')}</p>
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
              <h2 className="text-xl font-bold text-foreground">
                {t('friendsPage.requests')}
                <span className="ml-2 text-muted-foreground font-normal">{friendRequests.length}</span>
              </h2>
              <button
                onClick={() => setActiveTab('requests')}
                className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                {t('friendsPage.seeAll')}
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

        {homeSuggestions.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-foreground">
              {t('friendsPage.peopleYouMayKnow')}
            </h2>
            <div className={FRIEND_GRID_CLASS}>
              {visibleHomeSuggestions.map((friend) => (
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
            {hasMoreHomeSuggestions && <div ref={sentinelCallbackRef} className="h-8" />}
          </section>
        )}

        {friendRequests.length === 0 && homeSuggestions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-muted-foreground mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">{t('friendsPage.emptyTitle')}</h3>
            <p className="text-muted-foreground">{t('friendsPage.emptyDesc')}</p>
          </div>
        )}
      </>
    );
  };

  return (
    <MainLayout>
      <div className="mx-auto h-[calc(100vh-3.5rem)] max-w-[1920px] overflow-hidden">
        <div className="flex h-full min-w-0">
          <FriendsLeftSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            requestCount={friendRequests.length}
          />
          <main
            className={`min-h-0 min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 ${ activeTab === 'birthdays' ? 'flex flex-col overflow-hidden' : 'overflow-y-scroll overscroll-contain [scrollbar-gutter:stable] sidebar-scrollbar' }`}
          >
            {renderContent()}
          </main>
        </div>
      </div>
    </MainLayout>
  );
};
