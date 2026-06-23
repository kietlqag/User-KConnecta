import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, UserPlus } from 'lucide-react';
import {
  postService,
  type PostReactionDetailsResponse,
  type PostReactionUserResponse,
} from '@/services/postService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/ui/utils';
import { reactions } from './ReactionButton';
import {
  getActiveReactions,
  getTotalReactionCount,
  mapReactionCounts,
  type ReactionCountMap,
} from './reactionSummary';

interface ReactionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Used as the default fetch source and as a stable key. Pass the post or album id. */
  postId: string;
  reactionCounts: ReactionCountMap;
  /** Optional custom fetcher (e.g. for albums). Defaults to post reaction details. */
  fetchDetails?: () => Promise<PostReactionDetailsResponse>;
}

type FilterType = 'ALL' | (typeof reactions)[number]['type'];

export function ReactionSummaryDialog({
  open,
  onOpenChange,
  postId,
  reactionCounts,
  fetchDetails,
}: ReactionSummaryDialogProps) {
  const fetchDetailsRef = useRef(fetchDetails);
  fetchDetailsRef.current = fetchDetails;
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [resolvedCounts, setResolvedCounts] = useState<ReactionCountMap>(reactionCounts);
  const [reactionUsers, setReactionUsers] = useState<PostReactionUserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoreOpen, setShowMoreOpen] = useState(false);

  useEffect(() => {
    setResolvedCounts(reactionCounts);
  }, [reactionCounts]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    const fetchReactionDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await (fetchDetailsRef.current
          ? fetchDetailsRef.current()
          : postService.getReactionDetails(postId));

        if (!isMounted) {
          return;
        }

        setResolvedCounts(mapReactionCounts(response.counts, reactionCounts));
        setReactionUsers(response.reactions);
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải danh sách cảm xúc');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchReactionDetails();

    return () => {
      isMounted = false;
    };
  }, [open, postId, reactionCounts]);

  const activeReactions = useMemo(() => getActiveReactions(resolvedCounts), [resolvedCounts]);
  const totalCount = getTotalReactionCount(resolvedCounts);

  const filteredUsers = useMemo(() => {
    if (activeFilter === 'ALL') {
      return reactionUsers;
    }

    return reactionUsers.filter((user) => user.reactionType === activeFilter);
  }, [activeFilter, reactionUsers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] gap-0 overflow-hidden rounded-[20px] border-0 p-0 sm:max-h-[72vh]">
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 px-5 pt-4">
          <DialogTitle className="sr-only">Chi tiết cảm xúc</DialogTitle>
          <DialogDescription className="sr-only">
            Hiển thị tổng số cảm xúc và danh sách người dùng theo từng loại cảm xúc.
          </DialogDescription>

          <div className="flex items-center gap-5 pr-10 relative">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={cn(
                'border-b-[3px] pb-3 text-[16px] font-semibold transition-colors',
                activeFilter === 'ALL'
                  ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-200',
              )}
            >
              Tất cả
            </button>

            {activeReactions.slice(0, 3).map((reaction) => (
              <button
                key={reaction.type}
                type="button"
                onClick={() => {
                  setActiveFilter(reaction.type);
                  setShowMoreOpen(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 border-b-[3px] pb-3 text-[16px] font-semibold transition-colors',
                  activeFilter === reaction.type
                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-200',
                )}
              >
                <img src={reaction.emoji} alt={reaction.label} width={20} height={20} draggable={false} />
                <span>{resolvedCounts[reaction.type]}</span>
              </button>
            ))}

            {activeReactions.length > 3 && (
              <button
                type="button"
                onClick={() => setShowMoreOpen((open) => !open)}
                className="flex items-center gap-1 border-b-[3px] border-transparent pb-3 text-[16px] font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-200"
              >
                <span>Xem thêm</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            )}

            {activeReactions.length > 3 && showMoreOpen && (
              <div className="absolute left-[120px] top-[52px] z-20 min-w-[160px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg">
                {activeReactions.slice(3).map((reaction) => (
                  <button
                    key={reaction.type}
                    type="button"
                    onClick={() => {
                      setActiveFilter(reaction.type);
                      setShowMoreOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-[14px]',
                      activeFilter === reaction.type
                        ? 'bg-blue-50 font-semibold text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-muted',
                    )}
                  >
                    <img src={reaction.emoji} alt={reaction.label} width={18} height={18} draggable={false} />
                    <span className="flex-1 truncate">{reaction.label}</span>
                    <span className="text-[13px] text-gray-500 dark:text-gray-400">{resolvedCounts[reaction.type]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[480px] overflow-y-auto px-5 py-3.5">
          {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải danh sách cảm xúc...</p>}

          {!isLoading && error && <p className="text-sm text-red-500">{error}</p>}

          {!isLoading && !error && totalCount <= 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có cảm xúc nào cho bài viết này.</p>
          )}

          {!isLoading && !error && filteredUsers.length > 0 && (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const reaction = reactions.find((item) => item.type === user.reactionType);

                return (
                  <div key={`${user.userId}-${user.reactionType}`} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">
                            {user.fullName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white dark:bg-gray-800 leading-none">
                          {reaction?.emoji && <img src={reaction.emoji} alt={reaction.label} width={14} height={14} draggable={false} />}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-gray-900 dark:text-gray-100">{user.fullName}</p>
                        <p className="truncate text-[13px] text-gray-500 dark:text-gray-400">@{user.username}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-200 dark:bg-gray-700 px-4 py-2.5 text-[14px] font-semibold text-gray-900 dark:text-gray-100 transition-colors hover:bg-gray-300"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Thêm bạn bè</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
