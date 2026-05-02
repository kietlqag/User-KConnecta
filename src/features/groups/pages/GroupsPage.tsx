import { useEffect, useState } from 'react';
import { Post } from '../../../components/shared';
import { Header } from '../../home/components/Header';
import { GroupsLeftSidebar } from '../components';
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

    fetchGroupFeed();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="max-w-[1920px] mx-auto">
        <div className="flex pt-14">
          {/* Left Sidebar */}
          <div className="sticky top-14 h-[calc(100vh-56px)] shrink-0 z-10 w-[360px]">
            <GroupsLeftSidebar 
              joinedGroups={joinedGroups} 
              managedGroups={managedGroups}
              activeSectionId="feed"
            />
          </div>
          
          {/* Main Content */}
          <main className="flex-1 max-w-[680px] mx-auto p-4">
            <div className="space-y-4">
              {isLoading && (
                <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
                  Đang tải bảng tin nhóm...
                </div>
              )}

              {!isLoading && error && (
                <div className="rounded-lg bg-white p-6 text-center text-sm text-red-500 shadow">
                  {error}
                </div>
              )}

              {!isLoading && !error && posts.length === 0 && (
                <div className="rounded-lg bg-white p-12 text-center shadow">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có bài viết nào</h3>
                  <p className="text-gray-500 text-sm max-w-[300px] mx-auto">
                    Hãy tham gia thêm các nhóm hoặc mời bạn bè đăng bài để bảng tin của bạn phong phú hơn.
                  </p>
                </div>
              )}

              {!isLoading && !error && posts.map((post) => (
                <Post key={post.id} {...post} />
              ))}
            </div>

            {!isLoading && !error && posts.length > 0 && (
              <div className="text-center py-8">
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Xem thêm bài viết
                </button>
              </div>
            )}
          </main>

          {/* Right Side - Whitespace for balance */}
          <div className="w-[360px] hidden xl:block" />
        </div>
      </div>
    </div>
  );
};