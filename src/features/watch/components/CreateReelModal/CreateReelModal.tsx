import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Clapperboard, Globe, Loader2, Lock, Users, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { CurrentUserAvatar } from '@/components/shared';
import { ProfilePostAudienceModal } from '@/features/profile/components/ProfileCreatePost/ProfilePostAudienceModal';
import {
  audienceToApiPrivacy,
  getAudienceLabel,
  type AudienceId,
} from '@/features/profile/components/ProfileCreatePost/postAudienceUtils';
import { usePublicPolicies } from '@/hooks/usePublicPolicies';
import { useRefreshPoliciesOnOpen } from '@/hooks/useRefreshPoliciesOnOpen';
import { usePostRateLimit } from '@/hooks/usePostRateLimit';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { formatPostRateLimitMessage, isPostRateLimitReached } from '@/utils/postRateLimit';
import { validatePostMediaFiles } from '@/utils/policyValidation';
import { getPostMediaKind, toApiMediaType } from '@/utils/allowedFileTypes';
import { WATCH_FEED_KEY } from '../../hooks/useWatchFeed';

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

type SelectedVideo = {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  uploadFailed?: boolean;
};

export function CreateReelModal({ isOpen, onClose, onCreated }: CreateReelModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<AudienceId>('public');
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  const { data: publicPolicy, isLoading: policyLoading } = usePublicPolicies();
  useRefreshPoliciesOnOpen(isOpen);
  const { data: rateLimit } = usePostRateLimit(isOpen);
  const rateLimitMessage = useMemo(
    () => (rateLimit ? formatPostRateLimitMessage(rateLimit) : null),
    [rateLimit],
  );
  const rateLimitBlocked = isPostRateLimitReached(rateLimit);

  const resetState = useCallback((options?: { keepUploadedMedia?: boolean }) => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    uploadPromiseRef.current = null;
    if (selectedVideo?.previewUrl) {
      URL.revokeObjectURL(selectedVideo.previewUrl);
    }
    if (!options?.keepUploadedMedia && selectedVideo?.uploadedUrl) {
      postService.deletePostMedia(selectedVideo.uploadedUrl).catch(() => {});
    }
    setCaption('');
    setPrivacy('public');
    setSelectedVideo(null);
    setShowAudienceModal(false);
    setIsPosting(false);
  }, [selectedVideo]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (policyLoading || !publicPolicy) {
      toast.error('Đang tải quy định đăng bài. Vui lòng thử lại sau.');
      if (e.target) e.target.value = '';
      return;
    }

    const mediaError = validatePostMediaFiles([file], publicPolicy);
    if (mediaError) {
      toast.error(mediaError);
      if (e.target) e.target.value = '';
      return;
    }

    if (getPostMediaKind(file) !== 'video') {
      toast.error(t('watch.createReelOneVideo'));
      if (e.target) e.target.value = '';
      return;
    }

    if (selectedVideo) {
      if (selectedVideo.previewUrl) URL.revokeObjectURL(selectedVideo.previewUrl);
      if (selectedVideo.uploadedUrl) {
        postService.deletePostMedia(selectedVideo.uploadedUrl).catch(() => {});
      }
      uploadControllerRef.current?.abort();
    }

    const id = Math.random().toString(36).slice(2);
    const previewUrl = URL.createObjectURL(file);
    const next: SelectedVideo = { id, file, previewUrl, uploading: true };
    setSelectedVideo(next);
    if (e.target) e.target.value = '';

    const controller = new AbortController();
    uploadControllerRef.current = controller;
    const promise = postService
      .uploadPostImage(file, controller.signal)
      .then((res) => {
        uploadControllerRef.current = null;
        setSelectedVideo((prev) =>
          prev?.id === id ? { ...prev, uploadedUrl: res.url, uploading: false } : prev,
        );
        return res.url;
      })
      .catch((err) => {
        uploadControllerRef.current = null;
        if (err instanceof Error && err.name === 'AbortError') return '';
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Không thể tải video lên. Vui lòng thử lại.';
        toast.error(message);
        setSelectedVideo((prev) =>
          prev?.id === id ? { ...prev, uploading: false, uploadFailed: true } : prev,
        );
        return '';
      });
    uploadPromiseRef.current = promise;
  };

  const handlePublish = async () => {
    const user = authService.getCurrentUser();
    if (!user?.id) {
      toast.error(t('watch.createReelLoginRequired'));
      return;
    }
    if (!selectedVideo || selectedVideo.uploadFailed) {
      toast.error(t('watch.createReelSelectVideo'));
      return;
    }
    if (rateLimitBlocked) {
      toast.error(rateLimitMessage ?? t('watch.createReelError'));
      return;
    }

    setIsPosting(true);
    try {
      let videoUrl = selectedVideo.uploadedUrl;
      if (!videoUrl) {
        const pending = uploadPromiseRef.current;
        videoUrl = pending ? await pending : (await postService.uploadPostImage(selectedVideo.file)).url;
      }
      if (!videoUrl) {
        throw new Error(t('watch.createReelError'));
      }

      await postService.createPost({
        authorId: user.id,
        content: caption.trim(),
        media: [
          {
            mediaType: toApiMediaType('video'),
            fileUrl: videoUrl,
            sortOrder: 0,
          },
        ],
        imageUrl: videoUrl,
        privacy: audienceToApiPrivacy(privacy),
        status: 'PUBLISHED',
        postType: 'REEL',
      });

      toast.success(t('watch.createReelSuccess'));
      void queryClient.invalidateQueries({ queryKey: WATCH_FEED_KEY });
      void queryClient.invalidateQueries({ queryKey: ['posts', 'rate-limit'] });
      onCreated?.();
      resetState({ keepUploadedMedia: true });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('watch.createReelError');
      toast.error(message);
      if (/quá nhanh|phút/i.test(message)) {
        void queryClient.invalidateQueries({ queryKey: ['posts', 'rate-limit'] });
      }
    } finally {
      setIsPosting(false);
    }
  };

  if (!isOpen) return null;

  const user = authService.getCurrentUser();
  const canPublish =
    !!selectedVideo &&
    !selectedVideo.uploadFailed &&
    !selectedVideo.uploading &&
    !isPosting &&
    !rateLimitBlocked;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-xl bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-foreground">{t('watch.createReelTitle')}</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-2 transition-colors hover:bg-muted"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-4 flex items-center gap-3">
              <CurrentUserAvatar size={40} />
              <button
                type="button"
                onClick={() => setShowAudienceModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/80"
              >
                {privacy === 'public' ? (
                  <Globe className="h-4 w-4" />
                ) : privacy === 'friends' ? (
                  <Users className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {getAudienceLabel(privacy)}
              </button>
            </div>

            <p className="mb-3 text-sm text-muted-foreground">{t('watch.createReelHint')}</p>

            {selectedVideo ? (
              <div className="relative mb-4 overflow-hidden rounded-xl bg-black">
                <video
                  src={selectedVideo.previewUrl}
                  className="mx-auto max-h-[360px] w-full object-contain"
                  controls
                  playsInline
                />
                {selectedVideo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80"
                >
                  {t('watch.createReelSelectVideo')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mb-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-12 transition-colors hover:bg-muted"
              >
                <Video className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {t('watch.createReelSelectVideo')}
                </span>
              </button>
            )}

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('watch.createReelCaption')}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500/40"
            />

            {rateLimitMessage && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{rateLimitMessage}</p>
            )}
          </div>

          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              disabled={!canPublish}
              onClick={() => void handlePublish()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPosting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('watch.createReelPublish')}
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <ProfilePostAudienceModal
        isOpen={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        selectedAudience={privacy}
        onSelect={(audience) => {
          setPrivacy(audience);
          setShowAudienceModal(false);
        }}
      />
    </>,
    document.body,
  );
}
