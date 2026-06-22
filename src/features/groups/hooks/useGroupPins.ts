import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupPinService, type PinPostBody } from '@/services/groupPinService';

export const groupPinsKey = (groupId: string | undefined) => ['groups', 'pinned', groupId];

export function useGroupPinnedPosts(groupId: string | undefined) {
  return useQuery({
    queryKey: groupPinsKey(groupId),
    queryFn: () => groupPinService.getPinnedPosts(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

export function usePinPost(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, body }: { postId: string; body?: PinPostBody }) =>
      groupPinService.pin(groupId!, postId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupPinsKey(groupId) });
    },
  });
}

export function useUnpinPost(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => groupPinService.unpin(groupId!, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupPinsKey(groupId) });
    },
  });
}

export function useMarkPinRead(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinId: string) => groupPinService.markRead(groupId!, pinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupPinsKey(groupId) });
    },
  });
}
