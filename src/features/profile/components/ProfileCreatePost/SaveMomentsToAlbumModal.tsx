import React, { useState, useEffect } from 'react';
import { X, Play, Check, Loader2, Plus, Lock, Globe, Users } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import {
  useMyAlbums,
  useGroupAlbums,
  useCreateAlbum,
} from '@/features/albums/hooks/useAlbums';
import { albumService, type AlbumPrivacy, type AlbumType } from '@/services/albumService';
import { isVideoUrl, getVideoThumbnail } from '@/utils/mediaUtils';
import type { PostResponse } from '@/services/postService';
import { toast } from 'sonner';

interface SaveMomentsToAlbumModalProps {
  post: PostResponse;
  onClose: () => void;
}

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  mediaType: 'IMAGE' | 'VIDEO';
  caption?: string | null;
}

function getMediaItemsFromPost(post: PostResponse): MediaItem[] {
  const items: MediaItem[] = [];
  const seenUrls = new Set<string>();

  for (const m of post.media ?? []) {
    const url = m.mediaUrl || m.fileUrl;
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    items.push({
      id: m.id,
      url,
      thumbnailUrl: m.thumbnailUrl,
      mediaType: m.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      caption: post.content,
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
    });
  }

  return items;
}

export function SaveMomentsToAlbumModal({ post, onClose }: SaveMomentsToAlbumModalProps) {
  const queryClient = useQueryClient();
  const mediaItems = React.useMemo(() => getMediaItemsFromPost(post), [post]);
  
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [saveOption, setSaveOption] = useState<'existing' | 'new'>('existing');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumPrivacy, setNewAlbumPrivacy] = useState<AlbumPrivacy>('PUBLIC');
  const [newAlbumType, setNewAlbumType] = useState<AlbumType>('PERSONAL');
  const [isSaving, setIsSaving] = useState(false);

  const isGroupPost = !!post.groupId;

  // Tải danh sách album tương ứng
  const { data: myAlbumsData, isLoading: loadingMyAlbums } = useMyAlbums(0, 50);
  const { data: groupAlbumsData, isLoading: loadingGroupAlbums } = useGroupAlbums(post.groupId || undefined);

  const albums = isGroupPost 
    ? (groupAlbumsData?.content ?? []) 
    : (myAlbumsData?.content ?? []);
  
  const loadingAlbums = isGroupPost ? loadingGroupAlbums : loadingMyAlbums;

  // Khởi tạo các lựa chọn mặc định
  useEffect(() => {
    if (mediaItems.length > 0) {
      setSelectedMedia(new Set(mediaItems.map((m) => m.id)));
    }
  }, [mediaItems]);

  useEffect(() => {
    if (!loadingAlbums) {
      if (albums.length > 0) {
        setSaveOption('existing');
        setSelectedAlbumId(albums[0].id);
      } else {
        setSaveOption('new');
      }
    }
  }, [loadingAlbums, albums]);

  const createAlbumMutation = useCreateAlbum();
  
  const importMediaMutation = useMutation({
    mutationFn: ({ albumId, items }: { albumId: string; items: any[] }) =>
      albumService.importMedia(albumId, items),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['albums', 'detail', variables.albumId] });
      void queryClient.invalidateQueries({ queryKey: ['albums', 'sidebar'] });
      void queryClient.invalidateQueries({ queryKey: ['albums', 'mine'] });
      void queryClient.invalidateQueries({ queryKey: ['albums', 'user'] });
      if (post.groupId) {
        void queryClient.invalidateQueries({ queryKey: ['albums', 'group', post.groupId] });
      }
    },
  });

  const toggleMediaSelection = (id: string) => {
    setSelectedMedia((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const selectedItems = mediaItems
      .filter((m) => selectedMedia.has(m.id))
      .map((m) => ({
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        mediaType: m.mediaType,
        caption: m.caption,
      }));

    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất một hình ảnh hoặc video');
      return;
    }

    setIsSaving(true);
    try {
      let targetAlbumId = selectedAlbumId;

      if (saveOption === 'new') {
        if (!newAlbumTitle.trim()) {
          toast.error('Vui lòng nhập tên album mới');
          setIsSaving(false);
          return;
        }

        const newAlbum = await createAlbumMutation.mutateAsync({
          title: newAlbumTitle.trim(),
          albumType: newAlbumType,
          privacy: isGroupPost ? 'PUBLIC' : newAlbumPrivacy,
          groupId: post.groupId || undefined,
        });
        targetAlbumId = newAlbum.id;
      }

      await importMediaMutation.mutateAsync({
        albumId: targetAlbumId,
        items: selectedItems,
      });

      toast.success('Đã lưu các khoảnh khắc vào Album thành công!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu khoảnh khắc vào Album');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Lưu giữ khoảnh khắc
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lưu ảnh/video từ bài đăng vừa tạo vào Album kỷ niệm
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
          {/* Lưới chọn phương tiện */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Chọn ảnh và video muốn lưu ({selectedMedia.size}/{mediaItems.length})
            </h3>
            <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1 border border-border rounded-xl bg-muted/20">
              {mediaItems.map((m) => {
                const isVideo = m.mediaType === 'VIDEO';
                const thumb = isVideo
                  ? (m.thumbnailUrl && !isVideoUrl(m.thumbnailUrl) ? m.thumbnailUrl : getVideoThumbnail(m.url))
                  : m.url;
                const isSelected = selectedMedia.has(m.id);

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMediaSelection(m.id)}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border cursor-pointer group bg-muted"
                  >
                    <ImageWithFallback
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    )}
                    {/* Checkbox overlay */}
                    <div className={`absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : 'bg-black/40 border-white/60 hover:border-white text-transparent'
                    }`}>
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn nơi lưu */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Chọn nơi lưu trữ</h3>

            {/* Option 1: Album có sẵn */}
            {albums.length > 0 && (
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="saveOption"
                  checked={saveOption === 'existing'}
                  onChange={() => setSaveOption('existing')}
                  className="mt-1 h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <div className="flex-1 space-y-2">
                  <span className="text-sm font-medium text-foreground">Lưu vào album có sẵn</span>
                  {saveOption === 'existing' && (
                    <select
                      value={selectedAlbumId}
                      onChange={(e) => setSelectedAlbumId(e.target.value)}
                      disabled={loadingAlbums}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {albums.map((album) => (
                        <option key={album.id} value={album.id}>
                          {album.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            )}

            {/* Option 2: Tạo album mới */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors">
              <input
                type="radio"
                name="saveOption"
                checked={saveOption === 'new'}
                onChange={() => setSaveOption('new')}
                className="mt-1 h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <div className="flex-1 space-y-3">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Tạo album mới và lưu
                </span>
                {saveOption === 'new' && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <input
                        type="text"
                        placeholder="Tên album mới..."
                        value={newAlbumTitle}
                        onChange={(e) => setNewAlbumTitle(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Thể loại</label>
                        <select
                          value={newAlbumType}
                          onChange={(e) => setNewAlbumType(e.target.value as AlbumType)}
                          className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="PERSONAL">Cá nhân</option>
                          <option value="FAMILY">Gia đình</option>
                          <option value="EVENT">Sự kiện</option>
                          <option value="TRAVEL">Du lịch</option>
                          <option value="OTHER">Khác</option>
                        </select>
                      </div>

                      {!isGroupPost ? (
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">Quyền riêng tư</label>
                          <select
                            value={newAlbumPrivacy}
                            onChange={(e) => setNewAlbumPrivacy(e.target.value as AlbumPrivacy)}
                            className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="PUBLIC">Công khai</option>
                            <option value="FRIENDS">Bạn bè</option>
                            <option value="ONLY_ME">Chỉ mình tôi</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">Quyền riêng tư</label>
                          <div className="w-full rounded-xl border border-border bg-muted px-2.5 py-1.5 text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            Riêng tư của nhóm
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-card p-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || selectedMedia.size === 0}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu lại
          </button>
        </div>
      </div>
    </div>
  );
}
