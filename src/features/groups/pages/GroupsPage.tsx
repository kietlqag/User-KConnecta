import { useEffect, useState } from 'react';
import { Post } from '../../../components/shared';
import { GroupsHubLayout } from '../components';
import { useJoinedGroups, useManagedGroups } from '../hooks/useGroups';
import { postService } from '@/services/postService';
import { authService } from '@/services/authService';
import { mapApiPost, type FeedPost } from '@/utils/postUtils';

export const GroupsPage = () => {
  const { data: joinedGroups = [] } = useJoinedGroups();
  const { data: managedGroups = [] } = useManagedGroups();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchGroupFeed = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const currentUser = authService.getCurrentUser();
        const response = await postService.getGroupFeedPosts(currentUser?.id);

        if (!isMounted) return;
        setPosts(response.map(mapApiPost));
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Không thể tải bảng tin nhóm');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchGroupFeed();

    return () => {
      isMounted = false;
    };
  }, []);

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
            {error}
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

      {!isLoading && !error && posts.length > 0 && (
        <div className="py-8 text-center">
          <button type="button" className="font-medium text-blue-600 hover:text-blue-700">
            Xem thêm bài viết
          </button>
        </div>
      )}
    </GroupsHubLayout>
  );
};
