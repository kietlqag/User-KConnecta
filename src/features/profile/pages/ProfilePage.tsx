import * as React from 'react';
import { useSearchParams, useNavigationType } from 'react-router-dom';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { friendService } from '@/services/friendService';
import {
  FriendsPreview,
  PhotosPreview,
  ProfileCreatePost,
  ProfilePosts,
} from '../components';
import { mapApiPost, type FeedPost, isProfileVisiblePost, mergeProfilePostList } from '@/utils/postUtils';
import type { PostResponse } from '@/services/postService';
import { POST_DELETED_EVENT } from '@/features/home/hooks/usePosts';
import { buildProfileDisplay, getProfileHeaderName } from '../utils/profileDisplayUtils';
import {
  extractPhotosFromPosts,
  fetchAllUserPosts,
  isAbortError,
} from '../utils/profilePhotoUtils';
import { useProfileLayoutContext } from './ProfileLayout';
import { logProfileTabError, useProfileTabDebug } from '../utils/profileTabLogger';
import {
  getProfilePageCache,
  setProfilePageCache,
  updateProfilePageScroll,
} from '../utils/profileSessionCache';

export function ProfilePage() {
  const { profile, resolvedId, isOwnProfile, friendsCount, loading: profileLoading } =
    useProfileLayoutContext();
  useProfileTabDebug('all', resolvedId);
  const navigationType = useNavigationType();
  const [searchParams] = useSearchParams();
  const highlightPostId = searchParams.get('post');
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [friends, setFriends] = React.useState<
    { id: string; username?: string; name: string; avatarUrl?: string | null }[]
  >([]);
  const [postsLoading, setPostsLoading] = React.useState(false);
  const [hasMorePosts, setHasMorePosts] = React.useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = React.useState(false);
  const [postsPage, setPostsPage] = React.useState(0);
  const [profilePhotos, setProfilePhotos] = React.useState<{ id: string; url: string }[]>([]);

  const PAGE_SIZE = 10;

  const refreshProfilePhotos = React.useCallback(async (authorId: string, signal?: AbortSignal) => {
    try {
      const allPosts = await fetchAllUserPosts(authorId, currentUser?.id, signal);
      setProfilePhotos(extractPhotosFromPosts(allPosts).map(({ id, url }) => ({ id, url })));
    } catch (error) {
      if (isAbortError(error)) return;
      logProfileTabError('all', 'load-photos', error, { resolvedId: authorId });
      setProfilePhotos([]);
    }
  }, [currentUser?.id]);

  const fetchPosts = React.useCallback(
    async (authorId: string, page = 0, options?: { silent?: boolean }) => {
      if (!authorId) return;
      if (!options?.silent) setPostsLoading(true);
      try {
        const res = await postService.getAllPosts(currentUser?.id, authorId, page, PAGE_SIZE);
        const mapped = res.content
          .filter((p) => isProfileVisiblePost(p, isOwnProfile))
          .map(mapApiPost);
        setPosts(mapped);
        setPostsPage(0);
        setHasMorePosts(res.number + 1 < res.totalPages);
      } catch (err) {
        logProfileTabError('all', 'load-posts', err, { resolvedId: authorId, page });
        if (!options?.silent) setPosts([]);
      } finally {
        if (!options?.silent) setPostsLoading(false);
      }
    },
    [currentUser?.id, isOwnProfile],
  );

  const pageStateRef = React.useRef({
    posts,
    friends,
    profilePhotos,
    postsPage,
    hasMorePosts,
  });
  pageStateRef.current = { posts, friends, profilePhotos, postsPage, hasMorePosts };

  React.useLayoutEffect(() => {
    if (!resolvedId || navigationType !== 'POP') return;
    const cached = getProfilePageCache(resolvedId);
    if (cached?.scrollY == null) return;
    requestAnimationFrame(() => window.scrollTo(0, cached.scrollY));
  }, [resolvedId, navigationType]);

  React.useEffect(() => {
    if (!resolvedId) return;
    return () => {
      const state = pageStateRef.current;
      if (state.posts.length === 0 && state.friends.length === 0 && state.profilePhotos.length === 0) {
        return;
      }
      setProfilePageCache(resolvedId, {
        ...state,
        scrollY: window.scrollY,
      });
    };
  }, [resolvedId]);

  React.useEffect(() => {
    if (!resolvedId || postsLoading) return;
    setProfilePageCache(resolvedId, {
      posts,
      friends,
      profilePhotos,
      postsPage,
      hasMorePosts,
      scrollY: window.scrollY,
    });
  }, [resolvedId, posts, friends, profilePhotos, postsPage, hasMorePosts, postsLoading]);

  React.useEffect(() => {
    const onScroll = () => {
      if (resolvedId) updateProfilePageScroll(resolvedId, window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [resolvedId]);

  React.useEffect(() => {
    if (!isOwnProfile || !resolvedId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchPosts(resolvedId, 0, { silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isOwnProfile, resolvedId, fetchPosts]);

  React.useEffect(() => {
    if (!isOwnProfile || !resolvedId) return;
    const hasUpcomingScheduled = posts.some(
      (p) => p.status === 'SCHEDULED' && p.scheduledAt && new Date(p.scheduledAt).getTime() > Date.now() - 60_000,
    );
    if (!hasUpcomingScheduled) return;
    const timer = window.setInterval(() => void fetchPosts(resolvedId, 0, { silent: true }), 60_000);
    return () => window.clearInterval(timer);
  }, [isOwnProfile, resolvedId, posts, fetchPosts]);

  React.useEffect(() => {
    if (!resolvedId) {
      setPosts([]);
      setFriends([]);
      setProfilePhotos([]);
      setPostsLoading(false);
      setHasMorePosts(false);
      setPostsPage(0);
      return;
    }

    const cached = getProfilePageCache(resolvedId);
    const usedCache = Boolean(cached);
    if (cached) {
      setPosts(cached.posts);
      setFriends(cached.friends);
      setProfilePhotos(cached.profilePhotos);
      setPostsPage(cached.postsPage);
      setHasMorePosts(cached.hasMorePosts);
      setPostsLoading(false);
    } else {
      setPosts([]);
      setFriends([]);
      setProfilePhotos([]);
      setPostsPage(0);
      setHasMorePosts(false);
    }

    const controller = new AbortController();
    void fetchPosts(resolvedId, 0, { silent: usedCache });
    void refreshProfilePhotos(resolvedId, controller.signal);
    friendService
      .getFriends(resolvedId)
      .then(res =>
        setFriends(
          res.map((f: any) => ({
            id: f.userId,
            username: f.username,
            name: f.fullName,
            avatarUrl: f.avatarUrl,
          })),
        ),
      )
      .catch((err) => {
        logProfileTabError('all', 'load-friends-preview', err, { resolvedId });
        if (!usedCache) setFriends([]);
      });
    return () => controller.abort();
  }, [resolvedId, fetchPosts, refreshProfilePhotos]);

  const handleLoadMorePosts = React.useCallback(async () => {
    if (!resolvedId || loadingMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const nextPage = postsPage + 1;
      const res = await postService.getAllPosts(currentUser?.id, resolvedId, nextPage, PAGE_SIZE);
      const mapped = res.content
        .filter((p) => isProfileVisiblePost(p, isOwnProfile))
        .map(mapApiPost);
      setPosts(prev => [...prev, ...mapped]);
      setPostsPage(nextPage);
      setHasMorePosts(res.number + 1 < res.totalPages);
    } catch {
      // ignore
    } finally {
      setLoadingMorePosts(false);
    }
  }, [resolvedId, loadingMorePosts, postsPage, currentUser?.id, isOwnProfile]);

  const handlePostCreated = React.useCallback(
    (post: PostResponse) => {
      const mapped = mapApiPost(post);
      setPosts((prev) => mergeProfilePostList(prev, mapped));
      void refreshProfilePhotos(resolvedId);
    },
    [resolvedId, refreshProfilePhotos],
  );

  const handlePostUpdated = React.useCallback((updated: PostResponse) => {
    const mapped = mapApiPost(updated);
    setPosts((prev) => mergeProfilePostList(prev, mapped));
    if (updated.status === 'PUBLISHED') {
      void refreshProfilePhotos(resolvedId);
    }
  }, [resolvedId, refreshProfilePhotos]);

  const handleDeletePost = React.useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  React.useEffect(() => {
    const onPostDeleted = (event: Event) => {
      const postId = (event as CustomEvent<{ postId: string }>).detail?.postId;
      if (postId) handleDeletePost(postId);
    };
    window.addEventListener(POST_DELETED_EVENT, onPostDeleted);
    return () => window.removeEventListener(POST_DELETED_EVENT, onPostDeleted);
  }, [handleDeletePost]);

  const scrolledHighlightRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    scrolledHighlightRef.current = null;
  }, [highlightPostId]);

  React.useEffect(() => {
    if (!highlightPostId || posts.length === 0) return;
    if (scrolledHighlightRef.current === highlightPostId) return;

    const timer = setTimeout(() => {
      const element = document.getElementById(`post-${highlightPostId}`);
      if (!element) return;
      scrolledHighlightRef.current = highlightPostId;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2', 'rounded-lg');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2');
      }, 3000);
    }, 500);
    return () => clearTimeout(timer);
  }, [highlightPostId, posts.length]);

  const userProfile = buildProfileDisplay(profile, {
    currentUser,
    fallbackUserId: resolvedId,
    preferCurrentUserMedia: isOwnProfile,
  });

  const profilePathKey = profile?.username || resolvedId;

  const loading = profileLoading || postsLoading;

  return (
    <div className="max-w-[1320px] mx-auto px-4 py-4 lg:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.55fr)] gap-4 lg:gap-6 items-start">
        <div className="space-y-4 lg:sticky lg:top-[136px] lg:max-h-[calc(100vh-136px)] lg:overflow-y-auto lg:overflow-x-hidden lg:pb-4 lg:pr-0.5 sidebar-scrollbar">
          <FriendsPreview userId={profilePathKey} friendsCount={friendsCount} friends={friends} />
          <PhotosPreview userId={profilePathKey} photos={profilePhotos.slice(0, 9)} />
        </div>

        <div className="space-y-4">
          {isOwnProfile && (
            <ProfileCreatePost
              username={getProfileHeaderName(userProfile)}
              onPostCreated={handlePostCreated}
            />
          )}
          <ProfilePosts
            posts={posts}
            loading={loading}
            hasMore={hasMorePosts}
            loadingMore={loadingMorePosts}
            onLoadMore={handleLoadMorePosts}
            onDeletePost={handleDeletePost}
            onPostUpdated={handlePostUpdated}
          />
        </div>
      </div>
    </div>
  );
}
