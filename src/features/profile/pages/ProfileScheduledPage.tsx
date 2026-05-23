import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Trash2, FileText, Loader2 } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { authService } from '@/services/authService';
import { postService, type PostResponse } from '@/services/postService';
import { toast } from 'sonner';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

function formatScheduledAt(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function ProfileScheduledPage() {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const userId = React.useMemo(() => {
    if (!routeUserId || routeUserId === 'undefined') return currentUser?.id || '';
    return routeUserId;
  }, [routeUserId, currentUser?.id]);

  const isOwnProfile = !!currentUser && (userId === currentUser.id || userId === currentUser.username);

  const [profile, setProfile] = React.useState<any>(null);
  const [posts, setPosts] = React.useState<PostResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOwnProfile) {
      navigate(`/profile/${userId}`, { replace: true });
    }
  }, [isOwnProfile, userId, navigate]);

  React.useEffect(() => {
    if (!userId || userId === 'undefined' || !isOwnProfile) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, postsRes] = await Promise.all([
          authService.getUserById(userId).catch(() => authService.getUserByUsername(userId)),
          postService.getAllPosts(currentUser?.id, currentUser?.id, 0, 100, 'SCHEDULED'),
        ]);
        setProfile(profileRes);
        const scheduled = postsRes.content.filter(p => p.status === 'SCHEDULED');
        scheduled.sort((a, b) => new Date(a.scheduledAt || a.createdAt).getTime() - new Date(b.scheduledAt || b.createdAt).getTime());
        setPosts(scheduled);
      } catch (error) {
        console.error('Error fetching scheduled posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, currentUser?.id, isOwnProfile]);

  const handleDelete = async (postId: string) => {
    if (!currentUser) return;
    setDeletingId(postId);
    try {
      await postService.deletePost(postId, currentUser.id);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Đã xóa bài viết đã lên lịch');
    } catch {
      toast.error('Không thể xóa bài viết');
    } finally {
      setDeletingId(null);
    }
  };

  const userProfile = {
    id: profile?.id || userId,
    fullName: profile?.fullName || 'Người dùng',
    username: profile?.username || '',
    avatar: profile?.avatarUrl || DEFAULT_AVATAR,
    coverPhoto: profile?.coverPhotoUrl || DEFAULT_COVER,
    friendsCount: 0,
    location: profile?.location || '',
    school: profile?.school || '',
  };

  const profilePathKey = profile?.username || userId;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />

      <div className="pt-14">
        <ProfileHeader
          coverPhoto={loading ? undefined : userProfile.coverPhoto}
          avatar={loading ? undefined : userProfile.avatar}
          fullName={userProfile.fullName}
          username={userProfile.username}
          friendsCount={userProfile.friendsCount}
          location={userProfile.location}
          school={userProfile.school}
          isOwnProfile={isOwnProfile}
          loading={loading}
        />

        <ProfileTabs profileKey={profilePathKey} isOwnProfile={isOwnProfile} />

        <div className="max-w-[680px] mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-gray-200 dark:border-gray-700">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bài viết đã lên lịch</h2>
              <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 font-medium">{posts.length} bài</span>
            </div>

            {posts.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-center">
                <div className="relative mb-4 h-20 w-20">
                  <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Chưa có bài viết lên lịch</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Các bài viết bạn đặt lịch đăng sẽ xuất hiện ở đây.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {posts.map(post => (
                  <div key={post.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {formatScheduledAt(post.scheduledAt)}
                          </span>
                        </div>

                        {post.content && (
                          <p className="text-gray-800 dark:text-gray-200 text-[15px] line-clamp-3 whitespace-pre-wrap mb-3">
                            {post.content}
                          </p>
                        )}

                        {post.media && post.media.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {post.media.slice(0, 3).map((m, i) =>
                              m.mediaType === 'IMAGE' ? (
                                <img
                                  key={i}
                                  src={m.mediaUrl || m.fileUrl}
                                  alt=""
                                  className="h-20 w-20 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                                />
                              ) : (
                                <div key={i} className="h-20 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                  <span className="text-xs text-gray-500">Video</span>
                                </div>
                              )
                            )}
                            {post.media.length > 3 && (
                              <div className="h-20 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">+{post.media.length - 3}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                            {post.privacy === 'PUBLIC' ? 'Công khai' : post.privacy === 'FRIENDS' ? 'Bạn bè' : 'Riêng tư'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="shrink-0 p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Xóa bài viết"
                      >
                        {deletingId === post.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
