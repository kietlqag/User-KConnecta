import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../../../../components/shared';
import { useSearchParams } from 'react-router-dom';
import { authService } from '@/services/authService';
import { postService, type PostResponse } from '@/services/postService';
import { mapApiPost, type FeedPost } from '@/utils/postUtils';

import { FriendSuggestions } from '../FriendSuggestions';

export function NewsFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [searchParams] = useSearchParams();
  const highlightedPostId = searchParams.get('post');
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, hasMore]);

  // Initial load or highlighted post change
  useEffect(() => {
    let isMounted = true;

    const fetchInitialFeed = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPage(0);
        const currentUser = authService.getCurrentUser();
        const response = await postService.getAllPosts(currentUser?.id, undefined, 0, 10);

        if (!isMounted) return;

        let mappedPosts = response.content.map(mapApiPost);
        setHasMore(response.number < response.totalPages - 1);

        // If there's a highlighted post, make sure it's at the top
        if (highlightedPostId) {
          const isPostInFeed = mappedPosts.some((p) => p.id === highlightedPostId);
          if (!isPostInFeed) {
            try {
              const specificPost = await postService.getPostById(highlightedPostId, currentUser?.id);
              mappedPosts = [mapApiPost(specificPost), ...mappedPosts];
            } catch (e) {
              console.error('Failed to fetch highlighted post:', e);
            }
          } else {
            const postIndex = mappedPosts.findIndex((p) => p.id === highlightedPostId);
            const post = mappedPosts[postIndex];
            mappedPosts.splice(postIndex, 1);
            mappedPosts = [post, ...mappedPosts];
          }
        }

        setPosts(mappedPosts);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải bảng tin');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchInitialFeed();

    return () => {
      isMounted = false;
    };
  }, [highlightedPostId]);

  // Load more pages
  useEffect(() => {
    if (page === 0) return; // Skip initial load as it's handled above

    let isMounted = true;
    const fetchMore = async () => {
      try {
        setIsLoadingMore(true);
        const currentUser = authService.getCurrentUser();
        const response = await postService.getAllPosts(currentUser?.id, undefined, page, 10);

        if (!isMounted) return;

        const newPosts = response.content
          .map(mapApiPost)
          .filter(newPost => !posts.some(existing => existing.id === newPost.id)); // Avoid duplicates
        
        setPosts(prev => [...prev, ...newPosts]);
        setHasMore(response.number < response.totalPages - 1);
      } catch (e) {
        console.error('Failed to load more posts:', e);
      } finally {
        if (isMounted) setIsLoadingMore(false);
      }
    };

    void fetchMore();
    return () => { isMounted = false; };
  }, [page]);

  useEffect(() => {
    if (!isLoading && highlightedPostId && posts.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`post-${highlightedPostId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50', 'transition-all', 'duration-1000');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, highlightedPostId, posts]);

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

      {posts.map((post, index) => {
        const isLast = posts.length === index + 1;
        const showSuggestions = index === 2; // Show after the 3rd post

        return (
          <React.Fragment key={post.id}>
            {isLast ? (
              <div ref={lastPostElementRef}>
                <Post {...post} />
              </div>
            ) : (
              <Post {...post} />
            )}
            {showSuggestions && <FriendSuggestions />}
          </React.Fragment>
        );
      })}

      {isLoadingMore && (
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <span className="ml-2 text-sm text-gray-500">Đang tải thêm...</span>
        </div>
      )}

      {!isLoading && !error && !hasMore && posts.length > 0 && (
        <div className="p-8 text-center text-sm text-gray-500">
          Bạn đã xem hết tất cả bài viết.
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
          Chưa có bài viết trong bảng tin.
        </div>
      )}
    </div>
  );
}


