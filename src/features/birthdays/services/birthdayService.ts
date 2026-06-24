import { api } from '@/services/api';

export interface BirthdayFriendApi {
  friendshipId: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  dateOfBirth: string;
  age: number;
  today: boolean;
  daysUntil: number;
}

export interface BirthdayMonthGroupApi {
  month: number;
  monthLabel: string;
  friends: BirthdayFriendApi[];
}

export interface BirthdayWishApi {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  recipientId: string;
  recipientName: string;
  recipientAvatarUrl: string | null;
  message: string;
  createdAt: string;
}

export const QUICK_BIRTHDAY_WISHES = [
  'Chúc mừng sinh nhật! 🎉',
  'Happy Birthday!',
  'Chúc bạn một ngày thật vui vẻ!',
  'Chúc bạn sức khỏe và hạnh phúc!',
] as const;

export const birthdayService = {
  getAllFriends: () => api.get<BirthdayFriendApi[]>('/birthdays/friends'),

  getToday: () => api.get<BirthdayFriendApi[]>('/birthdays/today'),

  getUpcoming: (days = 7) => api.get<BirthdayFriendApi[]>(`/birthdays/upcoming?days=${days}`),

  getByMonth: () => api.get<BirthdayMonthGroupApi[]>('/birthdays/by-month'),

  search: (query: string) =>
    api.get<BirthdayFriendApi[]>(`/birthdays/search?q=${encodeURIComponent(query)}`),

  sendWish: (recipientId: string, message: string) =>
    api.post<BirthdayWishApi>('/birthdays/wishes', { recipientId, message }),

  getWishHistory: (direction: 'all' | 'sent' | 'received' = 'all', limit = 50) =>
    api.get<BirthdayWishApi[]>(`/birthdays/wishes?direction=${direction}&limit=${limit}`),
};
