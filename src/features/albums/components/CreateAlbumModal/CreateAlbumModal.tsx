import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Images,
  User,
  Users,
  Calendar,
  Plane,
  Sparkles,
  Globe,
  UserCheck,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateAlbum } from '../../hooks/useAlbums';
import type { AlbumPrivacy, AlbumType } from '@/services/albumService';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string;
}

const ALBUM_TYPES: { value: AlbumType; label: string; icon: typeof User; accent: string }[] = [
  { value: 'PERSONAL', label: 'Cá nhân', icon: User, accent: 'bg-sky-500' },
  { value: 'FAMILY', label: 'Gia đình', icon: Users, accent: 'bg-rose-500' },
  { value: 'EVENT', label: 'Sự kiện', icon: Calendar, accent: 'bg-amber-500' },
  { value: 'TRAVEL', label: 'Du lịch', icon: Plane, accent: 'bg-emerald-500' },
  { value: 'OTHER', label: 'Khác', icon: Sparkles, accent: 'bg-violet-500' },
];

const PRIVACY_OPTIONS: { value: AlbumPrivacy; label: string; hint: string; icon: typeof Globe }[] = [
  { value: 'PUBLIC', label: 'Công khai', hint: 'Mọi người có thể xem', icon: Globe },
  { value: 'FRIENDS', label: 'Bạn bè', hint: 'Chỉ bạn bè được xem', icon: UserCheck },
  { value: 'ONLY_ME', label: 'Riêng tư', hint: 'Chỉ mình bạn', icon: Lock },
];

const flatInput =
  'w-full px-4 py-3 border-2 border-gray-900/10 dark:border-white/10 bg-white dark:bg-gray-950 text-[15px] text-gray-900 dark:text-gray-100 outline-none transition-colors focus:border-blue-600 dark:focus:border-blue-500';

export function CreateAlbumModal({ isOpen, onClose, groupId }: CreateAlbumModalProps) {
  const navigate = useNavigate();
  const createAlbum = useCreateAlbum();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [albumType, setAlbumType] = useState<AlbumType>('PERSONAL');
  const [privacy, setPrivacy] = useState<AlbumPrivacy>('PUBLIC');
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setAlbumType('PERSONAL');
      setPrivacy('PUBLIC');
      setTitleError('');
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isOpen]);

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
      onClose();
      navigate(`/albums/${album.id}`);
    } catch {
      toast.error('Không thể tạo album. Vui lòng thử lại.');
    }
  };

  if (!isOpen) return null;

  const selectedType = ALBUM_TYPES.find((t) => t.value === albumType) ?? ALBUM_TYPES[0];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between h-14 px-4 sm:px-6 border-b-2 border-gray-900/10 dark:border-white/10 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 border-2 border-gray-900/10 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-blue-600 dark:text-blue-400">
              Album ảnh
            </p>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate leading-tight">
              {groupId ? 'Tạo album nhóm' : 'Tạo album mới'}
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 border-2 border-gray-900/10 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left accent panel */}
        <aside className="relative shrink-0 lg:w-[38%] xl:w-[42%] overflow-hidden border-b-2 lg:border-b-0 lg:border-r-2 border-gray-900/10 dark:border-white/10">
          <div className={`absolute inset-0 ${selectedType.accent} opacity-90`} />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent, transparent 18px, rgba(255,255,255,.12) 18px, rgba(255,255,255,.12) 36px)',
            }}
          />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/10 translate-y-1/3 -translate-x-1/4" />

          <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-10 text-white min-h-[200px] lg:min-h-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/20 border border-white/20 text-xs font-bold uppercase tracking-wider mb-6">
                <Images className="w-4 h-4" />
                Kỷ niệm ảnh & video
              </div>
              <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black leading-[1.05] tracking-tight max-w-md">
                Gom khoảnh khắc<br />vào một nơi.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/85 max-w-sm leading-relaxed">
                {groupId
                  ? 'Album nhóm giúp cả nhóm lưu lại ảnh sự kiện, chuyến đi và kỷ niệm chung.'
                  : 'Đặt tên album, chọn loại và quyền riêng tư — sau đó thêm ảnh, video bất cứ lúc nào.'}
              </p>
            </div>

            <div className="hidden sm:flex items-end gap-3 mt-8">
              {ALBUM_TYPES.map((t) => (
                <div
                  key={t.value}
                  className={`w-12 h-12 flex items-center justify-center border-2 border-white/30 transition-transform ${
                    albumType === t.value ? 'bg-white text-gray-900 scale-110' : 'bg-white/10 text-white'
                  }`}
                >
                  <t.icon className="w-5 h-5" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8">
            <section>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 mb-2">
                Tên album <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError('');
                }}
                placeholder="Ví dụ: Du lịch Đà Lạt 2025"
                maxLength={255}
                autoFocus
                className={`${flatInput} text-lg font-semibold ${titleError ? 'border-red-500' : ''}`}
              />
              {titleError && <p className="text-sm text-red-500 mt-2 font-medium">{titleError}</p>}
            </section>

            <section>
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 mb-2">
                Mô tả <span className="normal-case tracking-normal font-normal">(tuỳ chọn)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Ghi chú về album — chuyến đi, sự kiện, người tham gia..."
                className={`${flatInput} resize-none`}
              />
            </section>

            {!groupId && (
              <>
                <section>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 mb-3">
                    Loại album
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALBUM_TYPES.map((t) => {
                      const Icon = t.icon;
                      const active = albumType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setAlbumType(t.value)}
                          className={`flex items-center gap-2.5 px-3 py-3 border-2 text-left transition-colors ${
                            active
                              ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                              : 'border-gray-900/10 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:border-gray-900/30'
                          }`}
                        >
                          <span className={`w-8 h-8 flex items-center justify-center shrink-0 ${active ? t.accent : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                          </span>
                          <span className="text-sm font-bold">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 mb-3">
                    Quyền riêng tư
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PRIVACY_OPTIONS.map((p) => {
                      const Icon = p.icon;
                      const active = privacy === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPrivacy(p.value)}
                          className={`flex flex-col items-start gap-1 p-4 border-2 text-left transition-colors ${
                            active
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                              : 'border-gray-900/10 dark:border-white/10 bg-white dark:bg-gray-900 hover:border-blue-600/40'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                          <span className={`text-sm font-bold ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                            {p.label}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{p.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {groupId && (
              <div className="px-4 py-3 border-2 border-dashed border-gray-900/15 dark:border-white/15 bg-white dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
                Album này thuộc nhóm — thành viên đã duyệt có thể xem và đóng góp ảnh.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer actions */}
      <footer className="shrink-0 flex items-center justify-end gap-0 border-t-2 border-gray-900/10 dark:border-white/10 bg-white dark:bg-gray-900">
        <button
          type="button"
          onClick={onClose}
          className="h-14 px-8 text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 border-r-2 border-gray-900/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={createAlbum.isPending}
          className="h-14 px-10 sm:px-14 text-sm font-black uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {createAlbum.isPending ? 'Đang tạo...' : 'Tạo album'}
        </button>
      </footer>
    </div>,
    document.body,
  );
}
