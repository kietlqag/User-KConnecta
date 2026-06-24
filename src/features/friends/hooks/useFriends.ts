import { useQuery } from '@tanstack/react-query';
import { friendService } from '@/services/friendService';
import { resolveUserAvatarUrl } from '@/utils/userAvatarUtils';
import { Friend } from '../types/friends.types';

export function useFriends(userId: string | undefined) {
  return useQuery<Friend[]>({
    queryKey: ['friends', userId],
    queryFn: async () => {
      const data = await friendService.getFriends(userId!);
      return data.map((f) => ({
        id: f.friendshipId!,
        userId: f.userId,
        name: f.fullName,
        avatar: resolveUserAvatarUrl(f.avatarUrl) || '',
        mutualFriends: f.mutualFriends,
        isFriend: true,
      }));
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
