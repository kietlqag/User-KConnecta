import { useState } from 'react';
import { ArrowLeft, Lock, Clock, Users, DollarSign, Bookmark, Megaphone, Loader2 } from 'lucide-react';

interface ProfilePostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: () => void | Promise<void>;
  postContent: string;
  privacy: string;
  isPosting?: boolean;
}

export function ProfilePostSettingsModal({
  isOpen,
  onClose,
  onPost,
  postContent,
  privacy,
  isPosting = false,
}: ProfilePostSettingsModalProps) {
  const [promotePost, setPromotePost] = useState(false);

  if (!isOpen) return null;

  const getPrivacyLabel = () => {
    switch (privacy) {
      case 'public':
        return 'Công khai';
      case 'friends':
        return 'Bạn bè';
      case 'friends-except':
        return 'Bạn bè ngoại trừ...';
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
            <button className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
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

            <button className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Clock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Lựa chọn lịch đăng</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Đăng ngay</p>
              </div>
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg p-3 opacity-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-500 dark:text-gray-400">Chia sẻ lên nhóm</h4>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Đặt bài viết ở chế độ công khai để chia sẻ
                </p>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <button className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <DollarSign className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Kiếm tiền</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Kiếm tiền từ nội dung của bạn</p>
              </div>
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

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

            <div className="flex w-full items-center gap-3 rounded-lg p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Megaphone className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Quảng bá bài viết</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Bạn sẽ chọn phần cài đặt sau khi nhấp vào nút Đăng. Bạn chỉ có thể quảng cáo bài viết công khai.
                </p>
              </div>
              <label className="relative inline-block h-6 w-12 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promotePost}
                  onChange={(e) => setPromotePost(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-12 rounded-full bg-gray-300 transition-colors peer-checked:bg-emerald-500 dark:bg-gray-600">
                  <div
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      promotePost ? 'translate-x-6' : ''
                    }`}
                  />
                </div>
              </label>
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
              'Đăng'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
