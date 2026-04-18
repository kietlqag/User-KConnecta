import { useEffect, useState } from 'react';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../../../../components/shared';
import { authService } from '@/services/authService';
import { postService, type PostReactionCountResponse, type PostResponse } from '@/services/postService';

interface HomeFeedPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  currentUserReactionType: PostResponse['currentUserReactionType'];
  reactionCounts?: PostReactionCountResponse[];
}

function formatPostTimestamp(dateString?: string | null) {
  if (!dateString) {
    return 'V?a xong';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'V?a xong';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trý?c`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} gi? trý?c`;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function mapPost(item: PostResponse): HomeFeedPost {
  const firstImage = (item.media ?? []).find((mediaItem) => mediaItem.mediaType === 'IMAGE');

  return {
    id: item.id,
    author: {
      id: item.authorId,
      name: item.authorFullName,
      avatar:
        item.authorAvatarUrl ||
        `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(item.authorFullName || 'User')}`,
    },
    timestamp: formatPostTimestamp(item.publishedAt || item.createdAt),
    content: item.content || '',
    image: firstImage?.mediaUrl || firstImage?.fileUrl,
    likes: item.reactionCount,
    comments: item.commentCount,
    shares: item.shareCount,
    isLiked: !!item.currentUserReactionType,
    currentUserReactionType: item.currentUserReactionType,
    reactionCounts: item.reactionCounts,
  };
}

export function NewsFeed() {
  const [posts, setPosts] = useState<HomeFeedPost[]>([]);
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

        setPosts(response.map(mapPost));
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Không th? t?i b?ng tin');
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
          Ðang t?i b?ng tin...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-red-500 shadow">
          {error}
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
          Chýa có bài vi?t trong b?ng tin.
        </div>
      )}

      {!isLoading && !error && posts.map((post) => <Post key={post.id} {...post} />)}
    </div>
  );
}

