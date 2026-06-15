import { useQuery } from '@tanstack/react-query';
import { friendService, type FriendBirthdayApiResponse } from '@/services/friendService';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=random&name=User';

export interface BirthdayFriend {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  birthDate: string;
}

function mapBirthdayFriend(item: FriendBirthdayApiResponse): BirthdayFriend {
  return {
    id: item.friendshipId,
    userId: item.userId,
    name: item.fullName,
    avatar: item.avatarUrl ?? DEFAULT_AVATAR,
    birthDate: item.dateOfBirth,
  };
}

export function useFriendBirthdays(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['friend-birthdays', userId],
    queryFn: () => friendService.getFriendBirthdays(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });

  return {
    birthdays: (query.data ?? []).map(mapBirthdayFriend),
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
