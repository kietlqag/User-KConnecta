import { MessageCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { authService } from '../../../../services/authService';
import { useFriendBirthdays, type BirthdayFriend } from '../../hooks/useFriendBirthdays';
import { BirthdayNameHoverCard } from './BirthdayNameHoverCard';

function getAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatBirthDate(birthDate: string): string {
  const d = new Date(birthDate);
  return `${d.getDate()} tháng ${d.getMonth() + 1} ${d.getFullYear()}`;
}

function formatBirthdayHoverText(birthDate: string, name: string): string {
  const d = new Date(birthDate);
  return `${d.getDate()} Tháng ${d.getMonth() + 1} là sinh nhật của ${name}`;
}

function getMonthName(month: number): string {
  return `Tháng ${month}`;
}

function getMonthDay(birthDate: string): number {
  const d = new Date(birthDate);
  return d.getMonth() * 100 + d.getDate();
}

function getUpcomingBirthdays(friends: BirthdayFriend[]): BirthdayFriend[] {
  const today = new Date();
  const todayMd = today.getMonth() * 100 + today.getDate();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 7);
  const windowEndMd = windowEnd.getMonth() * 100 + windowEnd.getDate();

  return friends
    .filter((f) => {
      const fMd = getMonthDay(f.birthDate);
      if (windowEnd.getMonth() >= today.getMonth()) {
        return fMd >= todayMd && fMd <= windowEndMd;
      }
      return fMd >= todayMd || fMd <= windowEndMd;
    })
    .sort((a, b) => getMonthDay(a.birthDate) - getMonthDay(b.birthDate));
}

function groupByMonth(friends: BirthdayFriend[]): Map<number, BirthdayFriend[]> {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const upcoming = friends.filter((f) => {
    const d = new Date(f.birthDate);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return month > currentMonth || (month === currentMonth && day > todayDay);
  });

  const map = new Map<number, BirthdayFriend[]>();
  upcoming.forEach((f) => {
    const month = new Date(f.birthDate).getMonth() + 1;
    if (!map.has(month)) map.set(month, []);
    map.get(month)!.push(f);
  });

  map.forEach((list, month) => {
    list.sort((a, b) => new Date(a.birthDate).getDate() - new Date(b.birthDate).getDate());
    map.set(month, list);
  });

  return new Map(
    [...map.entries()].sort((a, b) => {
      const aRel = a[0] > currentMonth ? a[0] - currentMonth : a[0] + 12 - currentMonth;
      const bRel = b[0] > currentMonth ? b[0] - currentMonth : b[0] + 12 - currentMonth;
      return aRel - bRel;
    }),
  );
}

function formatGroupLabel(friends: BirthdayFriend[]): string {
  if (friends.length === 0) return '';
  if (friends.length === 1) return friends[0].name;
  if (friends.length === 2) return `${friends[0].name}, ${friends[1].name}`;
  return `${friends[0].name}, ${friends[1].name} và ${friends.length - 2} người khác`;
}

interface UpcomingCardProps {
  friend: BirthdayFriend;
}

const UpcomingCard = ({ friend }: UpcomingCardProps) => (
  <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm dark:shadow-none">
    <div className="flex items-center gap-3">
      <Link to={`/profile/${friend.userId}`}>
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
          <ImageWithFallback
            src={friend.avatar}
            alt={friend.name}
            className="h-full w-full object-cover"
          />
        </div>
      </Link>
      <div>
        <BirthdayNameHoverCard friend={friend}>
          <Link to={`/profile/${friend.userId}`} className="inline-block">
            <p className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">{friend.name}</p>
          </Link>
        </BirthdayNameHoverCard>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatBirthDate(friend.birthDate)} · {getAge(friend.birthDate)} tuổi
        </p>
      </div>
    </div>
    <Link
      to={`/messages?with=${friend.userId}`}
      className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
    >
      <MessageCircle className="h-4 w-4" />
      Nhắn tin
    </Link>
  </div>
);

interface MonthSectionProps {
  month: number;
  friends: BirthdayFriend[];
}

const MonthSection = ({ month, friends }: MonthSectionProps) => (
  <div className="overflow-visible rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm dark:shadow-none">
    <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">{getMonthName(month)}</h3>
    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{formatGroupLabel(friends)}</p>
    <div className="flex flex-wrap gap-2">
      {friends.map((f) => (
        <div key={f.id} className="group/avatar relative">
          <Link to={`/profile/${f.userId}`} aria-label={formatBirthdayHoverText(f.birthDate, f.name)}>
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-sm dark:shadow-none transition-transform group-hover/avatar:scale-105">
              <ImageWithFallback
                src={f.avatar}
                alt={f.name}
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
          <div
            role="tooltip"
            className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-max max-w-[min(280px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-center text-sm font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/avatar:opacity-100"
          >
            {formatBirthdayHoverText(f.birthDate, f.name)}
            <span
              aria-hidden
              className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const BirthdayTab = () => {
  const currentUser = authService.getCurrentUser();
  const { birthdays, loading, error } = useFriendBirthdays(currentUser?.id);

  const upcoming = getUpcomingBirthdays(birthdays);
  const byMonth = groupByMonth(birthdays);

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

  return (
    <div className="max-w-2xl space-y-4">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">Sinh nhật sắp tới</h2>
          <div className="space-y-3">
            {upcoming.map((f) => (
              <UpcomingCard key={f.id} friend={f} />
            ))}
          </div>
        </section>
      )}

      {byMonth.size > 0 && (
        <section className="space-y-3">
          {[...byMonth.entries()].map(([month, friends]) => (
            <MonthSection key={month} month={month} friends={friends} />
          ))}
        </section>
      )}

      {upcoming.length === 0 && byMonth.size === 0 && (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">Không có sinh nhật nào sắp tới</p>
          <p className="mt-1 text-sm">Bạn bè chưa cập nhật ngày sinh hoặc chưa có bạn bè.</p>
        </div>
      )}
    </div>
  );
};
