import * as React from 'react';
import { useParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Images, Loader2 } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { friendService } from '@/services/friendService';

interface Photo {
  id: string;
  url: string;
  postId: string;
  date: string;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';
const DEFAULT_COVER  = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';
const PAGE_SIZE = 20;

function PhotoSkeleton() {
  return (
    <div className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
  );
}

function extractPhotos(posts: any[]): Photo[] {
  return posts
    .filter(p => !p.status || p.status === 'PUBLISHED')
    .flatMap(post =>
      (post.media ?? [])
        .filter((m: any) => m.mediaType === 'IMAGE')
        .map((m: any) => {
          const url = m.mediaUrl || m.fileUrl;
          return url ? {
            id: `${post.id}-${m.id ?? Math.random()}`,
            url,
            postId: post.id,
            date: new Date(post.publishedAt || post.createdAt).toLocaleDateString('vi-VN', {
              day: 'numeric', month: 'long', year: 'numeric',
            }),
          } : null;
        })
        .filter(Boolean) as Photo[]
    );
}

export function ProfilePhotosPage() {
  const { userId: routeUserId } = useParams();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const userId = React.useMemo(() => {
    if (!routeUserId || routeUserId === 'undefined') return currentUser?.id || '';
    return routeUserId;
  }, [routeUserId, currentUser?.id]);

  const [profile, setProfile]           = React.useState<any>(null);
  const [authorId, setAuthorId]         = React.useState<string>('');
  const [photos, setPhotos]             = React.useState<Photo[]>([]);
  const [friendsCount, setFriendsCount] = React.useState(0);
  const [loading, setLoading]           = React.useState(true);
  const [loadingMore, setLoadingMore]   = React.useState(false);
  const [postsPage, setPostsPage]       = React.useState(0);
  const [hasMore, setHasMore]           = React.useState(false);

  // Lightbox state
  const [lbIndex, setLbIndex] = React.useState<number | null>(null);

  const isOwnProfile = !!currentUser && (
    userId === currentUser.id || userId === currentUser.username
  );

  /* ---------- initial fetch ---------- */
  React.useEffect(() => {
    if (!userId || userId === 'undefined') { setLoading(false); return; }
    let cancelled = false;

    const run = async () => {
      try {
        let profileData: any;
        try { profileData = await authService.getUserById(userId); }
        catch { profileData = await authService.getUserByUsername(userId); }

        const resolvedId: string = profileData.id;

        const [friendsRes, postsRes] = await Promise.all([
          friendService.getFriends(resolvedId),
          postService.getAllPosts(currentUser?.id, resolvedId, 0, PAGE_SIZE),
        ]);

        if (cancelled) return;
        setProfile(profileData);
        setAuthorId(resolvedId);
        setFriendsCount(friendsRes.length);
        setPhotos(extractPhotos(postsRes.content));
        setPostsPage(0);
        setHasMore(postsRes.number + 1 < postsRes.totalPages);
      } catch (err) {
        console.error('Error fetching photos:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [userId, currentUser?.id]);

  /* ---------- load more ---------- */
  const handleLoadMore = async () => {
    if (loadingMore || !authorId) return;
    setLoadingMore(true);
    try {
      const nextPage = postsPage + 1;
      const res = await postService.getAllPosts(currentUser?.id, authorId, nextPage, PAGE_SIZE);
      setPhotos(prev => [...prev, ...extractPhotos(res.content)]);
      setPostsPage(nextPage);
      setHasMore(res.number + 1 < res.totalPages);
    } catch (err) {
      console.error('Error loading more photos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  /* ---------- lightbox keyboard ---------- */
  React.useEffect(() => {
    if (lbIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      closeLightbox();
      if (e.key === 'ArrowLeft')   prev();
      if (e.key === 'ArrowRight')  next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lbIndex, photos.length]);

  /* ---------- lightbox scroll lock ---------- */
  React.useEffect(() => {
    document.body.style.overflow = lbIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lbIndex]);

  const openLightbox  = (i: number) => setLbIndex(i);
  const closeLightbox = () => setLbIndex(null);
  const prev = () => setLbIndex(i => (i === null ? null : i === 0 ? photos.length - 1 : i - 1));
  const next = () => setLbIndex(i => (i === null ? null : i === photos.length - 1 ? 0 : i + 1));

  /* ---------- derived ---------- */
  const profilePathKey = profile?.username || userId;

  const userProfile = {
    fullName:    profile?.fullName    || 'Người dùng',
    username:    profile?.username    || '',
    avatar:      profile?.avatarUrl   || DEFAULT_AVATAR,
    coverPhoto:  profile?.coverPhotoUrl || DEFAULT_COVER,
    location:    profile?.location    || '',
    school:      profile?.school      || '',
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />

      <div className="pt-14">
        <ProfileHeader
          coverPhoto={loading ? undefined : userProfile.coverPhoto}
          avatar={loading ? undefined : userProfile.avatar}
          fullName={userProfile.fullName}
          username={userProfile.username}
          friendsCount={friendsCount}
          location={userProfile.location}
          school={userProfile.school}
          isOwnProfile={isOwnProfile}
          loading={loading}
        />

        <ProfileTabs profileKey={profilePathKey} isOwnProfile={isOwnProfile} />

        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <Images className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Ảnh
                {!loading && (
                  <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
                    · {photos.length}
                  </span>
                )}
              </h2>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {Array.from({ length: 15 }).map((_, i) => <PhotoSkeleton key={i} />)}
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-4 h-20 w-20">
                  <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <Images className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Chưa có ảnh nào</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Các ảnh từ bài viết sẽ xuất hiện ở đây.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-700"
                      onClick={() => openLightbox(index)}
                    >
                      <ImageWithFallback
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-end">
                        <p className="w-full px-2 py-1.5 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                          {photo.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-60"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang tải...
                        </>
                      ) : (
                        'Tải thêm ảnh'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lbIndex !== null && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            onClick={closeLightbox}
          >
            <X className="w-7 h-7" />
          </button>

          {/* Counter */}
          <span className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-medium px-3 py-1 rounded-full">
            {lbIndex + 1} / {photos.length}
          </span>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              onClick={e => { e.stopPropagation(); prev(); }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <img
            src={photos[lbIndex].url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
            onClick={e => e.stopPropagation()}
          />

          {/* Date */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {photos[lbIndex].date}
          </p>

          {/* Next */}
          {photos.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              onClick={e => { e.stopPropagation(); next(); }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
