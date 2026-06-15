import {
  Calendar,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  FileText,
  Globe,
  Lock,
  Search,
  UserRound,
  Users2,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveDestinationItem } from '@/services/liveService';
import {
  formatScheduledDisplay,
  isScheduledAtInFuture,
  mapPrivacyToPostApi,
  normalizeScheduledAtForApi,
} from '../utils/liveFormUtils';

type DestinationType = 'profile' | 'page' | 'group';
type PrivacyChoice = 'PUBLIC' | 'FRIENDS' | 'ONLY_ME';

const destinationOptions = [
  {
    id: 'profile' as const,
    label: 'Đăng lên trang cá nhân',
    description: 'Trang cá nhân của bạn',
    icon: <UserRound className="w-4 h-4 text-gray-600" />,
  },
  {
    id: 'page' as const,
    label: 'Đăng lên trang bạn quản lý',
    description: 'Chia sẻ đến trang của bạn',
    icon: <FileText className="w-4 h-4 text-gray-600" />,
  },
  {
    id: 'group' as const,
    label: 'Đăng trong nhóm',
    description: 'Chia sẻ trong các nhóm',
    icon: <UsersRound className="w-4 h-4 text-gray-600" />,
  },
];

const privacyOptions: Array<{ id: PrivacyChoice; label: string; description: string; icon: typeof Globe }> = [
  { id: 'PUBLIC', label: 'Công khai', description: 'Mọi người đều có thể xem', icon: Globe },
  { id: 'FRIENDS', label: 'Bạn bè', description: 'Chỉ bạn bè của bạn có thể xem', icon: Users2 },
  { id: 'ONLY_ME', label: 'Chỉ mình tôi', description: 'Chỉ bạn mới có thể xem', icon: Lock },
];

const leftMenuItems = [
  { icon: Calendar, label: 'Chi tiết sự kiện', active: true },
];

export default function LiveEventPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id ?? '';
  const currentUserName = currentUser?.fullName?.trim() || currentUser?.username || 'Người dùng';
  const currentUserAvatar = currentUser?.avatarUrl || '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [destinationType, setDestinationType] = useState<DestinationType>('profile');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyChoice>('PUBLIC');
  const [pages, setPages] = useState<LiveDestinationItem[]>([]);
  const [groups, setGroups] = useState<LiveDestinationItem[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState('');

  const minScheduledAt = useMemo(
    () => new Date(Date.now() + 60_000).toISOString().slice(0, 16),
    [],
  );

  const isTitleValid = title.trim().length >= 5;
  const isDescriptionValid = description.trim().length >= 10;
  const isTimeValid = isScheduledAtInFuture(scheduledAt);
  const isDestinationValid =
    destinationType === 'profile'
    || (destinationType === 'page' && Boolean(selectedPageId))
    || (destinationType === 'group' && Boolean(selectedGroupId));

  const canSubmit = isTitleValid && isDescriptionValid && isTimeValid && isDestinationValid && Boolean(currentUserId);

  const selectedDestinationOption = destinationOptions.find((option) => option.id === destinationType);
  const selectedPrivacyOption = privacyOptions.find((option) => option.id === privacy);

  const filteredDestinationItems = useMemo(() => {
    const items = destinationType === 'page' ? pages : destinationType === 'group' ? groups : [];
    const keyword = destinationSearch.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [destinationSearch, destinationType, groups, pages]);

  const checklist = useMemo(
    () => [
      { label: 'Tên sự kiện', done: isTitleValid },
      { label: 'Mô tả nội dung', done: isDescriptionValid },
      { label: 'Thời gian bắt đầu', done: isTimeValid },
      { label: 'Chọn nơi đăng', done: isDestinationValid },
    ],
    [isDescriptionValid, isDestinationValid, isTimeValid, isTitleValid],
  );

  const completedSteps = checklist.filter((item) => item.done).length;
  const progressPercent = (completedSteps / checklist.length) * 100;

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    const loadDestinations = async () => {
      setIsLoadingDestinations(true);
      try {
        const data = await liveService.getDestinations(currentUserId);
        if (cancelled) return;
        setPages(data.pages ?? []);
        setGroups(data.groups ?? []);
        if (data.pages?.[0]) setSelectedPageId(data.pages[0].id);
        if (data.groups?.[0]) setSelectedGroupId(data.groups[0].id);
      } catch {
        if (!cancelled) {
          setPages([]);
          setGroups([]);
        }
      } finally {
        if (!cancelled) setIsLoadingDestinations(false);
      }
    };
    void loadDestinations();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const handleCreateEvent = async () => {
    if (!canSubmit || isSubmitting || !currentUserId) return;
    setError('');
    setIsSubmitting(true);
    try {
      const normalizedScheduledAt = normalizeScheduledAtForApi(scheduledAt);
      if (!normalizedScheduledAt || !isScheduledAtInFuture(scheduledAt)) {
        setError('Thời gian phát phải ở tương lai.');
        return;
      }

      const started = await liveService.startLive({
        userId: currentUserId,
        groupId: destinationType === 'group' ? selectedGroupId : undefined,
        pageId: destinationType === 'page' ? selectedPageId : undefined,
        title: title.trim(),
        description: description.trim(),
        privacy: mapPrivacyToPostApi(privacy),
        startMode: 'SCHEDULED',
        scheduledAt: normalizedScheduledAt,
      });

      toast.success('Đã tạo sự kiện phát trực tiếp. Bài thông báo đã được đăng lên feed.');
      navigate(started.postId ? `/home?post=${encodeURIComponent(started.postId)}` : '/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo sự kiện. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="flex pt-14">
        <aside className="sticky top-14 flex h-[calc(100vh-56px)] w-[340px] shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-5 border-b border-gray-200 pb-4">
            <h1 className="mb-2 text-2xl font-bold leading-tight text-gray-900">Lên lịch buổi live</h1>
            <p className="mb-3 text-sm text-gray-600">
              Tạo bài thông báo trước. Đến giờ bạn mới thiết lập camera và bắt đầu phát.
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-green-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 space-y-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm text-gray-900">
                  {item.done ? (
                    <CircleCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-500" />
                  )}
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-200">
              {currentUserAvatar ? (
                <img src={currentUserAvatar} alt={currentUserName} className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-6 w-6 text-gray-600" />
              )}
            </div>
            <div className="leading-snug">
              <p className="text-base font-bold text-gray-900">{currentUserName}</p>
              <p className="text-xs text-gray-700">Người tổ chức - Trang cá nhân của bạn</p>
            </div>
          </div>

          <div className="space-y-3 border-b border-gray-200 pb-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDestinationOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-left hover:bg-gray-50"
              >
                <p className="text-sm text-gray-500">Chọn nơi đăng</p>
                <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                  <span>{selectedDestinationOption?.label}</span>
                  <ChevronDown className={`h-6 w-6 transition-transform ${isDestinationOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isDestinationOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  {destinationOptions.map((option) => {
                    const disabled =
                      (option.id === 'page' && pages.length === 0)
                      || (option.id === 'group' && groups.length === 0);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          setDestinationType(option.id);
                          setIsDestinationOpen(false);
                          setDestinationSearch('');
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">{option.icon}</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-500">
                            {disabled ? 'Chưa có dữ liệu để chọn' : option.description}
                          </p>
                        </div>
                        {destinationType === option.id && <Check className="h-4 w-4 text-green-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {(destinationType === 'page' || destinationType === 'group') && (
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    value={destinationSearch}
                    onChange={(e) => setDestinationSearch(e.target.value)}
                    placeholder={destinationType === 'page' ? 'Tìm trang...' : 'Tìm nhóm...'}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>
                <div className="max-h-48 space-y-1 overflow-auto">
                  {isLoadingDestinations && <p className="px-2 py-1 text-sm text-gray-500">Đang tải dữ liệu...</p>}
                  {!isLoadingDestinations && filteredDestinationItems.length === 0 && (
                    <p className="px-2 py-1 text-sm text-gray-500">Không có dữ liệu phù hợp.</p>
                  )}
                  {!isLoadingDestinations && filteredDestinationItems.map((item) => {
                    const isSelected = destinationType === 'page'
                      ? selectedPageId === item.id
                      : selectedGroupId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (destinationType === 'page') setSelectedPageId(item.id);
                          else setSelectedGroupId(item.id);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                          isSelected ? 'bg-green-50 text-green-700' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            isSelected ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-left hover:bg-gray-50"
              >
                <p className="text-sm text-gray-500">Chọn quyền riêng tư</p>
                <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                  <span>{selectedPrivacyOption?.label}</span>
                  <ChevronDown className={`h-6 w-6 transition-transform ${isPrivacyOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isPrivacyOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  {privacyOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setPrivacy(option.id);
                          setIsPrivacyOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                          <Icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                        {privacy === option.id && <Check className="h-4 w-4 text-green-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {leftMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base font-semibold ${
                    item.active ? 'bg-green-50 text-gray-900' : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      item.active ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/live')}
              className="flex-1 rounded-xl bg-gray-200 py-2.5 text-base font-semibold text-gray-900"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={!canSubmit || isSubmitting}
              onClick={() => void handleCreateEvent()}
              className={`flex-1 rounded-xl py-2.5 text-base font-semibold text-white transition-colors ${
                canSubmit && !isSubmitting ? 'bg-green-600 hover:bg-green-700' : 'cursor-not-allowed bg-gray-400'
              }`}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo sự kiện'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </aside>

        <main className="flex-1 p-6">
          <section className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-1 text-2xl font-bold text-gray-900">Chi tiết sự kiện</h2>
            <p className="mb-5 text-sm text-gray-600">
              Thông tin này sẽ hiển thị trên bài thông báo trong feed.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tên sự kiện</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Livestream giới thiệu sản phẩm mới"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none ring-2 ring-transparent placeholder:text-gray-500 focus:border-green-400 focus:ring-green-100"
                />
                <div className="mt-1 flex items-center justify-between text-xs">
                  {!isTitleValid && title.length > 0 ? (
                    <span className="text-red-600">Cần ít nhất 5 ký tự</span>
                  ) : (
                    <span className="text-gray-400">Tối thiểu 5 ký tự</span>
                  )}
                  <span className="text-gray-400">{title.trim().length}/255</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Mô tả nội dung buổi phát để mọi người biết trước khi tham gia"
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none ring-2 ring-transparent placeholder:text-gray-500 focus:border-green-400 focus:ring-green-100"
                />
                <div className="mt-1 flex items-center justify-between text-xs">
                  {!isDescriptionValid && description.length > 0 ? (
                    <span className="text-red-600">Cần ít nhất 10 ký tự</span>
                  ) : (
                    <span className="text-gray-400">Giúp người xem hiểu buổi live về chủ đề gì</span>
                  )}
                  <span className="text-gray-400">{description.trim().length} ký tự</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Thời gian bắt đầu</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minScheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                />
                {scheduledAt && isTimeValid && (
                  <p className="mt-2 text-sm text-gray-700">
                    Sự kiện sẽ diễn ra lúc {formatScheduledDisplay(scheduledAt)}
                  </p>
                )}
                {scheduledAt && !isTimeValid && (
                  <p className="mt-2 text-sm text-red-600">Vui lòng chọn thời gian ở tương lai.</p>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
