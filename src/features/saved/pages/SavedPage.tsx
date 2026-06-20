import React, { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../../home/components/Header';
import { SavedSidebar } from '../components/SavedSidebar';
import { SavedItem, type SavedItemProps } from '../components/SavedItem';
import { CreateCollectionModal } from '../components/CreateCollectionModal';
import { postService, SAVED_POSTS_CHANGED_EVENT, type PostResponse } from '@/services/postService';
import { collectionService, type CollectionResponse } from '@/services/collectionService';
import { authService } from '@/services/authService';
import type { Collection } from '../components/AddToCollectionModal';

export const SavedPage = () => {
  const [savedPosts, setSavedPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionResponse[]>([]);
  const [activeCollection, setActiveCollection] = useState('all');
  const [collectionPostIds, setCollectionPostIds] = useState<Set<string> | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const currentUser = authService.getCurrentUser();

  const fetchSavedPosts = useCallback(async () => {
    if (!currentUser) { setLoading(false); return; }
    try {
      const response = await postService.getSavedPosts(currentUser.id);
      setSavedPosts(response);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const fetchCollections = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await collectionService.getCollections(currentUser.id);
      setCollections(data);
    } catch {
      // silently ignore — collections are non-critical
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchSavedPosts();
    fetchCollections();
  }, [fetchSavedPosts, fetchCollections]);

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
    if (!currentUser) return;
    try {
      await postService.unsavePost(currentUser.id, postId);
      setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
      window.dispatchEvent(new CustomEvent(SAVED_POSTS_CHANGED_EVENT, { detail: { postId, saved: false } }));
      toast.success('Đã bỏ lưu bài viết');
    } catch {
      toast.error('Không thể bỏ lưu bài viết');
    }
  };

  const handleSelectCollection = async (id: string) => {
    setActiveCollection(id);
    if (id === 'all') {
      setCollectionPostIds(null);
      return;
    }
    if (!currentUser) return;
    setCollectionLoading(true);
    try {
      const ids = await collectionService.getCollectionPostIds(id, currentUser.id);
      setCollectionPostIds(new Set(ids));
    } catch {
      setCollectionPostIds(new Set());
    } finally {
      setCollectionLoading(false);
    }
  };

  const handleCreateCollection = async (name: string) => {
    if (!currentUser) throw new Error('Unauthenticated');
    const created = await collectionService.createCollection({ userId: currentUser.id, name });
    setCollections((prev) => [created, ...prev]);
  };

  const handleAddToCollection = async (postId: string, collectionId: string) => {
    if (!currentUser) throw new Error('Unauthenticated');
    await collectionService.addItem(collectionId, currentUser.id, postId);
    if (collectionId === activeCollection) {
      setCollectionPostIds((prev) => {
        const next = new Set(prev ?? []);
        next.add(postId);
        return next;
      });
    }
  };

  const handleRemoveFromCollection = async (postId: string, collectionId: string) => {
    if (!currentUser) throw new Error('Unauthenticated');
    await collectionService.removeItem(collectionId, currentUser.id, postId);
    if (collectionId === activeCollection) {
      setCollectionPostIds((prev) => {
        const next = new Set(prev ?? []);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleCreateAndAddToCollection = async (postId: string, name: string): Promise<Collection> => {
    if (!currentUser) throw new Error('Unauthenticated');
    const created = await collectionService.createCollection({ userId: currentUser.id, name });
    setCollections((prev) => [created, ...prev]);
    await collectionService.addItem(created.id, currentUser.id, postId);
    return { id: created.id, name: created.name, thumbnail: created.thumbnail ?? undefined };
  };

  const toAddToCollectionFormat = (col: CollectionResponse): Collection => ({
    id: col.id,
    name: col.name,
    thumbnail: col.thumbnail ?? undefined,
  });

  const mapPostToSavedItem = (post: PostResponse): SavedItemProps => {
    const hasVideo = post.media?.some((m) => m.mediaType === 'VIDEO');
    const thumbnail = post.imageUrl || post.media?.[0]?.fileUrl || post.authorAvatarUrl || '';
    return {
      id: post.id,
      title: post.content,
      type: hasVideo ? 'Video' : 'Bài viết',
      source: post.groupName || post.authorFullName,
      thumbnail,
      author: { name: post.authorFullName, avatar: post.authorAvatarUrl || '' },
      savedFrom: post.groupName || undefined,
      collections: collections.map(toAddToCollectionFormat),
      isAddedToCurrentCollection: activeCollection !== 'all' && collectionPostIds?.has(post.id) === true,
      onUnsave: handleUnsave,
      onAddToCollection: handleAddToCollection,
      onRemoveFromCollection: handleRemoveFromCollection,
      onCreateAndAddToCollection: handleCreateAndAddToCollection,
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      <Header />

      <div className="flex pt-14">
        <SavedSidebar
          activeCollection={activeCollection}
          collections={collections}
          onSelectCollection={handleSelectCollection}
          onCreateCollection={() => setCreateModalOpen(true)}
        />

        <main className="ml-[360px] flex-1 p-6">
          <div className="max-w-[800px] mx-auto">
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {activeCollection === 'all'
                  ? 'Tất cả'
                  : collections.find((c) => c.id === activeCollection)?.name ?? 'Bộ sưu tập'}
              </h1>
            </div>

            {(() => {
              const displayPosts = collectionPostIds
                ? savedPosts.filter((p) => collectionPostIds.has(p.id))
                : savedPosts;
              const isLoadingAny = loading || collectionLoading;

              if (isLoadingAny) {
                return (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {collectionLoading ? 'Đang tải bộ sưu tập...' : 'Đang tải bài viết đã lưu...'}
                    </p>
                  </div>
                );
              }

              if (displayPosts.length > 0) {
                return (
                  <div className="space-y-4">
                    {displayPosts.map((post) => (
                      <SavedItem key={post.id} {...mapPostToSavedItem(post)} />
                    ))}
                  </div>
                );
              }

              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SlidersHorizontal className="w-10 h-10 text-gray-400" />
                  </div>
                  {collectionPostIds ? (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Bộ sưu tập trống</h3>
                      <p className="text-gray-500 dark:text-gray-400">Thêm bài viết vào bộ sưu tập để xem ở đây.</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Chưa có bài viết nào được lưu</h3>
                      <p className="text-gray-500 dark:text-gray-400">Hãy lưu các bài viết thú vị để xem lại sau.</p>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </main>
      </div>

      <CreateCollectionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateCollection}
        existingNames={collections.map((c) => c.name)}
      />
    </div>
  );
};

export default SavedPage;
