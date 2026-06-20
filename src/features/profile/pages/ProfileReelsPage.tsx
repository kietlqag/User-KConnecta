import * as React from 'react';
import { Play, Clapperboard } from 'lucide-react';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { useProfileLayoutContext } from './ProfileLayout';

interface Reel {
  id: string;
  title: string;
  videoUrl: string;
}

function ReelSkeleton() {
  return <div className="aspect-[9/16] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />;
}

function extractReels(posts: any[]): Reel[] {
  return posts
    .filter(p => !p.status || p.status === 'PUBLISHED')
    .flatMap(post => {
      const videos = (post.media ?? []).filter((m: any) => m.mediaType === 'VIDEO');
      // Also check imageUrl if it looks like a video (no media array but imageUrl exists)
      if (videos.length === 0 && post.imageUrl && post.mediaType === 'VIDEO') {
        return [{
          id: post.id,
          title: post.content || 'Thước phim',
          videoUrl: post.imageUrl,
        }];
      }
      return videos.map((m: any, i: number) => ({
        id: `${post.id}-${m.id ?? i}`,
        title: post.content || 'Thước phim',
        videoUrl: m.mediaUrl || m.fileUrl || '',
      }));
    })
    .filter(r => r.videoUrl);
}

export function ProfileReelsPage() {
  const { resolvedId, loading: profileLoading } = useProfileLayoutContext();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const [reels, setReels] = React.useState<Reel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'yours' | 'saved'>('yours');

  React.useEffect(() => {
    if (!resolvedId) return;
    let cancelled = false;
    setLoading(true);

    postService.getAllPosts(currentUser?.id, resolvedId, 0, 50).then(res => {
      if (cancelled) return;
      setReels(extractReels(res.content));
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [resolvedId, currentUser?.id]);

  const isLoadingContent = profileLoading || loading;

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clapperboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reels</h2>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
          {(['yours', 'saved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-muted'
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
          ) : isLoadingContent ? (
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
                  className="relative aspect-[9/16] rounded-xl overflow-hidden group cursor-pointer bg-gray-900"
                >
                  <video
                    src={reel.videoUrl}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    muted
                    preload="metadata"
                  />
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
  );
}
