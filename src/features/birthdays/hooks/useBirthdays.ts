import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  birthdayService,
  type BirthdayFriendApi,
  type BirthdayWishApi,
} from '../services/birthdayService';

export interface BirthdayFriend {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  birthDate: string;
  age: number;
  isToday: boolean;
  daysUntil: number;
}

export interface BirthdayMonthGroup {
  month: number;
  monthLabel: string;
  friends: BirthdayFriend[];
}

export interface BirthdayWish {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string;
  message: string;
  createdAt: string;
}

function mapFriend(item: BirthdayFriendApi): BirthdayFriend {
  return {
    id: item.friendshipId,
    userId: item.userId,
    name: item.fullName,
    avatar: item.avatarUrl?.trim() || '',
    birthDate: item.dateOfBirth,
    age: item.age,
    isToday: item.today,
    daysUntil: item.daysUntil,
  };
}

function mapWish(item: BirthdayWishApi): BirthdayWish {
  return {
    id: item.id,
    senderId: item.senderId,
    senderName: item.senderName,
    senderAvatar: item.senderAvatarUrl?.trim() || '',
    recipientId: item.recipientId,
    recipientName: item.recipientName,
    recipientAvatar: item.recipientAvatarUrl?.trim() || '',
    message: item.message,
    createdAt: item.createdAt,
  };
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .trim();
}

function groupByMonth(friends: BirthdayFriend[]): BirthdayMonthGroup[] {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const map = new Map<number, BirthdayFriend[]>();
  friends
    .filter((friend) => {
      const d = new Date(friend.birthDate);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return month > currentMonth || (month === currentMonth && day > currentDay);
    })
    .sort((a, b) => {
      const da = new Date(a.birthDate);
      const db = new Date(b.birthDate);
      if (da.getMonth() !== db.getMonth()) return da.getMonth() - db.getMonth();
      return da.getDate() - db.getDate();
    })
    .forEach((friend) => {
      const month = new Date(friend.birthDate).getMonth() + 1;
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(friend);
    });

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, list]) => ({
      month,
      monthLabel: `Tháng ${month}`,
      friends: list,
    }));
}

export function useBirthdays(searchQuery = '') {
  const friendsQuery = useQuery({
    queryKey: ['birthdays', 'friends'],
    queryFn: () => birthdayService.getAllFriends(),
    staleTime: 60_000,
  });

  const allFriends = useMemo(
    () => (friendsQuery.data ?? []).map(mapFriend),
    [friendsQuery.data],
  );

  const normalizedQuery = normalizeSearchText(searchQuery);
  const isSearching = normalizedQuery.length > 0;

  const filteredFriends = useMemo(() => {
    if (!isSearching) return allFriends;
    return allFriends.filter((friend) =>
      normalizeSearchText(friend.name).includes(normalizedQuery),
    );
  }, [allFriends, isSearching, normalizedQuery]);

  const today = useMemo(
    () =>
      filteredFriends
        .filter((friend) => friend.isToday)
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [filteredFriends],
  );

  const upcoming = useMemo(
    () =>
      filteredFriends
        .filter((friend) => !friend.isToday && friend.daysUntil <= 7)
        .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, 'vi')),
    [filteredFriends],
  );

  const byMonth = useMemo(() => groupByMonth(filteredFriends), [filteredFriends]);

  return {
    today,
    upcoming,
    byMonth,
    isSearching,
    loading: friendsQuery.isLoading,
    error: friendsQuery.error,
    refetch: friendsQuery.refetch,
  };
}

export function useBirthdayWishes(direction: 'all' | 'sent' | 'received' = 'received') {
  return useQuery({
    queryKey: ['birthdays', 'wishes', direction],
    queryFn: () => birthdayService.getWishHistory(direction),
    select: (data) => data.map(mapWish),
    staleTime: 30_000,
  });
}

export function useSendBirthdayWish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, message }: { recipientId: string; message: string }) =>
      birthdayService.sendWish(recipientId, message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['birthdays', 'wishes'] });
    },
  });
}

export function useTodayBirthdaysSidebar() {
  return useQuery({
    queryKey: ['birthdays', 'friends'],
    queryFn: () => birthdayService.getAllFriends(),
    select: (data) => data.map(mapFriend).filter((friend) => friend.isToday),
    staleTime: 5 * 60_000,
  });
}
