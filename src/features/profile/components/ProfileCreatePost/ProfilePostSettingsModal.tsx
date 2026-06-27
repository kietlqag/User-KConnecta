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
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg bg-card shadow-xl">
        <div className="sticky top-0 relative flex items-center border-b border-border bg-card p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPosting}
            className="rounded-full p-2 transition-colors hover:bg-background disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-foreground">
            Cài đặt bài viết
          </h2>
        </div>

        <div className="space-y-4 p-4">
          <div className="border-b border-border pb-4">
            <h3 className="mb-2 font-semibold text-foreground">Xem trước bài viết</h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {postContent.trim() || '—'}
            </p>
          </div>

          {isGroupContext && groupName && (
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Đăng trong</p>
                <p className="truncate font-semibold text-foreground">{groupName}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {isGroupContext ? (
              <div className="flex w-full items-start gap-3 rounded-lg p-3 bg-muted/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Shield className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">Quyền riêng tư</h4>
                  <p className="text-sm font-medium text-foreground">{groupPrivacyCopy.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{groupPrivacyCopy.description}</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={isPosting}
                onClick={() => onOpenAudienceSelection?.()}
                className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">Đối tượng của bài viết</h4>
                  <p className="text-sm text-muted-foreground">{privacyLabel}</p>
                </div>
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <button
              type="button"
              disabled={isPosting}
              onClick={() => onOpenScheduleSelection?.()}
              className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Clock className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-foreground">Lựa chọn lịch đăng</h4>
                <p className="text-sm text-muted-foreground">{scheduleSubtitle}</p>
              </div>
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {!isGroupContext && (
              <button
                type="button"
                disabled={isPosting || !canCrossPostToGroup}
                onClick={() => onOpenGroupSelection?.()}
                className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${ selectedGroupName ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted' }`}
                >
                  <Users
                    className={`h-5 w-5 ${ selectedGroupName ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground' }`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">Cũng đăng lên nhóm</h4>
                  <p className="text-sm text-muted-foreground">
                    {canCrossPostToGroup
                      ? selectedGroupName ?? 'Chọn nhóm (tùy chọn)'
                      : 'Chỉ bài công khai mới đăng thêm vào nhóm.'}
                  </p>
                </div>
                {canCrossPostToGroup && (
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            )}

            <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg p-3 opacity-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Bookmark className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-muted-foreground">Chia sẻ lên tin</h4>
                <p className="text-sm text-muted-foreground">Sắp ra mắt</p>
              </div>
            </div>
          </div>
        </div>

        {rateLimitMessage ? (
          <div
            className={`mx-4 mb-0 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${ rateLimitBlocked ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/25 dark:text-amber-200' : 'bg-muted text-muted-foreground/50' }`}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{rateLimitMessage}</span>
          </div>
        ) : null}

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPosting}
            className="flex-1 rounded-lg bg-muted px-6 py-2.5 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed"
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
