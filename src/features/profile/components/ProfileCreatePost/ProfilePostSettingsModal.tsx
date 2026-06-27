import { ArrowLeft, Lock, Clock, Users, Bookmark, Loader2, Shield, MapPin, AlertCircle } from 'lucide-react';
import {
  type PostPublishContext,
  type GroupPrivacyDisplay,
  getGroupPrivacySummary,
} from './postPublishContext';
import { type AudienceId, getAudienceLabel } from './postAudienceUtils';

interface ProfilePostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: () => void | Promise<void>;
  postContent: string;
  postContext: PostPublishContext;
  privacy: AudienceId;
  isPosting?: boolean;
  onOpenAudienceSelection?: () => void;
  scheduleSubtitle: string;
  onOpenScheduleSelection?: () => void;
  onOpenGroupSelection?: () => void;
  selectedGroupName?: string | null;
  groupName?: string;
  groupPrivacy?: GroupPrivacyDisplay;
  postActionLabel?: string;
  rateLimitMessage?: string | null;
  rateLimitBlocked?: boolean;
}

export function ProfilePostSettingsModal({
  isOpen,
  onClose,
  onPost,
  postContent,
  postContext,
  privacy,
  isPosting = false,
  onOpenAudienceSelection,
  scheduleSubtitle,
  onOpenScheduleSelection,
  onOpenGroupSelection,
  selectedGroupName,
  groupName,
  groupPrivacy = 'private',
  postActionLabel = 'Đăng',
  rateLimitMessage = null,
  rateLimitBlocked = false,
}: ProfilePostSettingsModalProps) {
  if (!isOpen) return null;

  const isGroupContext = postContext === 'GROUP';

  const privacyLabel = getAudienceLabel(privacy);

  const groupPrivacyCopy = getGroupPrivacySummary(groupPrivacy);
  const canCrossPostToGroup = !isGroupContext && privacy === 'public';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="sticky top-0 relative flex items-center border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isPosting}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:bg-gray-900 disabled:cursor-not-allowed dark:hover:bg-gray-700"
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
            <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
              {postContent.trim() || '—'}
            </p>
          </div>

          {isGroupContext && groupName && (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Đăng trong</p>
                <p className="truncate font-semibold text-gray-900 dark:text-white">{groupName}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {isGroupContext ? (
              <div className="flex w-full items-start gap-3 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <Shield className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Quyền riêng tư</h4>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{groupPrivacyCopy.title}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{groupPrivacyCopy.description}</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={isPosting}
                onClick={() => onOpenAudienceSelection?.()}
                className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <Lock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Đối tượng của bài viết</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{privacyLabel}</p>
                </div>
                <svg className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <button
              type="button"
              disabled={isPosting}
              onClick={() => onOpenScheduleSelection?.()}
              className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Clock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">Lựa chọn lịch đăng</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{scheduleSubtitle}</p>
              </div>
              <svg className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {!isGroupContext && (
              <button
                type="button"
                disabled={isPosting || !canCrossPostToGroup}
                onClick={() => onOpenGroupSelection?.()}
                className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    selectedGroupName ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <Users
                    className={`h-5 w-5 ${
                      selectedGroupName ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Cũng đăng lên nhóm</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {canCrossPostToGroup
                      ? selectedGroupName ?? 'Chọn nhóm (tùy chọn)'
                      : 'Chỉ bài công khai mới đăng thêm vào nhóm.'}
                  </p>
                </div>
                {canCrossPostToGroup && (
                  <svg className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            )}

            <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg p-3 opacity-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Bookmark className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-500 dark:text-gray-400">Chia sẻ lên tin</h4>
                <p className="text-sm text-gray-500 dark:text-gray-500">Sắp ra mắt</p>
              </div>
            </div>
          </div>
        </div>

        {rateLimitMessage ? (
          <div
            className={`mx-4 mb-0 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
              rateLimitBlocked
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/25 dark:text-amber-200'
                : 'bg-gray-50 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300'
            }`}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{rateLimitMessage}</span>
          </div>
        ) : null}

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isPosting}
            className="flex-1 rounded-lg bg-gray-200 px-6 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Lưu
          </button>
          <button
            type="button"
            onClick={onPost}
            disabled={isPosting || rateLimitBlocked}
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
