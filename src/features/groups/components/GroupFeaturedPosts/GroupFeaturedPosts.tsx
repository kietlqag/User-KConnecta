import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pin, X } from 'lucide-react';
import { toast } from 'sonner';
import { Post } from '@/components/shared';
import { mapApiPost } from '@/utils/postUtils';
import { groupPinService, type PinnedPostApiResponse, type PinType } from '@/services/groupPinService';
import { useGroupPinnedPosts, useUnpinPost, groupPinsKey } from '../../hooks/useGroupPins';

const PIN_TYPE_META: Record<PinType, { icon: string; label: string }> = {
  NORMAL:       { icon: '📌', label: 'Ghim' },
  RULE:         { icon: '📜', label: 'Nội quy' },
  ANNOUNCEMENT: { icon: '📢', label: 'Thông báo' },
  FAQ:          { icon: '❓', label: 'Hỏi đáp' },
  GUIDE:        { icon: '📖', label: 'Hướng dẫn' },
  EVENT:        { icon: '📅', label: 'Sự kiện' },
};

const EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms > 0 && ms <= EXPIRING_SOON_MS;
}

interface GroupFeaturedPostsProps {
  groupId: string;
  isAdmin: boolean;
}

export function GroupFeaturedPosts({ groupId, isAdmin }: GroupFeaturedPostsProps) {
  const { data: pins = [] } = useGroupPinnedPosts(groupId);
  const unpinMutation = useUnpinPost(groupId);
  const queryClient = useQueryClient();
  const markedRef = useRef<Set<string>>(new Set());

  const unreadCount = pins.filter(p => !p.read).length;

  // Mark unread pins as read once the user views the featured section.
  useEffect(() => {
    const unread = pins.filter(p => !p.read && !markedRef.current.has(p.pinId));
    if (unread.length === 0) return;
    unread.forEach(p => markedRef.current.add(p.pinId));
    Promise.all(unread.map(p => groupPinService.markRead(groupId, p.pinId).catch(() => undefined)))
      .then(() => queryClient.invalidateQueries({ queryKey: groupPinsKey(groupId) }));
  }, [pins, groupId, queryClient]);

  if (pins.length === 0) return null;

  const handleUnpin = (pin: PinnedPostApiResponse) => {
    unpinMutation.mutate(pin.post.id, {
      onSuccess: () => toast.success('Đã bỏ ghim bài viết'),
      onError: (err: any) => toast.error(err?.response?.data?.message || 'Không thể bỏ ghim'),
    });
  };

  return (
    <section className="mb-4" aria-label="Bài viết nổi bật">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Pin className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" style={{ fill: 'currentColor', fillOpacity: 0.2 }} />
        <h2 className="text-[17px] font-bold text-foreground">Bài viết nổi bật</h2>
        <span className="text-sm font-medium text-muted-foreground">· {pins.length}</span>
        {unreadCount > 0 && (
          <span className="ml-1 inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {unreadCount} mới
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {pins.map(pin => {
          const meta = PIN_TYPE_META[pin.pinType] ?? PIN_TYPE_META.NORMAL;
          const expiringSoon = isExpiringSoon(pin.expiresAt);
          return (
            <div
              key={pin.pinId}
              className="overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 bg-card shadow-sm"
            >
              {/* Pin ribbon — connects the featured badge with the post into one card */}
              <div className="flex items-center flex-wrap gap-2 border-b border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800 dark:text-emerald-200">
                  <span className="text-sm leading-none">{meta.icon}</span>
                  {meta.label} · Nổi bật
                </span>
                {(pin.priority === 'HIGH' || pin.priority === 'CRITICAL') && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ pin.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' }`}>
                    {pin.priority === 'CRITICAL' ? 'Khẩn cấp' : 'Ưu tiên cao'}
                  </span>
                )}
                {!pin.read && (
                  <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> MỚI
                  </span>
                )}
                {expiringSoon && (
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    Sắp hết hạn
                  </span>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleUnpin(pin)}
                    disabled={unpinMutation.isPending}
                    className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-card hover:text-red-600 disabled:opacity-50 transition-colors cursor-pointer"
                    title="Bỏ ghim"
                  >
                    <X className="w-3.5 h-3.5" /> Bỏ ghim
                  </button>
                )}
              </div>
              {/* Flatten the post's own card chrome so ribbon + post read as a single card */}
              <div className="[&>div]:!rounded-none [&>div]:!border-0 [&>div]:!shadow-none [&>div]:!mb-0">
                <Post {...mapApiPost(pin.post)} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
