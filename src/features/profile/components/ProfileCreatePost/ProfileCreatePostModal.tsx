import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  X,
  Globe,
  Image,
  Users,
  Smile,
  Loader2,
  AlertCircle,
  Lock,
  Shield,
  BarChart3,
  FileText,
} from 'lucide-react';
import { useGroupById } from '@/features/groups/hooks/useGroups';
import { getGroupPrivacyShortLabel } from './postPublishContext';
import {
  type AudienceId,
  audienceToApiPrivacy,
  getAudienceLabel,
} from './postAudienceUtils';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type CreatePostMediaRequest, type PostResponse } from '@/services/postService';
import { compressImage } from '@/utils/imageUtils';
import { CurrentUserAvatar } from '@/components/shared';
import { ProfilePostAudienceModal } from './ProfilePostAudienceModal';
import { ProfilePostGroupModal } from './ProfilePostGroupModal';
import {
  ProfilePostScheduleModal,
  defaultScheduledDatetimeLocal,
  type PostScheduleMode,
} from './ProfilePostScheduleModal';
import { ProfilePostSettingsModal } from './ProfilePostSettingsModal';
import { usePublicPolicies } from '@/hooks/usePublicPolicies';
import { useRefreshPoliciesOnOpen } from '@/hooks/useRefreshPoliciesOnOpen';
import { usePostRateLimit } from '@/hooks/usePostRateLimit';
import { formatPostRateLimitMessage, isPostRateLimitReached } from '@/utils/postRateLimit';
import { validatePostAgainstPolicy, checkKeywords, checkWatchlistKeywords, validatePostMediaFiles } from '@/utils/policyValidation';
import { buildPostMediaAcceptAttribute, getPostMediaKind, toApiMediaType, type PostMediaKind } from '@/utils/allowedFileTypes';

import { toApiScheduledAt, debugScheduleLog } from './postScheduleUtils';
import { GroupPollComposer } from '@/features/groups/components/GroupPollComposer/GroupPollComposer';
import { HashtagSuggestions } from '@/components/posts/HashtagSuggestions';
import { computeEmojiPickerPosition, type EmojiPickerPosition } from '@/utils/emojiPickerPosition';
import { PostAllowedFormatsHint } from './PostAllowedFormatsHint';
import { SaveMomentsToAlbumModal } from './SaveMomentsToAlbumModal';

interface ProfileCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onPostCreated?: (post: PostResponse) => void;
  groupId?: string;
  initialShowImagePicker?: boolean;
  initialShowPoll?: boolean;
}

export function ProfileCreatePostModal({
  isOpen,
  onClose,
  username,
  onPostCreated,
  groupId,
  initialShowImagePicker = false,
  initialShowPoll = false,
}: ProfileCreatePostModalProps) {
  const [postContent, setPostContent] = useState('');
  const [privacy, setPrivacy] = useState<AudienceId>('public');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [reopenSettingsAfterGroup, setReopenSettingsAfterGroup] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [reopenSettingsAfterAudience, setReopenSettingsAfterAudience] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [reopenSettingsAfterSchedule, setReopenSettingsAfterSchedule] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<PostScheduleMode>('now');
  const [scheduledAtLocal, setScheduledAtLocal] = useState(defaultScheduledDatetimeLocal);
  const [isPosting, setIsPosting] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(initialShowImagePicker);
  const [selectedImages, setSelectedImages] = useState<{
    id: string;
    file: File;
    previewUrl: string;
    type: PostMediaKind;
    uploadedUrl?: string;
    uploading: boolean;
    uploadFailed?: boolean;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [postForAlbum, setPostForAlbum] = useState<PostResponse | null>(null);
  const [isCheckingContent, setIsCheckingContent] = useState(false);
  const { data: publicPolicy, isLoading: policyLoading } = usePublicPolicies();
  useRefreshPoliciesOnOpen(isOpen);
  const queryClient = useQueryClient();
  const { data: rateLimit } = usePostRateLimit(isOpen);
  const rateLimitMessage = useMemo(
    () => (rateLimit ? formatPostRateLimitMessage(rateLimit) : null),
    [rateLimit],
  );
  const rateLimitBlocked = isPostRateLimitReached(rateLimit);
  const uploadPromisesRef = useRef<Map<string, Promise<string>>>(new Map());
  const uploadControllersRef = useRef<Map<string, AbortController>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos] = useState<EmojiPickerPosition>({ top: 0, right: 0, maxHeight: 435 });
  const [showPoll, setShowPoll] = useState(initialShowPoll);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowAddOptions, setPollAllowAddOptions] = useState(true);
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiViolationError, setAiViolationError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = postContent.trim();
    if (!trimmed || trimmed.length < 5) {
      setAiViolationError(null);
      setIsAiChecking(false);
      return;
    }

    if (checkKeywords(postContent, publicPolicy)) {
      setAiViolationError(null);
      setIsAiChecking(false);
      return;
    }

    setIsAiChecking(true);
    const handler = setTimeout(async () => {
      try {
        const response = await postService.verifyContent(trimmed);
        if (response.level === 'AI_UNSAFE') {
          setAiViolationError(response.reason ?? 'Nội dung vi phạm tiêu chuẩn cộng đồng');
        } else {
          setAiViolationError(null);
        }
      } catch (err) {
        console.error('Failed to verify content with AI:', err);
      } finally {
        setIsAiChecking(false);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [postContent, publicPolicy]);

  const { data: targetGroup } = useGroupById(groupId);
  const postContext = groupId ? 'GROUP' : 'PROFILE';
  const isGroupPost = postContext === 'GROUP';

  // Sync state when initialShowImagePicker changes
  useEffect(() => {
    setShowImagePicker(initialShowImagePicker);
  }, [initialShowImagePicker]);

  useEffect(() => {
    setShowPoll(initialShowPoll);
    if (initialShowPoll) {
      setPollOptions(['', '']);
    }
  }, [initialShowPoll]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insidePicker = emojiPickerRef.current?.contains(target);
      const insideButton = emojiButtonRef.current?.contains(target);
      if (!insidePicker && !insideButton) setShowEmojiPicker(false);
    };
    const handleReposition = () => {
      if (emojiButtonRef.current) {
        setEmojiPickerPos(
          computeEmojiPickerPosition(emojiButtonRef.current.getBoundingClientRect()),
        );
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleReposition);
    };
  }, [showEmojiPicker]);

  const handleEmojiSelect = useCallback((emoji: { native?: string }) => {
    const selected = emoji.native;
    if (!selected) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      setPostContent(prev => prev + selected);
      return;
    }
    const start = textarea.selectionStart ?? postContent.length;
    const end = textarea.selectionEnd ?? postContent.length;
    const next = postContent.slice(0, start) + selected + postContent.slice(end);
    setPostContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + selected.length;
      textarea.setSelectionRange(pos, pos);
    });
  }, [postContent]);

  if (!isOpen) return null;

  const handleNext = async () => {
    const trimmedText = postContent.trim();
    if (!trimmedText && selectedImages.length === 0) return;

    const policyError = validatePostAgainstPolicy(
      trimmedText,
      selectedImages.length,
      publicPolicy
    );
    if (policyError) {
      toast.error(policyError);
      return;
    }

    if (trimmedText.length >= 5 && !checkKeywords(postContent, publicPolicy)) {
      setIsCheckingContent(true);
      try {
        const verifyRes = await postService.verifyContent(trimmedText);
        if (verifyRes.level === 'AI_UNSAFE' || verifyRes.level === 'BLACKLIST') {
          toast.error(verifyRes.reason ?? 'Nội dung vi phạm tiêu chuẩn cộng đồng');
          return;
        }
      } catch (err) {
        console.error('Failed to verify content with AI:', err);
      } finally {
        setIsCheckingContent(false);
      }
    }

    setShowSettingsModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (policyLoading || !publicPolicy) {
      toast.error('Đang tải quy định đăng bài. Vui lòng thử lại sau.');
      if (e.target) e.target.value = '';
      return;
    }

    const mediaError = validatePostMediaFiles(files, publicPolicy);
    if (mediaError) {
      toast.error(mediaError);
      if (e.target) e.target.value = '';
      return;
    }

    const newImages = files.map(file => {
      const kind = getPostMediaKind(file);
      return {
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: kind === 'document' ? '' : URL.createObjectURL(file),
        type: kind,
        uploading: true,
      };
    });

    setSelectedImages(prev => [...prev, ...newImages]);
    if (e.target) e.target.value = '';

    newImages.forEach(img => {
      const controller = new AbortController();
      uploadControllersRef.current.set(img.id, controller);

      const uploadFile = img.type === 'video' || img.type === 'document'
        ? Promise.resolve(img.file)
        : compressImage(img.file);

      const promise = uploadFile
        .then(compressed => postService.uploadPostImage(compressed, controller.signal))
        .then(res => {
          uploadControllersRef.current.delete(img.id);
          setSelectedImages(prev =>
            prev.map(i => i.id === img.id ? { ...i, uploadedUrl: res.url, uploading: false } : i),
          );
          return res.url;
        })
        .catch(err => {
          uploadControllersRef.current.delete(img.id);
          if (err instanceof Error && err.name === 'AbortError') return '';
          const message =
            err instanceof Error && err.message
              ? err.message
              : 'Không thể tải file lên. Vui lòng thử lại.';
          toast.error(message);
          setSelectedImages(prev =>
            prev.map(i => i.id === img.id ? { ...i, uploading: false, uploadFailed: true } : i),
          );
          return '';
        });
      uploadPromisesRef.current.set(img.id, promise);
    });
  };

  const removeImage = (id: string) => {
    // Abort in-flight upload
    uploadControllersRef.current.get(id)?.abort();
    uploadControllersRef.current.delete(id);
    uploadPromisesRef.current.delete(id);

    setSelectedImages(prev => {
      const removed = prev.find(img => img.id === id);
      if (removed) {
        if (removed.previewUrl) {
          URL.revokeObjectURL(removed.previewUrl);
        }
        // Delete from Cloudinary if already uploaded (fire-and-forget)
        if (removed.uploadedUrl) {
          postService.deletePostMedia(removed.uploadedUrl).catch(() => {});
        }
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const handleCancel = () => {
    // Abort all in-flight uploads
    uploadControllersRef.current.forEach(controller => controller.abort());
    uploadControllersRef.current.clear();
    uploadPromisesRef.current.clear();

    // Delete already-uploaded files from Cloudinary (fire-and-forget)
    selectedImages.forEach(img => {
      if (img.uploadedUrl) {
        postService.deletePostMedia(img.uploadedUrl).catch(() => {});
      }
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });

    setSelectedImages([]);
    setShowImagePicker(false);
    setShowPoll(false);
    setPollOptions(['', '']);
    onClose();
  };

  const mapPrivacyToApi = () => audienceToApiPrivacy(privacy);

  const scheduleSubtitle =
    scheduleMode === 'scheduled' && scheduledAtLocal
      ? `Đặt lịch: ${new Date(scheduledAtLocal).toLocaleString('vi-VN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : 'Đăng ngay';

  const resetFormState = () => {
    setPostContent('');
    setSelectedImages([]);
    uploadPromisesRef.current.clear();
    setShowImagePicker(false);
    setShowSettingsModal(false);
    setScheduleMode('now');
    setScheduledAtLocal(defaultScheduledDatetimeLocal());
    setSelectedGroupId(null);
    setSelectedGroupName(null);
    setShowPoll(false);
    setPollOptions(['', '']);
    setPollAllowAddOptions(true);
  };

  const handlePost = async () => {
    const trimmedPollOptions = pollOptions.map((item) => item.trim()).filter(Boolean);
    if (showPoll) {
      if (!postContent.trim()) {
        toast.error('Bạn không thể tạo cuộc thăm dò ý kiến không chứa văn bản trong bài viết.');
        return;
      }
      if (trimmedPollOptions.length < 2) {
        toast.error('Cuộc thăm dò ý kiến cần ít nhất 2 lựa chọn');
        return;
      }
    }

    if (!postContent.trim() && selectedImages.length === 0 && !showPoll) return;

    if (scheduleMode === 'scheduled') {
      if (!scheduledAtLocal.trim()) {
        toast.error('Vui lòng chọn thời gian đăng bài');
        return;
      }
      const scheduledDate = new Date(scheduledAtLocal);
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        toast.error('Vui lòng chọn thời gian đăng trong tương lai');
        return;
      }
    }

    // Block post if any upload failed
    const failedImages = selectedImages.filter(img => img.uploadFailed);
    if (failedImages.length > 0) {
      toast.error('Một số ảnh tải lên thất bại. Vui lòng xóa và chọn lại.');
      return;
    }

    const policyError = validatePostAgainstPolicy(
      postContent.trim(),
      selectedImages.length,
      publicPolicy
    );
    if (policyError) {
      toast.error(policyError);
      return;
    }

    if (rateLimitBlocked) {
      toast.error(rateLimitMessage ?? 'Bạn đã đăng quá nhiều bài trong phút qua.');
      void queryClient.invalidateQueries({ queryKey: ['posts', 'rate-limit'] });
      return;
    }

    setIsPosting(true);
    try {
      // Check AI content verification synchronously on submit
      const trimmedText = postContent.trim();
      if (trimmedText.length >= 5 && !checkKeywords(postContent, publicPolicy)) {
        const verifyRes = await postService.verifyContent(trimmedText);
        if (verifyRes.level === 'AI_UNSAFE' || verifyRes.level === 'BLACKLIST') {
          toast.error(verifyRes.reason ?? 'Nội dung vi phạm tiêu chuẩn cộng đồng');
          setIsPosting(false);
          return;
        }
      }

      // 1. Collect media — use cached URLs, wait only for still-uploading ones
      const uploadedMedia: CreatePostMediaRequest[] = [];
      if (selectedImages.length > 0) {
        const mediaResults = await Promise.all(
          selectedImages.map(async (img, index) => {
            let url = img.uploadedUrl;
            if (!url) {
              // Still uploading — wait for the in-progress promise
              const pending = uploadPromisesRef.current.get(img.id);
              url = pending ? await pending : (await postService.uploadPostImage(img.file)).url;
            }
            return {
              mediaType: toApiMediaType(img.type),
              fileUrl: url,
              sortOrder: index,
            };
          }),
        );
        uploadedMedia.push(...mediaResults);
      }

      // 2. Create post
      const user = authService.getCurrentUser();
      const isScheduled = scheduleMode === 'scheduled';
      const scheduledAtApi = isScheduled ? toApiScheduledAt(scheduledAtLocal) : undefined;

      debugScheduleLog('create post', {
        scheduleMode,
        scheduledAtLocal,
        scheduledAtApi,
        status: isScheduled ? 'SCHEDULED' : 'PUBLISHED',
        groupId: groupId ?? selectedGroupId ?? null,
      });

      const effectiveGroupId = groupId ?? selectedGroupId ?? undefined;
      const apiPrivacy = isGroupPost ? ('PUBLIC' as const) : mapPrivacyToApi();
      const createdPost = await postService.createPost({
        authorId: user?.id || '',
        ...(effectiveGroupId && { groupId: effectiveGroupId }),
        content: postContent.trim(),
        imageUrl: uploadedMedia.length > 0 ? uploadedMedia[0].fileUrl : undefined,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
        privacy: apiPrivacy,
        status: isScheduled ? 'SCHEDULED' : 'PUBLISHED',
        ...(isScheduled && scheduledAtApi ? { scheduledAt: scheduledAtApi } : {}),
        ...(showPoll && isGroupPost && {
          poll: {
            options: trimmedPollOptions,
            allowAddOptions: pollAllowAddOptions,
          },
        }),
        postType: 'POST',
      });

      toast.success(isScheduled ? 'Đã lên lịch đăng bài' : 'Đăng bài thành công');
      void queryClient.invalidateQueries({ queryKey: ['posts', 'rate-limit'] });

      const hasMedia = (createdPost.media && createdPost.media.length > 0) || createdPost.imageUrl;
      if (hasMedia && !isScheduled) {
        setPostForAlbum(createdPost);
      } else {
        onPostCreated?.(createdPost);
        onClose();
        resetFormState();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đăng bài';
      toast.error(message);
      if (/quá nhanh|phút/i.test(message)) {
        void queryClient.invalidateQueries({ queryKey: ['posts', 'rate-limit'] });
      }
    } finally {
      setIsPosting(false);
    }
  };

  const getPrivacyInfo = () => {
    const label = getAudienceLabel(privacy);
    switch (privacy) {
      case 'friends':
        return { icon: Users, label };
      case 'private':
        return { icon: Lock, label };
      default:
        return { icon: Globe, label };
    }
  };

  const privacyInfo = getPrivacyInfo();
  const PrivacyIcon = privacyInfo.icon;

  if (postForAlbum) {
    return (
      <SaveMomentsToAlbumModal
        post={postForAlbum}
        onClose={() => {
          onPostCreated?.(postForAlbum);
          onClose();
          setPostForAlbum(null);
          resetFormState();
        }}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-lg bg-card shadow-xl">
          <div className="relative flex shrink-0 items-center justify-center border-b border-border bg-card p-4">
            <h2 className="text-xl font-bold text-foreground">Tạo bài viết</h2>
            <button
              onClick={handleCancel}
              className="absolute right-4 rounded-full p-2 transition-colors hover:bg-muted"
            >
              <X className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4">
            <div className="mb-4 flex items-center gap-3">
              <CurrentUserAvatar />
              <div>
                <h3 className="font-semibold text-foreground">{username}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {isGroupPost && targetGroup ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {targetGroup.privacy === 'private' ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                      <span className="max-w-[200px] truncate">{targetGroup.name}</span>
                      <span className="text-emerald-600/80 dark:text-emerald-400/80">·</span>
                      <span>{getGroupPrivacyShortLabel(targetGroup.privacy)}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReopenSettingsAfterAudience(false);
                        setShowAudienceModal(true);
                      }}
                      className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <PrivacyIcon className="h-3 w-3" />
                      <span>{privacyInfo.label}</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={isGroupPost ? 'Bạn viết gì đi... (#hashtag giúp bài được đề xuất đúng chủ đề)' : 'Bạn đang nghĩ gì? Thêm #chủđề nếu muốn'}
              className="min-h-[120px] w-full resize-none border-none bg-transparent text-2xl text-foreground outline-none placeholder:text-muted-foreground dark:text-white dark:placeholder:text-muted-foreground"
              autoFocus
            />
            <HashtagSuggestions
              content={postContent}
              textareaRef={textareaRef}
              onContentChange={setPostContent}
            />
            {publicPolicy && (() => {
              const max = publicPolicy.postPolicy.maxPostLength;
              const len = postContent.length;
              const ratio = len / max;
              return (
                <div className={`text-right text-xs ${ ratio >= 1 ? 'text-red-500 font-medium' : ratio >= 0.9 ? 'text-orange-500' : 'text-muted-foreground' }`}>
                  {len} / {max}
                </div>
              );
            })()}
            {(() => {
              const err = checkKeywords(postContent, publicPolicy);
              return err ? (
                <div className="flex items-center gap-1.5 mt-1 rounded-md bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {err}
                </div>
              ) : null;
            })()}


            {showPoll && isGroupPost && (
              <GroupPollComposer
                options={pollOptions}
                onOptionsChange={setPollOptions}
                onRemove={() => {
                  setShowPoll(false);
                  setPollOptions(['', '']);
                }}
                allowAddOptions={pollAllowAddOptions}
                onAllowAddOptionsChange={setPollAllowAddOptions}
              />
            )}

            {showImagePicker && (
              <div className="relative mb-4 rounded-lg bg-muted border border-border p-2 group">
                <div className="absolute right-2 top-2 z-10 flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm dark:shadow-none hover:bg-muted dark:text-white dark:hover:bg-muted0"
                  >
                    <Image className="h-4 w-4 text-muted-foreground" />
                    Thêm ảnh/video
                  </button>
                  <button
                    onClick={() => setShowImagePicker(false)}
                    className="rounded-full bg-card p-1.5 text-muted-foreground shadow-sm dark:shadow-none hover:bg-muted border border-border dark:text-white dark:hover:bg-muted0 dark:border-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {selectedImages.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-transparent hover:bg-background transition-colors"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Image className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-[17px] font-bold text-foreground">Thêm ảnh/video/tài liệu</p>
                    <p className="text-[13px] text-muted-foreground">hoặc kéo và thả</p>
                    {publicPolicy && (
                      <PostAllowedFormatsHint
                        allowedFileTypes={publicPolicy.postPolicy.allowedFileTypes}
                        className="mt-2 px-4 text-center"
                      />
                    )}
                  </div>
                ) : (
                  <div className="mt-12 max-h-[min(340px,45vh)] overflow-y-auto overscroll-contain pr-0.5">
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {selectedImages.map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-square min-h-0 w-full overflow-hidden rounded-lg border border-border bg-black dark:border-gray-500"
                      >
                        {img.type === 'video' ? (
                          <video
                            src={img.previewUrl}
                            className="absolute inset-0 m-auto h-full max-h-full w-full max-w-full object-contain"
                            controls
                            playsInline
                          />
                        ) : img.type === 'document' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted p-3">
                            <FileText className="h-10 w-10 text-slate-600 dark:text-slate-300" />
                            <span className="line-clamp-2 text-center text-xs font-medium text-foreground">
                              {img.file.name}
                            </span>
                          </div>
                        ) : (
                          <img
                            src={img.previewUrl}
                            alt="Preview"
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                        {/* Upload state overlay */}
                        {img.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                          </div>
                        )}
                        {img.uploadFailed && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                            <AlertCircle className="h-6 w-6 text-red-400" />
                            <span className="text-xs text-red-300">Lỗi tải lên</span>
                          </div>
                        )}
                        <button
                          onClick={() => removeImage(img.id)}
                          className="absolute right-1 top-1 z-10 rounded-full border border-border bg-card p-1 text-muted-foreground shadow-sm dark:shadow-none hover:bg-muted dark:border-gray-500 dark:text-white dark:hover:bg-muted0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square min-h-0 w-full items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:bg-background dark:border-gray-500"
                    >
                      <div className="flex flex-col items-center">
                         <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-1">
                            <span className="text-2xl text-muted-foreground">+</span>
                         </div>
                         <span className="text-xs font-semibold text-muted-foreground">Thêm ảnh</span>
                      </div>
                    </button>
                  </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept={
                    publicPolicy
                      ? buildPostMediaAcceptAttribute(publicPolicy.postPolicy.allowedFileTypes)
                      : 'image/*,video/*'
                  }
                  className="hidden"
                />
                {publicPolicy && (
                  <PostAllowedFormatsHint
                    allowedFileTypes={publicPolicy.postPolicy.allowedFileTypes}
                    className="mt-2"
                  />
                )}
              </div>
            )}

            <div className="mt-2 flex items-center justify-end">
              <div className="relative">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => {
                    if (!showEmojiPicker && emojiButtonRef.current) {
                      setEmojiPickerPos(
                        computeEmojiPickerPosition(emojiButtonRef.current.getBoundingClientRect()),
                      );
                    }
                    setShowEmojiPicker(prev => !prev);
                  }}
                  className="rounded-full p-2 transition-colors hover:bg-muted"
                >
                  <Smile className="h-6 w-6 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Thêm vào bài viết của bạn
                  </span>
                  {publicPolicy && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tối đa {publicPolicy.postPolicy.maxImagesPerPost} ảnh/video
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowImagePicker(true)}
                    className="rounded-full p-2 transition-colors hover:bg-muted"
                  >
                    <Image className="h-6 w-6 text-green-500" />
                  </button>
                  {isGroupPost && !showPoll && (
                    <button
                      type="button"
                      onClick={() => setShowPoll(true)}
                      className="rounded-full p-2 transition-colors hover:bg-muted"
                    >
                      <BarChart3 className="h-6 w-6 text-orange-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="shrink-0 border-t border-border bg-card px-4 pb-4 pt-3">
            {(() => {
              const trimmedPollOptions = pollOptions.map((item) => item.trim()).filter(Boolean);
              const pollNeedsText = showPoll && !postContent.trim();
              const pollNeedsOptions = showPoll && trimmedPollOptions.length < 2;
              const hasContent = postContent.trim() || selectedImages.length > 0 || (showPoll && trimmedPollOptions.length >= 2);
              const isUploading = selectedImages.some(img => img.uploading);
              const hasVideo = selectedImages.some(img => img.type === 'video');
              const hasImage = selectedImages.some(img => img.type === 'image');
              const uploadingLabel = hasVideo && hasImage
                ? 'Đang tải...'
                : hasVideo
                  ? 'Đang đăng hình ảnh/video...'
                  : 'Đang tải ảnh lên...';
              const disabled = !hasContent || isUploading || isPosting || isCheckingContent || rateLimitBlocked || !!checkKeywords(postContent, publicPolicy) || pollNeedsText || pollNeedsOptions;
              const useDirectPost = isGroupPost;

              return (
                <>
                  <button
                    type="button"
                    onClick={useDirectPost ? () => void handlePost() : handleNext}
                    disabled={disabled}
                    className={`w-full rounded-lg py-2.5 font-semibold transition-colors ${ !disabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'cursor-not-allowed bg-muted text-muted-foreground dark:text-muted-foreground' }`}
                  >
                    {isPosting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang đăng...
                      </span>
                    ) : isCheckingContent ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang kiểm tra...
                      </span>
                    ) : isUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploadingLabel}
                      </span>
                    ) : useDirectPost ? 'Đăng' : 'Tiếp'}
                  </button>
                  {pollNeedsText && (
                    <p className="mt-2 text-center text-xs text-red-500">
                      Bạn không thể tạo cuộc thăm dò ý kiến không chứa văn bản trong bài viết.
                    </p>
                  )}
                  {rateLimitMessage && (
                    <p
                      className={`mt-2 text-center text-xs ${ rateLimitBlocked ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground' }`}
                    >
                      {rateLimitMessage}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <ProfilePostGroupModal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          if (reopenSettingsAfterGroup) {
            setReopenSettingsAfterGroup(false);
            setShowSettingsModal(true);
          }
        }}
        selectedGroupId={selectedGroupId}
        onSelect={(gId, gName) => {
          setSelectedGroupId(gId);
          setSelectedGroupName(gName);
          setShowGroupModal(false);
          if (reopenSettingsAfterGroup) {
            setReopenSettingsAfterGroup(false);
            setShowSettingsModal(true);
          }
        }}
      />

      <ProfilePostAudienceModal
        isOpen={showAudienceModal}
        onClose={() => {
          setShowAudienceModal(false);
          if (reopenSettingsAfterAudience) {
            setReopenSettingsAfterAudience(false);
            setShowSettingsModal(true);
          }
        }}
        selectedAudience={privacy}
        onSelect={(audience) => {
          setPrivacy(audience);
          if (audience !== 'public') {
            setSelectedGroupId(null);
            setSelectedGroupName(null);
            if (selectedGroupId) {
              toast.info('Đã bỏ đăng lên nhóm vì bài không còn ở chế độ Công khai.');
            }
          }
          setShowAudienceModal(false);
          if (reopenSettingsAfterAudience) {
            setReopenSettingsAfterAudience(false);
            setShowSettingsModal(true);
          }
        }}
      />

      <ProfilePostScheduleModal
        isOpen={showScheduleModal}
        mode={scheduleMode}
        scheduledAtLocal={scheduledAtLocal}
        onConfirm={({ mode, scheduledAtLocal: nextLocal }) => {
          setScheduleMode(mode);
          if (mode === 'scheduled') {
            setScheduledAtLocal(nextLocal);
          } else {
            setScheduledAtLocal(defaultScheduledDatetimeLocal());
          }
        }}
        onClose={() => {
          setShowScheduleModal(false);
          if (reopenSettingsAfterSchedule) {
            setReopenSettingsAfterSchedule(false);
            setShowSettingsModal(true);
          }
        }}
      />

      <ProfilePostSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onPost={handlePost}
        postContent={postContent}
        postContext={postContext}
        privacy={privacy}
        isPosting={isPosting}
        scheduleSubtitle={scheduleSubtitle}
        postActionLabel={scheduleMode === 'scheduled' ? 'Lên lịch' : 'Đăng'}
        groupName={targetGroup?.name}
        groupPrivacy={targetGroup?.privacy}
        onOpenAudienceSelection={
          isGroupPost
            ? undefined
            : () => {
                setReopenSettingsAfterAudience(true);
                setShowSettingsModal(false);
                setShowAudienceModal(true);
              }
        }
        onOpenScheduleSelection={() => {
          setReopenSettingsAfterSchedule(true);
          setShowSettingsModal(false);
          setShowScheduleModal(true);
        }}
        onOpenGroupSelection={
          isGroupPost
            ? undefined
            : () => {
                setReopenSettingsAfterGroup(true);
                setShowSettingsModal(false);
                setShowGroupModal(true);
              }
        }
        selectedGroupName={selectedGroupName}
        rateLimitMessage={rateLimitMessage}
        rateLimitBlocked={rateLimitBlocked}
      />

      {showEmojiPicker && createPortal(
        <div
          ref={emojiPickerRef}
          className="fixed z-[200] overflow-auto rounded-lg shadow-xl"
          style={{
            top: emojiPickerPos.top,
            right: emojiPickerPos.right,
            maxHeight: emojiPickerPos.maxHeight,
          }}
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="light"
            locale="vi"
            previewPosition="none"
          />
        </div>,
        document.body,
      )}
    </>
  );
}
