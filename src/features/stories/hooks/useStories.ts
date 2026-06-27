import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { storyService, type StoryResponse } from '@/services/storyService';

// ─── Query key ───────────────────────────────────────────────────────────────

export const STORIES_QUERY_KEY = ['stories'] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Extends StoryResponse with a pending flag for optimistic entries. */
export interface OptimisticStory extends StoryResponse {
  isPending?: boolean;
}

type CreateStoryParams = Parameters<typeof storyService.createStory>[0];

interface MutationContext {
  previousStories: OptimisticStory[] | undefined;
  tempId: string;
  /** Object URL created from the uploaded File — must be revoked after use. */
  previewObjectUrl: string | null;
}

// ─── useStoriesQuery ─────────────────────────────────────────────────────────

/**
 * Fetches all active stories.
 * Used by Stories.tsx on the home feed.
 */
export function useStoriesQuery() {
  return useQuery<OptimisticStory[]>({
    queryKey: STORIES_QUERY_KEY,
    queryFn: () => storyService.getAllActiveStories() as Promise<OptimisticStory[]>,
    staleTime: 30_000,
  });
}

// ─── useCreateStoryMutation ──────────────────────────────────────────────────

/**
 * Creates a story with full optimistic UI:
 *
 *  onMutate  → cancel queries, snapshot cache, inject temp story
 *  onSuccess → replace temp story with server response
 *  onError   → rollback to snapshot, show error toast
 *  onSettled → invalidate to force fresh fetch
 */
export function useCreateStoryMutation() {
  const queryClient = useQueryClient();

  return useMutation<StoryResponse, Error, CreateStoryParams, MutationContext>({
    mutationFn: storyService.createStory,

    // retry: 2 means the mutation fn is called up to 3 times total before
    // onError fires.
    retry: 2,

    // ── onMutate ────────────────────────────────────────────────────────────
    onMutate: async (variables) => {
      // 1. Stop any in-flight refetch so it doesn't overwrite our optimistic data.
      await queryClient.cancelQueries({ queryKey: STORIES_QUERY_KEY });

      // 2. Snapshot for rollback.
      const previousStories = queryClient.getQueryData<OptimisticStory[]>(STORIES_QUERY_KEY);

      // 3. Build a temporary story that looks like a real one.
      const currentUser = authService.getCurrentUser();
      const tempId = `temp-${Date.now()}`;
      const previewObjectUrl =
        variables.image instanceof File ? URL.createObjectURL(variables.image) : null;

      const tempStory: OptimisticStory = {
        id: tempId,
        userId: variables.userId,
        username: currentUser?.username ?? '',
        userFullName: currentUser?.fullName ?? 'Bạn',
        userAvatarUrl: currentUser?.avatarUrl ?? '',
        imageUrl: previewObjectUrl,
        backgroundColor: variables.backgroundColor ?? null,
        textContent: variables.textContent ?? null,
        textColor: variables.textColor ?? null,
        textSize: variables.textSize ?? null,
        textPosX: variables.textPosX ?? null,
        textPosY: variables.textPosY ?? null,
        musicTrackId: null,
        altText: variables.altText ?? null,
        privacy: variables.privacy,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + (variables.durationHours ?? 24) * 60 * 60 * 1000,
        ).toISOString(),
        active: true,
        isPending: true,
      };

      queryClient.setQueryData<OptimisticStory[]>(STORIES_QUERY_KEY, (old = []) => [
        tempStory,
        ...old,
      ]);

      return { previousStories, tempId, previewObjectUrl };
    },

    // ── onSuccess ───────────────────────────────────────────────────────────
    onSuccess: (serverStory, _variables, context) => {
      if (!context) return;

      queryClient.setQueryData<OptimisticStory[]>(STORIES_QUERY_KEY, (old = []) => {
        const hasTemp = old.some((s) => s.id === context.tempId);
        if (hasTemp) {
          return old.map((s) =>
            s.id === context.tempId ? { ...serverStory, isPending: false } : s,
          );
        }
        if (old.some((s) => s.id === serverStory.id)) {
          return old.map((s) =>
            s.id === serverStory.id ? { ...serverStory, isPending: false } : s,
          );
        }
        return [{ ...serverStory, isPending: false }, ...old];
      });

      if (context.previewObjectUrl) {
        URL.revokeObjectURL(context.previewObjectUrl);
      }
    },

    // ── onError ─────────────────────────────────────────────────────────────
    onError: (_error, _variables, context) => {
      // Rollback cache to the pre-mutation snapshot.
      if (context?.previousStories !== undefined) {
        queryClient.setQueryData<OptimisticStory[]>(STORIES_QUERY_KEY, context.previousStories);
      }

      if (context?.previewObjectUrl) {
        URL.revokeObjectURL(context.previewObjectUrl);
      }

      toast.error('Không thể đăng tin. Vui lòng thử lại.');
    },

    // ── onSettled ───────────────────────────────────────────────────────────
    onSettled: () => {
      // Always resync with the server after the mutation completes (or fails).
      queryClient.invalidateQueries({ queryKey: STORIES_QUERY_KEY });
    },
  });
}

interface DeleteStoryContext {
  previousStories: OptimisticStory[] | undefined;
}

// ─── useDeleteStoryMutation ──────────────────────────────────────────────────

export function useDeleteStoryMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, DeleteStoryContext>({
    mutationFn: storyService.deleteStory,

    onMutate: async (storyId) => {
      await queryClient.cancelQueries({ queryKey: STORIES_QUERY_KEY });
      const previousStories = queryClient.getQueryData<OptimisticStory[]>(STORIES_QUERY_KEY);

      queryClient.setQueryData<OptimisticStory[]>(STORIES_QUERY_KEY, (old = []) =>
        old.filter((story) => story.id !== storyId),
      );

      return { previousStories };
    },

    onError: (_error, _storyId, context) => {
      if (context?.previousStories !== undefined) {
        queryClient.setQueryData<OptimisticStory[]>(STORIES_QUERY_KEY, context.previousStories);
      }
      toast.error('Không thể xóa tin. Vui lòng thử lại.');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_QUERY_KEY });
    },
  });
}
