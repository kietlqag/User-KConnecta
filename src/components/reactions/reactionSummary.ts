import type { PostReactionCountResponse, ReactionType } from '@/services/postService';
import { reactions, type ReactionOption } from './ReactionButton';

export type ReactionCountMap = Record<ReactionType, number>;

export const EMPTY_REACTION_COUNTS: ReactionCountMap = {
  LIKE: 0,
  LOVE: 0,
  HAHA: 0,
  WOW: 0,
  SAD: 0,
  ANGRY: 0,
};

export function buildInitialReactionCounts(
  totalCount: number,
  currentUserReactionType?: ReactionType | null,
): ReactionCountMap {
  const counts = { ...EMPTY_REACTION_COUNTS };

  if (totalCount <= 0) {
    return counts;
  }

  if (!currentUserReactionType || currentUserReactionType === 'LIKE') {
    counts.LIKE = totalCount;
    return counts;
  }

  counts[currentUserReactionType] = 1;
  counts.LIKE = Math.max(totalCount - 1, 0);
  return counts;
}

export function updateReactionCounts(
  counts: ReactionCountMap,
  previousType: ReactionType | null,
  nextType: ReactionType,
): ReactionCountMap {
  const nextCounts = { ...counts };

  if (previousType) {
    nextCounts[previousType] = Math.max(0, nextCounts[previousType] - 1);
  }

  nextCounts[nextType] += 1;
  return nextCounts;
}

export function getActiveReactions(counts: ReactionCountMap): ReactionOption[] {
  return reactions.filter((reaction) => counts[reaction.type] > 0);
}

export function getTotalReactionCount(counts: ReactionCountMap): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}

export function mapReactionCounts(
  counts: PostReactionCountResponse[] | undefined,
  fallback?: ReactionCountMap,
): ReactionCountMap {
  const mapped = { ...EMPTY_REACTION_COUNTS };

  if (!counts || counts.length === 0) {
    return fallback ? { ...fallback } : mapped;
  }

  counts.forEach((item) => {
    mapped[item.reactionType] = item.count;
  });

  return mapped;
}
