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
  Video,
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
    ],
    [isDescriptionValid, isTimeValid, isTitleValid],
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-gray-50 to-white">
      <Header />

      <div className="flex pt-14">
        <aside className="sticky top-14 flex h-[calc(100vh-56px)] w-[340px] shrink-0 flex-col border-r border-emerald-100/80 bg-white/90 shadow-[4px_0_24px_rgba(16,185,129,0.06)] backdrop-blur-sm">
          <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-4">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Lên lịch phát trực tiếp
            </div>
            <h1 className="mb-2 text-2xl font-bold leading-tight text-gray-900">Lên lịch buổi live</h1>
            <p className="mb-4 text-sm leading-relaxed text-gray-600">
              Tạo bài thông báo trước. Đến giờ bạn mới thiết lập camera và bắt đầu phát.
            </p>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Tiến độ chuẩn bị</span>
              <span className="text-emerald-700">{completedSteps}/{checklist.length}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/80 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-4 space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                    item.done ? 'bg-emerald-50/90 text-emerald-900' : 'text-gray-700'
                  }`}
                >
                  {item.done ? (
                    <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-gray-400" />
                  )}
                  <span className={item.done ? 'font-medium' : ''}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-gray-50/80 p-3 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 ring-2 ring-emerald-200/60 ring-offset-2">
              {currentUserAvatar ? (
                <img src={currentUserAvatar} alt={currentUserName} className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-6 w-6 text-emerald-700" />
              )}
            </div>
            <div className="min-w-0 leading-snug">
              <p className="truncate text-base font-bold text-gray-900">{currentUserName}</p>
              <p className="text-xs text-gray-500">Người tổ chức · Trang cá nhân</p>
            </div>
          </div>

          <div className="space-y-3 border-b border-gray-200 pb-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDestinationOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
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
                        {destinationType === option.id && <Check className="h-4 w-4 text-emerald-600" />}
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
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                          isSelected ? 'bg-emerald-50 text-emerald-800' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white'
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
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
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
                        {privacy === option.id && <Check className="h-4 w-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          </div>

          <div className="shrink-0 border-t border-emerald-100/80 bg-white/95 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/live')}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-base font-semibold text-gray-800 transition-colors hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={!canSubmit || isSubmitting}
              onClick={() => void handleCreateEvent()}
              className={`flex-1 rounded-xl py-2.5 text-base font-semibold text-white transition-all ${
                canSubmit && !isSubmitting
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-500/40'
                  : 'cursor-not-allowed bg-gray-300'
              }`}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo sự kiện'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="max-w-xl">
            <h2 className="text-xl font-bold text-gray-900">Chi tiết sự kiện</h2>
            <p className="mt-1 mb-6 text-sm text-gray-600">
              Thông tin này sẽ hiển thị trên bài thông báo trong feed.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tên sự kiện</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Livestream giới thiệu sản phẩm mới"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-500 focus:border-green-500"
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
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-500 focus:border-green-500"
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500"
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

          <aside className="xl:sticky xl:top-[4.5rem] xl:self-start">
            <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_rgba(17,17,38,0.06)]">
              <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Xem trước bài thông báo</p>
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
                    {currentUserAvatar ? (
                      <img src={currentUserAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-5 w-5 text-emerald-700" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">{currentUserName}</p>
                    <p className="text-xs text-gray-500">Đăng bài thông báo live</p>
                  </div>
                </div>

                <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-[#1a1a35] to-emerald-950">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-12 w-12 text-white/20" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-base font-bold leading-snug text-white line-clamp-2">
                      {title.trim() || 'Tên sự kiện của bạn'}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-gray-700 line-clamp-4">
                  {description.trim() || 'Mô tả buổi live sẽ hiển thị ở đây để mọi người biết nội dung trước khi tham gia.'}
                </p>

                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {scheduledAt && isTimeValid
                      ? `Bắt đầu lúc ${formatScheduledDisplay(scheduledAt)}`
                      : 'Chưa chọn thời gian bắt đầu'}
                  </span>
                </div>
              </div>
            </div>
          </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
