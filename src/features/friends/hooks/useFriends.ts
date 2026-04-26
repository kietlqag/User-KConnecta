import { useQuery } from '@tanstack/react-query';
import { friendService } from '@/services/friendService';
import { Friend } from '../types/friends.types';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=random&name=User';

export function useFriends(userId: string | undefined) {
  return useQuery<Friend[]>({
    queryKey: ['friends', userId],
    queryFn: async () => {
      const data = await friendService.getFriends(userId!);
      return data.map((f) => ({
        id: f.friendshipId!,
        userId: f.userId,
        name: f.fullName,
        avatar: f.avatarUrl ?? DEFAULT_AVATAR,
        mutualFriends: f.mutualFriends,
        isFriend: true,
      }));
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
