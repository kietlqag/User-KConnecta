import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Users,
  Calendar,
  Plane,
  Sparkles,
  Check,
  Loader2,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/layouts';
import { useCreateAlbum } from '../hooks/useAlbums';
import { ALBUM_PRIVACY_OPTIONS } from '../utils/albumPrivacy';
import type { AlbumPrivacy, AlbumType } from '@/services/albumService';

const ALBUM_TYPES: {
  value: AlbumType;
  label: string;
  icon: typeof User;
  accent: string;
  soft: string;
}[] = [
  { value: 'PERSONAL', label: 'Cá nhân', icon: User, accent: 'text-sky-600', soft: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800' },
  { value: 'FAMILY', label: 'Gia đình', icon: Users, accent: 'text-rose-600', soft: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800' },
  { value: 'EVENT', label: 'Sự kiện', icon: Calendar, accent: 'text-amber-600', soft: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' },
  { value: 'TRAVEL', label: 'Du lịch', icon: Plane, accent: 'text-emerald-600', soft: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' },
  { value: 'OTHER', label: 'Khác', icon: Sparkles, accent: 'text-violet-600', soft: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800' },
];

const fieldClass =
  'w-full rounded-[10px] border border-border/90 bg-card px-4 py-3.5 text-[15px] text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/12 dark:placeholder:text-muted-foreground';

export function CreateAlbumPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const createAlbum = useCreateAlbum();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [albumType, setAlbumType] = useState<AlbumType>('PERSONAL');
  const [privacy, setPrivacy] = useState<AlbumPrivacy>('PUBLIC');
  const [titleError, setTitleError] = useState('');

  const selectedType = useMemo(
    () => ALBUM_TYPES.find((t) => t.value === albumType) ?? ALBUM_TYPES[0],
    [albumType],
  );
  const selectedPrivacy = useMemo(
    () => ALBUM_PRIVACY_OPTIONS.find((p) => p.value === privacy) ?? ALBUM_PRIVACY_OPTIONS[0],
    [privacy],
  );
  const PreviewIcon = selectedType.icon;
  const PrivacyIcon = selectedPrivacy.icon;

  const handleBack = () => {
    if (groupId) {
      navigate(`/groups/${groupId}?tab=albums`);
      return;
    }
    navigate('/albums');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setTitleError('Vui lòng nhập tên album.');
      return;
    }
    try {
      const album = await createAlbum.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        albumType: groupId ? 'EVENT' : albumType,
        privacy: groupId ? 'PUBLIC' : privacy,
        groupId,
      });
      toast.success('Tạo album thành công.');
      navigate(`/albums/${album.id}`);
    } catch {
      toast.error('Không thể tạo album. Vui lòng thử lại.');
    }
  };

  return (
    <MainLayout>
      <div className="relative -mt-14 bg-[#F8FAFC] pt-14 dark:bg-gray-950">
        <div className="pointer-events-none absolute -left-24 top-28 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-48 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="mb-5 inline-flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            {groupId ? 'Quay lại nhóm' : 'Quay lại album'}
          </button>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10 xl:gap-14">
            <div className="order-2 lg:order-1">
              <div className="lg:sticky lg:top-[4.5rem]">
                <p className="mb-3 text-sm font-medium text-[#2563EB]">Xem trước</p>
                <div className="overflow-hidden rounded-xl border border-white/60 bg-card/80 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm/90">
                  <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden ${selectedType.soft} border-b`}>
                    <div className="absolute inset-0 opacity-40">
                      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-card/50" />
                      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-card/40" />
                    </div>
                    <div className="relative flex flex-col items-center gap-3 px-6 text-center">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-card shadow-md ${selectedType.accent}`}>
                        <PreviewIcon className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {title.trim() || 'Album mới của bạn'}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {description.trim() || 'Ảnh và video sẽ xuất hiện tại đây'}
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-card/90 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm/90">
                      <Camera className="h-3.5 w-3.5" />
                      0 ảnh/video
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 p-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${selectedType.soft} ${selectedType.accent}`}>
                      <PreviewIcon className="h-3.5 w-3.5" />
                      {selectedType.label}
                    </span>
                    {!groupId && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <PrivacyIcon className="h-3.5 w-3.5" />
                        {selectedPrivacy.label}
                      </span>
                    )}
                    {groupId && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Users className="h-3.5 w-3.5" />
                        Album nhóm
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {groupId ? 'Tạo album nhóm' : 'Tạo album mới'}
                </h1>
                <p className="mt-2 max-w-lg text-base leading-relaxed text-muted-foreground">
                  Lưu giữ ảnh và video của bạn trong cùng một không gian.
                </p>
              </div>

              <div className="space-y-8 rounded-xl border border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-sm/90 sm:p-7">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (titleError) setTitleError('');
                    }}
                    placeholder="Ví dụ: Chuyến đi Đà Lạt 2026"
                    maxLength={255}
                    autoFocus
                    className={`${fieldClass} text-base font-medium ${titleError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`}
                  />
                  {titleError && <p className="text-sm text-red-500">{titleError}</p>}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Viết vài dòng mô tả cho album này..."
                    className={`${fieldClass} resize-none leading-relaxed`}
                  />
                </div>

                {!groupId && (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Loại album</p>
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {ALBUM_TYPES.map((type) => {
                          const Icon = type.icon;
                          const active = albumType === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => setAlbumType(type.value)}
                              className={`flex flex-col items-center justify-center gap-1 rounded-[10px] border px-1 py-2.5 transition-all duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 ${
                                active
                                  ? `${type.soft} ${type.accent} shadow-sm`
                                  : 'border-border bg-card text-foreground hover:border-border hover:bg-muted'
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="text-[11px] font-medium leading-tight sm:text-sm">{type.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Quyền riêng tư</p>
                      <div className="space-y-2">
                        {ALBUM_PRIVACY_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const active = privacy === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setPrivacy(option.value)}
                              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${ active ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40' : 'border-border bg-card hover:bg-muted' }`}
                            >
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ active ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground' }`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{option.label}</p>
                                <p className="text-xs text-muted-foreground">{option.hint}</p>
                              </div>
                              {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {groupId && (
                  <p className="rounded-[10px] border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm leading-relaxed text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    Album này thuộc nhóm — thành viên đã duyệt có thể xem và đóng góp ảnh.
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={createAlbum.isPending}
                    className="rounded-[10px] px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={createAlbum.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-all hover:bg-[#1D4ED8] hover:shadow-[0_6px_18px_rgba(37,99,235,0.4)] disabled:opacity-60"
                  >
                    {createAlbum.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {createAlbum.isPending ? 'Đang tạo...' : 'Tạo album'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
