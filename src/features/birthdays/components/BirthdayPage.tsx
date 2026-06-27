import { useMemo, useState } from 'react';
import { Search, Loader2, Gift, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useBirthdays, useSendBirthdayWish, type BirthdayFriend } from '../hooks/useBirthdays';
import { SendWishDialog } from './SendWishDialog';
import { toast } from 'sonner';

function formatGroupLabel(
  friends: BirthdayFriend[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (friends.length === 0) return '';
  if (friends.length === 1) return friends[0].name;
  if (friends.length === 2) return `${friends[0].name}, ${friends[1].name}`;
  return t('birthdays.andOthers', {
    name1: friends[0].name,
    name2: friends[1].name,
    count: friends.length - 2,
  });
}

interface BirthdayFriendCardProps {
  friend: BirthdayFriend;
  showAge?: boolean;
  onSendWish: (friend: BirthdayFriend, message?: string) => void;
  onOpenCustomWish: (friend: BirthdayFriend) => void;
}

const PANEL_CLASS =
  'w-full rounded-xl border border-border bg-card p-5 shadow-sm dark:shadow-none';

const QUICK_WISH_KEYS = ['quickWish1', 'quickWish2', 'quickWish3', 'quickWish4'] as const;

function BirthdayFriendCard({ friend, showAge = true, onSendWish, onOpenCustomWish }: BirthdayFriendCardProps) {
  const { t } = useTranslation();
  const quickWishes = useMemo(
    () => QUICK_WISH_KEYS.map((key) => t(`birthdays.${key}`)),
    [t],
  );

  const birthDate = new Date(friend.birthDate);
  const birthDateLabel = t('birthdays.birthDate', {
    day: birthDate.getDate(),
    month: birthDate.getMonth() + 1,
  });
  const timingLabel = friend.isToday
    ? t('birthdays.todayLabel')
    : t('birthdays.daysUntil', { count: friend.daysUntil });

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/profile/${friend.userId}`}>
            <UserAvatar
              name={friend.name}
              avatarUrl={friend.avatar}
              userId={friend.userId}
              rounded="full"
              className="h-14 w-14 shrink-0 border border-border"
            />
          </Link>
          <div className="min-w-0">
            <Link to={`/profile/${friend.userId}`} className="font-semibold text-foreground hover:underline">
              {friend.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {timingLabel} · {birthDateLabel}
              {showAge ? ` · ${t('birthdays.age', { age: friend.age })}` : ''}
            </p>
          </div>
        </div>
        <Link
          to={`/messages?with=${friend.userId}`}
          className="shrink-0 rounded-lg bg-muted p-2 text-foreground hover:bg-muted"
          title={t('birthdays.message')}
        >
          <MessageCircle className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickWishes.map((wish) => (
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
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          {t('birthdays.writeWish')}
        </button>
      </div>
    </div>
  );
}

export function BirthdayPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [wishFriend, setWishFriend] = useState<BirthdayFriend | null>(null);
  const [wishDialogOpen, setWishDialogOpen] = useState(false);
  const [wishInitialMessage, setWishInitialMessage] = useState('');

  const { today, byMonth, isSearching, loading, error } = useBirthdays(searchQuery);
  const sendWish = useSendBirthdayWish();

  const handleQuickWish = async (friend: BirthdayFriend, message: string) => {
    try {
      await sendWish.mutateAsync({ recipientId: friend.userId, message });
      toast.success(t('birthdays.sendSuccess', { name: friend.name }));
    } catch (err) {
      toast.error((err as Error).message || t('birthdays.sendError'));
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">{t('birthdays.loadError')}</p>
        <p className="mt-1 text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  const hasSearchResults = today.length > 0 || byMonth.length > 0;
  const showTodaySection = !isSearching || today.length > 0;
  const showMonthSection = byMonth.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative mb-6 max-w-xl shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('birthdays.searchPlaceholder')}
          className="w-full rounded-full bg-muted py-2.5 pl-10 pr-4 text-sm outline-none focus:bg-muted dark:focus:bg-card"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 sidebar-scrollbar">
          {showTodaySection && (
            <section className={PANEL_CLASS}>
              <div className="mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                <h2 className="text-xl font-bold text-foreground">{t('birthdays.today')}</h2>
              </div>
              {today.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">{t('birthdays.noToday')}</p>
              )}
            </section>
          )}

          {showMonthSection && (
            <section className={PANEL_CLASS}>
              <h2 className="mb-4 text-xl font-bold text-foreground">{t('birthdays.byMonth')}</h2>
              <div className="flex flex-col gap-4">
                {byMonth.map((group) => (
                  <div
                    key={group.month}
                    className="rounded-xl border border-border bg-muted/50 p-4"
                  >
                    <h3 className="text-base font-bold text-foreground">
                      {t('birthdays.month', { month: group.month })}
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {formatGroupLabel(group.friends, t)}
                    </p>
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
                            className="h-14 w-14 border-2 border-white shadow-sm transition-transform group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

      {isSearching && !hasSearchResults && (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">{t('birthdays.noSearchResults')}</p>
          <p className="mt-1 text-sm">{t('birthdays.noSearchResultsHint')}</p>
        </div>
      )}
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
