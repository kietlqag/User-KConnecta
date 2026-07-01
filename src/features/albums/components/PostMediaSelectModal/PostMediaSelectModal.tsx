import React, { useEffect, useState } from 'react';
import { X, Play, Check, Loader2, Images } from 'lucide-react';
import { postService, type PostResponse } from '@/services/postService';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import type { AlbumMediaType } from '@/services/albumService';
import { isVideoUrl, getVideoThumbnail } from '@/utils/mediaUtils';

interface PostMediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  mediaType: AlbumMediaType;
  caption?: string | null;
  postId: string;
}

interface PostMediaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSelect: (selected: PostMediaItem[]) => Promise<void>;
}

function extractMediaFromPosts(posts: PostResponse[]): PostMediaItem[] {
  const items: PostMediaItem[] = [];
  for (const post of posts) {
    if (post.status !== 'PUBLISHED') continue;
    if (post.sharedPost) continue;

    const seenUrls = new Set<string>();

    for (const media of post.media ?? []) {
      const url = media.mediaUrl || media.fileUrl;
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      
      const isVideo = media.mediaType === 'VIDEO';
      let thumb = media.thumbnailUrl;
      if (isVideo && (!thumb || isVideoUrl(thumb))) {
        thumb = getVideoThumbnail(url);
      }

      items.push({
        id: media.id,
        url,
        thumbnailUrl: thumb,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
        caption: post.content,
        postId: post.id,
      });
    }

    const legacyUrl = post.imageUrl;
    if (legacyUrl && !seenUrls.has(legacyUrl)) {
      const isVideo = isVideoUrl(legacyUrl);
      items.push({
        id: `${post.id}-legacy`,
        url: legacyUrl,
        thumbnailUrl: isVideo ? getVideoThumbnail(legacyUrl) : null,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
        caption: post.content,
        postId: post.id,
      });
    }
  }
  return items;
}

export function PostMediaSelectModal({
  isOpen,
  onClose,
  userId,
  onSelect,
}: PostMediaSelectModalProps) {
  const [mediaList, setMediaList] = useState<PostMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setSelectedIds(new Set());
    
    // Fetch user posts
    const fetchPosts = async () => {
      const allPosts: PostResponse[] = [];
      let page = 0;
      let hasMore = true;
      const size = 50;

      try {
        while (hasMore) {
          const res = await postService.getAllPosts(userId, userId, page, size, 'PUBLISHED');
          allPosts.push(...res.content);
          hasMore = res.number + 1 < res.totalPages;
          page += 1;
        }
        setMediaList(extractMediaFromPosts(allPosts));
      } catch (err) {
        console.error('Failed to load user post media', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const toggleSelect = (item: PostMediaItem) => {
    const next = new Set(selectedIds);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
    }
    setSelectedIds(next);
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const selectedItems = mediaList.filter((item) => selectedIds.has(item.id));
      await onSelect(selectedItems);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[min(90vh,750px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-lg font-bold text-foreground">Chọn từ bài đăng</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted dark:text-muted-foreground"
            aria-label="Đóng"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
              <p className="text-sm">Đang tải ảnh/video từ bài viết...</p>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Images className="w-12 h-12 text-muted-foreground/60 mb-3" />
              <p className="font-semibold text-foreground mb-1">Không tìm thấy ảnh hoặc video</p>
              <p className="text-sm">Các ảnh/video bạn đã đăng trên bài viết sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {mediaList.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelect(item)}
                    className={`relative aspect-square rounded-lg overflow-hidden bg-muted group focus:outline-none ring-offset-2 ring-offset-card transition-all ${
                      isSelected ? 'ring-2 ring-emerald-500 scale-95' : 'hover:opacity-90'
                    }`}
                  >
                    <ImageWithFallback
                      src={item.thumbnailUrl ?? item.url}
                      alt={item.caption ?? 'Media'}
                      className="w-full h-full object-cover"
                    />

                    {item.mediaType === 'VIDEO' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    )}

                    {/* Selection overlay indicator */}
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-white text-white shadow-sm'
                          : 'bg-black/40 border-white/80 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3 bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-border text-foreground hover:bg-muted rounded-lg cursor-pointer"
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={selectedIds.size === 0 || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Đang thêm...' : `Thêm vào album (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
