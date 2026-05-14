import { ArrowLeft, Lock, Clock, Users, Bookmark, Loader2 } from 'lucide-react';

interface ProfilePostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: () => void | Promise<void>;
  postContent: string;
  privacy: string;
  excludedCount?: number;
  isPosting?: boolean;
  onOpenAudienceSelection?: () => void;
  scheduleSubtitle: string;
  onOpenScheduleSelection?: () => void;
  onOpenGroupSelection?: () => void;
  selectedGroupName?: string | null;
  postActionLabel?: string;
}

export function ProfilePostSettingsModal({
  isOpen,
  onClose,
  onPost,
  postContent,
  privacy,
  excludedCount = 0,
  isPosting = false,
  onOpenAudienceSelection,
  scheduleSubtitle,
  onOpenScheduleSelection,
  onOpenGroupSelection,
  selectedGroupName,
  postActionLabel = 'Đăng',
}: ProfilePostSettingsModalProps) {
  if (!isOpen) return null;

  const getPrivacyLabel = () => {
    switch (privacy) {
      case 'public':
        return 'Công khai';
      case 'friends':
        return 'Chọn bạn bè để xem';
      case 'friends-except':
        return excludedCount > 0 ? `Bạn bè ngoại trừ (${excludedCount} người)` : 'Bạn bè ngoại trừ...';
      default:
        return 'Chỉ mình tôi';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="sticky top-0 relative flex items-center border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            disabled={isPosting}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white">
            Cài đặt bài viết
          </h2>
        </div>

        <div className="space-y-4 p-4">
          <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Xem trước bài viết</h3>
            <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{postContent}</p>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              disabled={isPosting}
              onClick={() => onOpenAudienceSelection?.()}
              className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Lock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Đối tượng của bài viết</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{getPrivacyLabel()}</p>
              </div>
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              disabled={isPosting}
              onClick={() => onOpenScheduleSelection?.()}
              className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Clock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Lựa chọn lịch đăng</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{scheduleSubtitle}</p>
              </div>
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {(() => {
              const canShareToGroup = privacy === 'public';
              return (
                <button
                  type="button"
                  disabled={isPosting || !canShareToGroup}
                  onClick={() => onOpenGroupSelection?.()}
                  className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedGroupName ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Users className={`h-5 w-5 ${selectedGroupName ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Chia sẻ lên nhóm</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {canShareToGroup
                        ? (selectedGroupName ?? 'Chọn nhóm để đăng bài')
                        : 'Chỉ dùng được khi bài viết ở chế độ Công khai'}
                    </p>
                  </div>
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })()}

            <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg p-3 opacity-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Bookmark className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-500 dark:text-gray-400">Chia sẻ lên tin</h4>
                <p className="text-sm text-gray-500 dark:text-gray-500">Tắt</p>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            disabled={isPosting}
            className="flex-1 rounded-lg bg-gray-200 px-6 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Lưu
          </button>
          <button
            onClick={onPost}
            disabled={isPosting}
            className="flex-1 rounded-lg bg-emerald-500 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isPosting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang đăng...
              </span>
            ) : (
              postActionLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
