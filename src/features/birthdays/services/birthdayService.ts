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

  sendWish: (recipientId: string, message: string) =>
    api.post<BirthdayWishApi>('/birthdays/wishes', { recipientId, message }),
};
