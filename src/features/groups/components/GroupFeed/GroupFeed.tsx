import { useEffect, useState } from 'react';
import { Post } from '@/components/shared';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { ProfileCreatePostModal } from '@/features/profile/components/ProfileCreatePost/ProfileCreatePostModal';
import { Image, Smile, Briefcase } from 'lucide-react';
import { CurrentUserAvatar } from '@/components/shared';
import { mapApiPost, type FeedPost } from '@/utils/postUtils';

interface GroupFeedProps {
  groupId: string;
  isApprovedMember?: boolean;
  composerOpen?: boolean;
  onComposerOpenChange?: (open: boolean) => void;
  onPostsLoaded?: (count: number) => void;
  isAdmin?: boolean;
  pinnedPostIds?: Set<string>;
  onPin?: (postId: string) => void;
  onUnpin?: (postId: string) => void;
}

export function GroupFeed({
  groupId,
  isApprovedMember = false,
  composerOpen,
  onComposerOpenChange,
  onPostsLoaded,
  isAdmin = false,
  pinnedPostIds,
  onPin,
  onUnpin,
}: GroupFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [openWithPoll, setOpenWithPoll] = useState(false);
  const isControlled = composerOpen !== undefined;
  const isModalOpen = isControlled ? composerOpen : internalModalOpen;
  const setModalOpen = (open: boolean) => {
    if (!open) setOpenWithPoll(false);
    if (isControlled) onComposerOpenChange?.(open);
    else setInternalModalOpen(open);
  };

  const openComposer = (withPoll = false) => {
    setOpenWithPoll(withPoll);
    setModalOpen(true);
  };

  const currentUser = authService.getCurrentUser();

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await postService.getGroupPosts(groupId, currentUser?.id);
      if (import.meta.env.DEV) {
        console.log('[post-schedule] feed query group', {
          groupId,
          count: data.length,
          statuses: data.map(p => p.status),
        });
      }
      const mapped = data.map(mapApiPost);
      setPosts(mapped);
      onPostsLoaded?.(mapped.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải bài viết');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPosts();
  }, [groupId]);

  return (
    <div className="flex flex-col gap-4">
      {/* Create Post Card — only for approved members */}
      {isApprovedMember && <div id="group-composer" className="bg-card rounded-lg shadow-sm dark:shadow-none p-4 border border-border scroll-mt-24">
        <div className="flex gap-2 items-center mb-3">
          <CurrentUserAvatar />
          <button
            onClick={() => openComposer(false)}
            className="flex-1 bg-background hover:bg-muted transition-colors cursor-pointer rounded-full py-2.5 px-4 text-muted-foreground text-[15px] text-left"
          >
            Bạn đang nghĩ gì?
          </button>
        </div>
        <div className="border-t border-border pt-3 flex flex-wrap">
          <button
            onClick={() => openComposer(false)}
            className="flex-1 min-w-[120px] flex justify-center items-center gap-2 py-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground font-semibold text-[15px]"
          >
            <Image className="w-6 h-6 text-green-500" />
            Ảnh/video
          </button>
          <button
            onClick={() => openComposer(false)}
            className="flex-1 min-w-[120px] flex justify-center items-center gap-2 py-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground font-semibold text-[15px]"
          >
            <Smile className="w-6 h-6 text-yellow-500" />
            Cảm xúc
          </button>
          <button
            onClick={() => openComposer(true)}
            className="flex-1 min-w-[120px] flex justify-center items-center gap-2 py-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground font-semibold text-[15px]"
          >
            <Briefcase className="w-6 h-6 text-orange-500" />
            Thăm dò ý kiến
          </button>
        </div>
      </div>}

      {/* Posts */}
      {isLoading && (
        <div className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground shadow">
          Đang tải bài viết...
        </div>
      )}
      {!isLoading && error && (
        <div className="rounded-lg bg-card p-6 text-center text-sm text-red-500 shadow">
          {error}
        </div>
      )}
      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground shadow">
          Chưa có bài viết nào trong nhóm.
        </div>
      )}
      {!isLoading && !error && posts.map(post => (
        <Post
          key={post.id}
          {...post}
          canPin={isAdmin}
          isPinned={pinnedPostIds?.has(post.id) ?? false}
          onPin={onPin}
          onUnpin={onUnpin}
        />
      ))}

      <ProfileCreatePostModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        username={currentUser?.fullName || 'Người dùng'}
        groupId={groupId}
        initialShowPoll={openWithPoll}
        onPostCreated={() => void fetchPosts()}
      />
    </div>
  );
}
