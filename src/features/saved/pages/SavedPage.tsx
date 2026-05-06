import React, { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../../home/components/Header';
import { SavedSidebar } from '../components/SavedSidebar';
import { SavedItem, type SavedItemProps } from '../components/SavedItem';
import { postService, SAVED_POSTS_CHANGED_EVENT, type PostResponse } from '@/services/postService';
import { authService } from '@/services/authService';

export const SavedPage = () => {
  const [savedPosts, setSavedPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPosts = useCallback(async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const response = await postService.getSavedPosts(currentUser.id);
      setSavedPosts(response);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedPosts();
  }, [fetchSavedPosts]);

  useEffect(() => {
    const handleSavedChanged = (e: Event) => {
      const { postId, saved } = (e as CustomEvent<{ postId: string; saved: boolean }>).detail;
      if (saved) {
        fetchSavedPosts();
      } else {
        setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    };

    window.addEventListener(SAVED_POSTS_CHANGED_EVENT, handleSavedChanged);
    return () => window.removeEventListener(SAVED_POSTS_CHANGED_EVENT, handleSavedChanged);
  }, [fetchSavedPosts]);

  const handleUnsave = async (postId: string) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    try {
      await postService.unsavePost(currentUser.id, postId);
      setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
      window.dispatchEvent(new CustomEvent(SAVED_POSTS_CHANGED_EVENT, { detail: { postId, saved: false } }));
      toast.success('Đã bỏ lưu bài viết');
    } catch (error) {
      toast.error('Không thể bỏ lưu bài viết');
    }
  };

  const mapPostToSavedItem = (post: PostResponse): SavedItemProps => {
    const hasVideo = post.media?.some(m => m.mediaType === 'VIDEO');
    const thumbnail = post.imageUrl || post.media?.[0]?.fileUrl || post.authorAvatarUrl || '';

    return {
      id: post.id,
      title: post.content,
      type: hasVideo ? 'Video' : 'Bài viết',
      source: post.groupName || post.authorFullName,
      thumbnail: thumbnail,
      author: {
        name: post.authorFullName,
        avatar: post.authorAvatarUrl || '',
      },
      savedFrom: post.groupName || undefined
    };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="flex pt-14">
        <SavedSidebar activeCollection="all" />

        <main className="ml-[360px] flex-1 p-6">
          <div className="max-w-[800px] mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Tất cả</h1>
              <button className="p-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors cursor-pointer">
                <SlidersHorizontal className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500">Đang tải bài viết đã lưu...</p>
              </div>
            ) : savedPosts.length > 0 ? (
              <div className="space-y-4">
                {savedPosts.map((post) => (
                  <SavedItem key={post.id} {...mapPostToSavedItem(post)} onUnsave={handleUnsave} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có bài viết nào được lưu</h3>
                <p className="text-gray-500">Hãy lưu các bài viết thú vị để xem lại sau.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SavedPage;
