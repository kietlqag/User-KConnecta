import { useEffect, useMemo, useRef, useState } from 'react';
import { Home, Shapes, FileText, Loader2 } from 'lucide-react';
import type { FeedPost, PostSourceTab } from '@/utils/postUtils';
import { groupPostsBySource } from '@/utils/postUtils';
import { Post } from '../../../../components/shared/Post';

const TAB_CONFIG: { key: PostSourceTab; label: string; icon: typeof Home }[] = [
  { key: 'feed', label: 'Bảng feed', icon: Home },
  { key: 'group', label: 'Nhóm', icon: Shapes },
];

function getEmptyState(tab: PostSourceTab) {
  switch (tab) {
    case 'group':
      return {
        title: 'Chưa có bài viết trong nhóm',
        description: 'Các bài viết bạn đăng trong nhóm sẽ hiển thị ở đây.',
      };
    default:
      return {
        title: 'Chưa có bài viết trên bảng feed',
        description: 'Các bài viết bạn đăng lên bảng tin sẽ hiển thị ở đây.',
      };
  }
}

interface ProfilePostsProps {
  posts: FeedPost[];
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 animate-pulse">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full" />
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-4/5" />
        </div>
      </div>
      <div className="h-48 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 flex justify-between">
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export function ProfilePosts({ posts, loading = false, hasMore = false, loadingMore = false, onLoadMore }: ProfilePostsProps) {
  const [activeTab, setActiveTab] = useState<PostSourceTab>('feed');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const postsByTab = useMemo(() => groupPostsBySource(posts), [posts]);

  const filteredPosts = postsByTab[activeTab];
  const emptyState = getEmptyState(activeTab);

  useEffect(() => {
    if (loading || posts.length === 0) return;
    if (postsByTab[activeTab].length > 0) return;
    const nextTab = TAB_CONFIG.find(({ key }) => postsByTab[key].length > 0)?.key;
    if (nextTab) setActiveTab(nextTab);
  }, [loading, posts.length, postsByTab, activeTab]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          hasMoreRef.current &&
          !loadingMoreRef.current &&
          onLoadMoreRef.current
        ) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: '0px 0px 400px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, hasMore, posts.length, activeTab, filteredPosts.length]);

  if (loading) {
    return (
      <div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none overflow-hidden mb-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bài viết</h2>
        </div>

        <div className="grid grid-cols-2">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => {
            const count = postsByTab[key].length;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium transition-colors sm:gap-2 sm:px-4 ${
                  isActive
                    ? 'text-primary dark:text-primary border-b-4 border-primary dark:border-primary bg-primary/5 dark:bg-primary/10'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
                {count > 0 && (
                  <span
                    className={`hidden rounded-full px-1.5 py-0.5 text-[11px] font-semibold sm:inline ${
                      isActive ? 'bg-primary/15 text-primary' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none p-12 flex flex-col items-center text-center">
          <div className="relative mb-4 h-20 w-20">
            <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">{emptyState.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{emptyState.description}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Post key={post.id} {...post} />
          ))}

          {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden />}

          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Đang tải thêm...
            </div>
          )}

          {!hasMore && !loadingMore && (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Bạn đã xem hết tất cả bài viết.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
