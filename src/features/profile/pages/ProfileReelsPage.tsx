import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Play, Clapperboard } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { friendService } from '@/services/friendService';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';
const DEFAULT_COVER  = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

interface Reel {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
}

function ReelSkeleton() {
  return (
    <div className="aspect-[9/16] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
  );
}

function extractReels(posts: any[]): Reel[] {
  return posts
    .filter(p => !p.status || p.status === 'PUBLISHED')
    .flatMap(post => {
      const videos = (post.media ?? []).filter((m: any) => m.mediaType === 'VIDEO');
      return videos.map((m: any) => ({
        id: `${post.id}-${m.id ?? Math.random()}`,
        title: post.content || 'Thước phim',
        thumbnail: m.mediaUrl || m.fileUrl || '',
        videoUrl: m.mediaUrl || m.fileUrl || '',
      }));
    });
}

export function ProfileReelsPage() {
  const { userId: routeUserId } = useParams();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const userId = React.useMemo(() => {
    if (!routeUserId || routeUserId === 'undefined') return currentUser?.id || '';
    return routeUserId;
  }, [routeUserId, currentUser?.id]);

  const [profile, setProfile]           = React.useState<any>(null);
  const [reels, setReels]               = React.useState<Reel[]>([]);
  const [friendsCount, setFriendsCount] = React.useState(0);
  const [loading, setLoading]           = React.useState(true);
  const [activeTab, setActiveTab]       = React.useState<'yours' | 'saved'>('yours');
  const [resolvedId, setResolvedId]     = React.useState('');

  const isOwnProfile = !!currentUser && (
    resolvedId ? currentUser.id === resolvedId : (userId === currentUser.id || userId === currentUser.username)
  );

  /* ---------- fetch ---------- */
  React.useEffect(() => {
    if (!userId || userId === 'undefined') { setLoading(false); return; }
    let cancelled = false;

    const run = async () => {
      try {
        let profileData: any;
        try { profileData = await authService.getUserById(userId); }
        catch { profileData = await authService.getUserByUsername(userId); }

        const id: string = profileData.id;

        const [friendsRes, postsRes] = await Promise.all([
          friendService.getFriends(id),
          postService.getAllPosts(currentUser?.id, id, 0, 50),
        ]);

        if (cancelled) return;
        setProfile(profileData);
        setResolvedId(id);
        setFriendsCount(friendsRes.length);
        setReels(extractReels(postsRes.content));
      } catch (err) {
        console.error('Error fetching reels:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [userId, currentUser?.id]);

  /* ---------- derived ---------- */
  const profilePathKey = profile?.username || userId;

  const userProfile = {
    fullName:   profile?.fullName      || 'Người dùng',
    username:   profile?.username      || '',
    avatar:     profile?.avatarUrl     || DEFAULT_AVATAR,
    coverPhoto: profile?.coverPhotoUrl || DEFAULT_COVER,
    location:   profile?.location      || '',
    school:     profile?.school        || '',
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Clapperboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reels</h2>
              </div>
            </div>

            {/* Inner tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
              {(['yours', 'saved'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab === 'yours' ? 'Thước phim của bạn' : 'Thước phim đã lưu'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'saved' ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-4 h-20 w-20">
                    <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <Play className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Chưa có thước phim đã lưu</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Khi bạn lưu thước phim, chúng sẽ xuất hiện ở đây.</p>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => <ReelSkeleton key={i} />)}
                </div>
              ) : reels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-4 h-20 w-20">
                    <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <Clapperboard className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Chưa có thước phim nào</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Các video từ bài viết sẽ xuất hiện ở đây.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {reels.map(reel => (
                    <div
                      key={reel.id}
                      className="relative aspect-[9/16] rounded-xl overflow-hidden group cursor-pointer bg-gray-200 dark:bg-gray-700"
                    >
                      {reel.thumbnail ? (
                        <ImageWithFallback
                          src={reel.thumbnail}
                          alt={reel.title}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <video
                          src={reel.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                            {reel.title}
                          </p>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/40 rounded-full p-3">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
