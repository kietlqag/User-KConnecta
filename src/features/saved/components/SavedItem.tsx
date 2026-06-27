import { Share2, MoreHorizontal, BookmarkPlus, Trash2, Play, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PostShareModal } from '@/components/posts/PostShareModal';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { AddToCollectionModal, type Collection } from './AddToCollectionModal';
import { collectionService } from '@/services/collectionService';
import { authService } from '@/services/authService';

export interface SavedItemProps {
  id: string;
  title: string;
  type: string;
  source: string;
  thumbnail: string;
  author: {
    name: string;
    avatar: string;
  };
  savedFrom?: string;
  collections?: Collection[];
  isAddedToCurrentCollection?: boolean;
  onUnsave?: (id: string) => void;
  onAddToCollection?: (postId: string, collectionId: string) => Promise<void>;
  onRemoveFromCollection?: (postId: string, collectionId: string) => Promise<void>;
  onCreateAndAddToCollection?: (postId: string, collectionName: string) => Promise<Collection>;
}

const PLACEHOLDER_THUMBNAIL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" fill="%23e5e7eb"/%3E%3Crect x="56" y="56" width="80" height="80" rx="4" fill="%23d1d5db"/%3E%3C/svg%3E';

export const SavedItem = ({
  id,
  title,
  type,
  source,
  thumbnail,
  author,
  savedFrom,
  collections = [],
  isAddedToCurrentCollection = false,
  onUnsave,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateAndAddToCollection,
}: SavedItemProps) => {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const isVideo = type.toLowerCase() === 'video';

  const handleOpenCollectionModal = async () => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      try {
        const ids = await collectionService.getItemCollectionIds(currentUser.id, id);
        setSelectedCollectionIds(ids);
      } catch {
        setSelectedCollectionIds([]);
      }
    }
    setCollectionOpen(true);
  };

  const handleOpenPost = () => {
    navigate(`/home?post=${id}`);
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 mb-4 flex gap-4 hover:shadow-sm dark:shadow-none transition-shadow">
        {/* Thumbnail */}
        <div
          className="w-48 h-48 rounded-lg overflow-hidden shrink-0 relative bg-background border border-border cursor-pointer"
          onClick={handleOpenPost}
        >
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={imgError ? PLACEHOLDER_THUMBNAIL : (thumbnail || PLACEHOLDER_THUMBNAIL)}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground line-clamp-2 mb-1 hover:underline cursor-pointer" onClick={handleOpenPost}>
              {title}
            </h2>
            <div className="text-[13px] text-muted-foreground flex items-center gap-1.5 mb-3">
              <span>{type}</span>
              <span>·</span>
              <span className="font-semibold">{source}</span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <UserAvatar
                name={author.name}
                avatarUrl={author.avatar}
                className="w-6 h-6"
                rounded="full"
                initialsClassName="text-[10px] font-bold"
              />
              <span className="text-[13px] text-muted-foreground">
                Đã lưu từ <span className="font-semibold text-foreground hover:underline cursor-pointer">bài viết của {author.name}</span>
                {savedFrom && <span> trong <span className="font-semibold text-foreground hover:underline cursor-pointer">{savedFrom}</span></span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-[15px] transition-colors cursor-pointer ${ isAddedToCurrentCollection ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-background hover:bg-muted text-foreground' }`}
              onClick={handleOpenCollectionModal}
            >
              {isAddedToCurrentCollection ? <Check className="w-5 h-5" /> : <BookmarkPlus className="w-5 h-5" />}
              {isAddedToCurrentCollection ? 'Đã thêm vào bộ sưu tập' : 'Thêm vào bộ sưu tập'}
            </button>
            <button
              className="p-2 bg-background hover:bg-muted rounded-lg transition-colors cursor-pointer"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 bg-background hover:bg-muted rounded-lg transition-colors cursor-pointer">
                  <MoreHorizontal className="w-5 h-5 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 cursor-pointer flex items-center gap-2"
                  onClick={() => onUnsave?.(id)}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Bỏ lưu bài viết</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <PostShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={id}
        postContent={title}
        postImage={thumbnail}
        postAuthorName={author.name}
      />

      <AddToCollectionModal
        isOpen={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        collections={collections}
        selectedCollectionIds={selectedCollectionIds}
        onAdd={(collectionId) => onAddToCollection?.(id, collectionId) ?? Promise.resolve()}
        onRemove={(collectionId) => onRemoveFromCollection?.(id, collectionId) ?? Promise.resolve()}
        onCreateAndAdd={(name) =>
          onCreateAndAddToCollection?.(id, name) ??
          Promise.reject(new Error('onCreateAndAddToCollection not provided'))
        }
      />
    </>
  );
};
