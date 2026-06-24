import { useEffect, useMemo, useRef } from 'react';
import { Post } from '../../../components/shared';
import { GroupsHubLayout } from '../components';
import { useJoinedGroups, useManagedGroups } from '../hooks/useGroups';
import { useGroupFeed } from '../hooks/useGroupFeed';
import { authService } from '@/services/authService';
import { mapApiPost } from '@/utils/postUtils';

export const GroupsPage = () => {
  const { data: joinedGroups = [] } = useJoinedGroups();
  const { data: managedGroups = [] } = useManagedGroups();

  const currentUser = authService.getCurrentUser();
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, error } = useGroupFeed(
    currentUser?.id
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasNextPageRef = useRef(false);
  const isFetchingNextPageRef = useRef(false);
  const fetchNextPageRef = useRef<() => void>(() => {});

  // Keep refs in sync every render so the observer callback always reads fresh values
  hasNextPageRef.current = hasNextPage ?? false;
  isFetchingNextPageRef.current = isFetchingNextPage;
  fetchNextPageRef.current = fetchNextPage;

  const posts = useMemo(
    () => data?.pages.flatMap((page) => page.content.map(mapApiPost)) ?? [],
    [data]
  );

  // Re-attach observer when feed grows so we fetch the next page if sentinel is already visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || isLoading || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPageRef.current && !isFetchingNextPageRef.current) {
          void fetchNextPageRef.current();
        }
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, hasNextPage, posts.length]);

  return (
    <GroupsHubLayout
      joinedGroups={joinedGroups}
      managedGroups={managedGroups}
      activeSectionId="feed"
    >
      <div className="space-y-4">
        {isLoading && (
          <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow dark:bg-gray-800 dark:text-gray-400">
            Đang tải bảng tin nhóm...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg bg-white p-6 text-center text-sm text-red-500 shadow dark:bg-gray-800">
            {error instanceof Error ? error.message : 'Không thể tải bảng tin nhóm'}
          </div>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">Chưa có bài viết nào</h3>
            <p className="mx-auto max-w-[300px] text-sm text-gray-500 dark:text-gray-400">
              Hãy tham gia thêm các nhóm hoặc mời bạn bè đăng bài để bảng tin của bạn phong phú hơn.
            </p>
          </div>
        )}

        {!isLoading && !error && posts.map((post) => (
          <Post key={post.id} {...post} />
        ))}
      </div>

      {/* Sentinel: IntersectionObserver watches this to trigger fetchNextPage */}
      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-emerald-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Đang tải thêm...</span>
        </div>
      )}

      {!isLoading && !error && !hasNextPage && posts.length > 0 && (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Bạn đã xem hết tất cả bài viết.
        </div>
      )}
    </GroupsHubLayout>
  );
};
