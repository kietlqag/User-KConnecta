import { Globe, Images, Lock, Users } from 'lucide-react';
import { isVideoUrl } from '@/utils/mediaUtils';
import type { ShareTarget } from './shareTypes';

interface SharePreviewProps {
  target: ShareTarget;
}

export function SharePreview({ target }: SharePreviewProps) {
  if (target.type === 'album') {
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        {target.coverUrl ? (
          <img src={target.coverUrl} alt={target.title} className="aspect-[16/9] w-full object-cover" />
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-violet-100 to-emerald-100 dark:from-gray-700 dark:to-gray-800">
            <Images className="h-10 w-10 text-violet-500/70" aria-hidden />
          </div>
        )}
        <div className="p-3">
          <p className="text-sm font-semibold leading-snug text-foreground break-words">
            {target.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words dark:text-muted-foreground">
            {target.mediaCount ?? 0} ảnh/video{target.ownerName ? ` · ${target.ownerName}` : ''}
          </p>
        </div>
      </div>
    );
  }

  if (target.type === 'group') {
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        {target.coverUrl ? (
          <img src={target.coverUrl} alt={target.name} className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-100 dark:from-gray-700 dark:to-gray-800">
            <Users className="h-8 w-8 text-emerald-500/70" aria-hidden />
          </div>
        )}
        <div className="p-3">
          <p className="truncate text-sm font-semibold text-foreground">{target.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {target.privacy === 'PRIVATE' ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            <span>{target.privacy === 'PRIVATE' ? 'Nhóm Riêng tư' : 'Nhóm Công khai'}</span>
            <span aria-hidden>·</span>
            <span>{(target.memberCount ?? 0).toLocaleString('vi-VN')} thành viên</span>
          </div>
        </div>
      </div>
    );
  }

  const { image, content, authorName } = target;
  if (!image && !content) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {image ? (
        isVideoUrl(image) ? (
          <video
            src={image}
            muted
            playsInline
            preload="metadata"
            className="aspect-[16/9] w-full bg-black object-cover"
          />
        ) : (
          <img src={image} alt="" className="aspect-[16/9] w-full object-cover" />
        )
      ) : null}
      <div className="p-3">
        {content ? (
          <p className="line-clamp-3 text-sm leading-snug text-foreground break-words">
            {content}
          </p>
        ) : null}
        {authorName ? (
          <p className="mt-1 text-xs text-muted-foreground">{authorName}</p>
        ) : null}
      </div>
    </div>
  );
}
