import { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Users, UserMinus, UserCheck, Search, Check } from 'lucide-react';
import { friendService, type FriendApiResponse } from '@/services/friendService';
import { authService } from '@/services/authService';

interface ProfilePostAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAudience: string;
  excludedUserIds: string[];
  allowedUserIds: string[];
  onSelect: (audience: string, excludedUserIds: string[], allowedUserIds: string[]) => void;
}

const audienceOptions = [
  {
    id: 'public',
    icon: Globe,
    title: 'Công khai',
    description: 'Bất kỳ ai đều có thể xem bài viết này',
  },
  {
    id: 'friends',
    icon: Users,
    title: 'Bạn bè',
    description: 'Chỉ bạn bè của bạn mới có thể xem',
  },
  {
    id: 'specific-friends',
    icon: UserCheck,
    title: 'Bạn bè cụ thể',
    description: 'Chỉ những bạn bè được chọn mới có thể xem',
  },
  {
    id: 'friends-except',
    icon: UserMinus,
    title: 'Bạn bè ngoại trừ...',
    description: 'Bạn bè của bạn, ngoại trừ những người bạn chọn',
  },
];

export function ProfilePostAudienceModal({
  isOpen,
  onClose,
  selectedAudience,
  excludedUserIds,
  allowedUserIds,
  onSelect,
}: ProfilePostAudienceModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tempSelected, setTempSelected] = useState(selectedAudience);
  const [tempExcluded, setTempExcluded] = useState<string[]>(excludedUserIds);
  const [tempAllowed, setTempAllowed] = useState<string[]>(allowedUserIds);
  const [friends, setFriends] = useState<FriendApiResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setTempSelected(selectedAudience);
      setTempExcluded(excludedUserIds);
      setTempAllowed(allowedUserIds);
      setSearchQuery('');
    }
  }, [isOpen, selectedAudience, excludedUserIds, allowedUserIds]);

  useEffect(() => {
    if (step === 2 && friends.length === 0) {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        friendService.getFriends(currentUser.id).then(setFriends).catch(() => {});
      }
    }
  }, [step]);

  if (!isOpen) return null;

  const handleStep1Done = () => {
    if (tempSelected === 'friends-except' || tempSelected === 'specific-friends') {
      setStep(2);
    } else {
      onSelect(tempSelected, [], []);
      onClose();
    }
  };

  const handleStep2Done = () => {
    if (tempSelected === 'specific-friends') {
      onSelect('specific-friends', [], tempAllowed);
    } else {
      onSelect('friends-except', tempExcluded, []);
    }
    onClose();
  };

  const toggleExclude = (userId: string) => {
    setTempExcluded(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId],
    );
  };

  const toggleAllow = (userId: string) => {
    setTempAllowed(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId],
    );
  };

  const filteredFriends = friends.filter(f =>
    f.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isSpecificFriends = tempSelected === 'specific-friends';

  if (step === 2) {
    const selectedIds = isSpecificFriends ? tempAllowed : tempExcluded;
    const toggle = isSpecificFriends ? toggleAllow : toggleExclude;
    const title = isSpecificFriends ? 'Bạn bè cụ thể' : 'Bạn bè ngoại trừ';
    const description = isSpecificFriends
      ? 'Chọn bạn bè bạn muốn chia sẻ bài viết này'
      : 'Chọn bạn bè bạn muốn ẩn bài viết này';
    const doneLabel = isSpecificFriends
      ? `Xong${tempAllowed.length > 0 ? ` (${tempAllowed.length})` : ''}`
      : `Xong${tempExcluded.length > 0 ? ` (${tempExcluded.length})` : ''}`;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div className="relative flex shrink-0 items-center border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => setStep(1)}
              className="rounded-full p-2 transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            </button>
            <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>

          <div className="shrink-0 border-b border-gray-200 p-4 dark:border-gray-700">
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-4 text-sm outline-none dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredFriends.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {friends.length === 0 ? 'Đang tải...' : 'Không tìm thấy bạn bè'}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredFriends.map(friend => {
                  const isSelected = selectedIds.includes(friend.userId);
                  return (
                    <button
                      key={friend.userId}
                      onClick={() => toggle(friend.userId)}
                      className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                    >
                      <img
                        src={friend.avatarUrl ?? '/default-avatar.png'}
                        alt={friend.fullName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">
                        {friend.fullName}
                      </span>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-400 dark:bg-emerald-400'
                            : 'border-gray-400 dark:border-gray-500'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg px-6 py-2 font-semibold text-emerald-600 transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:text-emerald-400 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              onClick={handleStep2Done}
              className="rounded-lg bg-emerald-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              {doneLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="sticky top-0 relative flex items-center border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white">
            Đối tượng của bài viết
          </h2>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Ai có thể xem bài viết của bạn?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bài viết của bạn sẽ hiển thị trên Bảng feed, trang cá nhân và trong kết quả tìm kiếm.
            </p>
          </div>

          <div className="space-y-2">
            {audienceOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = tempSelected === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setTempSelected(option.id)}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 transition-colors ${
                    isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      isSelected ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{option.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-emerald-600 dark:border-emerald-400' : 'border-gray-400 dark:border-gray-500'
                    }`}
                  >
                    {isSelected && <div className="h-3 w-3 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg px-6 py-2 font-semibold text-emerald-600 transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:text-emerald-400 dark:hover:bg-gray-700"
          >
            Hủy
          </button>
          <button
            onClick={handleStep1Done}
            className="rounded-lg bg-emerald-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
