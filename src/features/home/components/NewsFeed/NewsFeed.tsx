import { useEffect, useState } from 'react';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../../../../components/shared';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { mapApiPost, type FeedPost } from '@/utils/postUtils';

export function NewsFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFeed = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const currentUser = authService.getCurrentUser();
        const response = await postService.getAllPosts(currentUser?.id);

        if (!isMounted) {
          return;
        }

        setPosts(response.map(mapApiPost));
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải bảng tin');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchFeed();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-0">
      <Stories />
      <CreatePost />

      {isLoading && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
          Đang tải bảng tin...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-red-500 shadow">
          {error}
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
          Chưa có bài viết trong bảng tin.
        </div>
      )}

      {!isLoading && !error && posts.map((post) => <Post key={post.id} {...post} />)}
    </div>
  );
}


