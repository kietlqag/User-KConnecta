import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { friendService } from '@/services/friendService';
import {
  FriendsPreview,
  PhotosPreview,
  ProfileCreatePost,
  ProfilePosts,
} from '../components';
import { mapApiPost, type FeedPost } from '@/utils/postUtils';
import { POST_DELETED_EVENT } from '@/features/home/hooks/usePosts';
import { buildProfileDisplay, getProfileHeaderName } from '../utils/profileDisplayUtils';
import {
  extractPhotosFromPosts,
  fetchAllUserPosts,
  isAbortError,
} from '../utils/profilePhotoUtils';
import { useProfileLayoutContext } from './ProfileLayout';
import { logProfileTabError, useProfileTabDebug } from '../utils/profileTabLogger';

export function ProfilePage() {
  const { profile, resolvedId, isOwnProfile, friendsCount, loading: profileLoading } =
    useProfileLayoutContext();
  useProfileTabDebug('all', resolvedId);
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
    async (authorId: string, page = 0) => {
      if (!authorId) return;
      setPostsLoading(true);
      try {
        const res = await postService.getAllPosts(currentUser?.id, authorId, page, PAGE_SIZE);
        const mapped = res.content
          .filter((p: any) => !p.status || p.status === 'PUBLISHED')
          .sort(
            (a: any, b: any) =>
              new Date(b.publishedAt || b.createdAt).getTime() -
              new Date(a.publishedAt || a.createdAt).getTime(),
          )
          .map(mapApiPost);
        setPosts(mapped);
        setPostsPage(0);
        setHasMorePosts(res.number + 1 < res.totalPages);
      } catch (err) {
        logProfileTabError('all', 'load-posts', err, { resolvedId: authorId, page });
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    },
    [currentUser?.id],
  );

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

    setPosts([]);
    setFriends([]);
    setProfilePhotos([]);
    setPostsPage(0);
    setHasMorePosts(false);

    const controller = new AbortController();
    void fetchPosts(resolvedId);
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
        setFriends([]);
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
        .filter((p: any) => !p.status || p.status === 'PUBLISHED')
        .sort(
          (a: any, b: any) =>
            new Date(b.publishedAt || b.createdAt).getTime() -
            new Date(a.publishedAt || a.createdAt).getTime(),
        )
        .map(mapApiPost);
      setPosts(prev => [...prev, ...mapped]);
      setPostsPage(nextPage);
      setHasMorePosts(res.number + 1 < res.totalPages);
    } catch {
      // ignore
    } finally {
      setLoadingMorePosts(false);
    }
  }, [resolvedId, loadingMorePosts, postsPage, currentUser?.id]);

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
        <div className="space-y-4 lg:sticky lg:top-[136px] lg:max-h-[calc(100vh-136px)] lg:overflow-y-auto lg:pb-4 sidebar-scrollbar">
          <FriendsPreview userId={profilePathKey} friendsCount={friendsCount} friends={friends} />
          <PhotosPreview userId={profilePathKey} photos={profilePhotos.slice(0, 9)} />
        </div>

        <div className="space-y-4">
          {isOwnProfile && (
            <ProfileCreatePost
              username={getProfileHeaderName(userProfile)}
              onPostCreated={() => {
                void fetchPosts(resolvedId);
                void refreshProfilePhotos(resolvedId);
              }}
            />
          )}
          <ProfilePosts
            posts={posts}
            loading={loading}
            hasMore={hasMorePosts}
            loadingMore={loadingMorePosts}
            onLoadMore={handleLoadMorePosts}
            onDeletePost={handleDeletePost}
          />
        </div>
      </div>
    </div>
  );
}
