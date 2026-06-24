import { useState } from 'react';
import { Search, Loader2, Gift, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { QUICK_BIRTHDAY_WISHES } from '../services/birthdayService';
import { useBirthdays, useBirthdayWishes, useSendBirthdayWish, type BirthdayFriend } from '../hooks/useBirthdays';
import { SendWishDialog } from './SendWishDialog';
import { toast } from 'sonner';

function formatBirthDate(birthDate: string): string {
  const d = new Date(birthDate);
  return `${d.getDate()} tháng ${d.getMonth() + 1}`;
}

function formatWishTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatGroupLabel(friends: BirthdayFriend[]): string {
  if (friends.length === 0) return '';
  if (friends.length === 1) return friends[0].name;
  if (friends.length === 2) return `${friends[0].name}, ${friends[1].name}`;
  return `${friends[0].name}, ${friends[1].name} và ${friends.length - 2} người khác`;
}

interface BirthdayFriendCardProps {
  friend: BirthdayFriend;
  showAge?: boolean;
  onSendWish: (friend: BirthdayFriend, message?: string) => void;
  onOpenCustomWish: (friend: BirthdayFriend) => void;
}

const PANEL_CLASS =
  'w-full rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800 dark:shadow-none';

function BirthdayFriendCard({ friend, showAge = true, onSendWish, onOpenCustomWish }: BirthdayFriendCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/profile/${friend.userId}`}>
            <UserAvatar
              name={friend.name}
              avatarUrl={friend.avatar}
              userId={friend.userId}
              rounded="full"
              className="h-14 w-14 shrink-0 border border-gray-200 dark:border-gray-700"
            />
          </Link>
          <div className="min-w-0">
            <Link to={`/profile/${friend.userId}`} className="font-semibold text-gray-900 hover:underline dark:text-gray-100">
              {friend.name}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {friend.isToday ? 'Hôm nay' : `Còn ${friend.daysUntil} ngày`} · {formatBirthDate(friend.birthDate)}
              {showAge ? ` · ${friend.age} tuổi` : ''}
            </p>
          </div>
        </div>
        <Link
          to={`/messages?with=${friend.userId}`}
          className="shrink-0 rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          title="Nhắn tin"
        >
          <MessageCircle className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_BIRTHDAY_WISHES.map((wish) => (
          <button
            key={wish}
            type="button"
            onClick={() => onSendWish(friend, wish)}
            className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
          >
            {wish}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onOpenCustomWish(friend)}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Viết lời chúc...
        </button>
      </div>
    </div>
  );
}

export function BirthdayPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [wishFriend, setWishFriend] = useState<BirthdayFriend | null>(null);
  const [wishDialogOpen, setWishDialogOpen] = useState(false);
  const [wishInitialMessage, setWishInitialMessage] = useState('');
  const [historyTab, setHistoryTab] = useState<'received' | 'sent'>('received');

  const { today, upcoming, byMonth, isSearching, loading, error } = useBirthdays(searchQuery);
  const wishHistory = useBirthdayWishes(historyTab);
  const sendWish = useSendBirthdayWish();

  const handleQuickWish = async (friend: BirthdayFriend, message: string) => {
    try {
      await sendWish.mutateAsync({ recipientId: friend.userId, message });
      toast.success(`Đã gửi lời chúc đến ${friend.name}`);
    } catch (err) {
      toast.error((err as Error).message || 'Không thể gửi lời chúc');
    }
  };

  const openCustomWish = (friend: BirthdayFriend, message = '') => {
    setWishFriend(friend);
    setWishInitialMessage(message);
    setWishDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">Không thể tải sinh nhật bạn bè</p>
        <p className="mt-1 text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  const hasResults = today.length > 0 || upcoming.length > 0 || byMonth.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative mb-6 max-w-xl shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm kiếm bạn bè theo tên..."
          className="w-full rounded-full bg-gray-100 py-2.5 pl-10 pr-4 text-sm outline-none focus:bg-gray-200 dark:bg-gray-900 dark:focus:bg-gray-800"
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-h-0 space-y-6 overflow-y-auto pr-1 sidebar-scrollbar">
          {(today.length > 0 || byMonth.length > 0) && (
            <div className="flex flex-col gap-6">
              {today.length > 0 && (
                <section className={PANEL_CLASS}>
                  <div className="mb-4 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-pink-500" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sinh nhật hôm nay</h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {today.map((friend) => (
                      <BirthdayFriendCard
                        key={friend.userId}
                        friend={friend}
                        onSendWish={(f, msg) => void handleQuickWish(f, msg!)}
                        onOpenCustomWish={openCustomWish}
                      />
                    ))}
                  </div>
                </section>
              )}

              {byMonth.length > 0 && (
                <section className={PANEL_CLASS}>
                  <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Sinh nhật theo tháng</h2>
                  <div className="flex flex-col gap-4">
                    {byMonth.map((group) => (
                      <div
                        key={group.month}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
                      >
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{group.monthLabel}</h3>
                        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{formatGroupLabel(group.friends)}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.friends.map((friend) => (
                            <button
                              key={friend.userId}
                              type="button"
                              onClick={() => openCustomWish(friend)}
                              className="group relative"
                              title={friend.name}
                            >
                              <UserAvatar
                                name={friend.name}
                                avatarUrl={friend.avatar}
                                userId={friend.userId}
                                rounded="full"
                                className="h-14 w-14 border-2 border-white shadow-sm transition-transform group-hover:scale-105 dark:border-gray-700"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

      {upcoming.length > 0 && (
        <section className={PANEL_CLASS}>
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Sinh nhật sắp tới (7 ngày)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((friend) => (
              <BirthdayFriendCard
                key={friend.userId}
                friend={friend}
                onSendWish={(f, msg) => void handleQuickWish(f, msg!)}
                onOpenCustomWish={openCustomWish}
              />
            ))}
          </div>
        </section>
      )}

      {!hasResults && (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">
            {isSearching ? 'Không tìm thấy bạn bè phù hợp' : 'Không có sinh nhật nào sắp tới'}
          </p>
          <p className="mt-1 text-sm">
            {isSearching
              ? 'Thử từ khóa khác hoặc xóa ô tìm kiếm.'
              : 'Bạn bè chưa cập nhật ngày sinh hoặc chưa có bạn bè.'}
          </p>
        </div>
      )}
        </div>

        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <h2 className="mb-3 shrink-0 text-lg font-bold text-gray-900 dark:text-gray-100">Lịch sử lời chúc</h2>
        <div className="mb-4 flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setHistoryTab('received')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              historyTab === 'received'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Đã nhận
          </button>
          <button
            type="button"
            onClick={() => setHistoryTab('sent')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              historyTab === 'sent'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Đã gửi
          </button>
        </div>

        {wishHistory.isLoading ? (
          <div className="flex flex-1 justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (wishHistory.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có lời chúc nào</p>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto sidebar-scrollbar">
            {(wishHistory.data ?? []).map((wish) => {
              const person = historyTab === 'received'
                ? { name: wish.senderName, avatar: wish.senderAvatar, id: wish.senderId }
                : { name: wish.recipientName, avatar: wish.recipientAvatar, id: wish.recipientId };
              return (
                <div key={wish.id} className="flex gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                  <Link to={`/profile/${person.id}`}>
                    <UserAvatar
                      name={person.name}
                      avatarUrl={person.avatar}
                      userId={person.id}
                      rounded="full"
                      className="h-10 w-10"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{person.name}</p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{wish.message}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatWishTime(wish.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      </div>

      <SendWishDialog
        friend={wishFriend}
        open={wishDialogOpen}
        onOpenChange={setWishDialogOpen}
        initialMessage={wishInitialMessage}
      />
    </div>
  );
}
