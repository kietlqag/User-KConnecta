import { useState, useRef, useEffect } from 'react';
import {
  Camera, Plus, Edit,
  X, Loader2, UserPlus, UserCheck, UserX, MessageCircle, UserMinus, MoreHorizontal, Ban,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { friendService, FRIENDSHIP_CHANGED_EVENT, type FriendshipStatusResponse } from '@/services/friendService';
import { authService } from '@/services/authService';
import { userSettingsApi } from '@/features/settings/services/userSettingsApi';
import { UserAvatar } from '@/components/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { isPlaceholderAvatar } from '@/utils/userAvatarUtils';
import { PROFILE_DEFAULT_COVER } from '../../utils/profileDisplayUtils';

const DEFAULT_COVER = PROFILE_DEFAULT_COVER;

interface ProfileHeaderProps {
  coverPhoto?: string;
  avatar?: string;
  fullName?: string;
  username?: string;
  friendsCount?: number;
  isOwnProfile?: boolean;
  /** Pass true while profile data is still fetching to show skeleton instead of defaults */
  loading?: boolean;
  profileUserId?: string;
  friendshipStatus?: FriendshipStatusResponse | null;
  onFriendshipStatusChange?: (status: FriendshipStatusResponse | null) => void;
  onEditClick?: () => void;
  onAvatarUpload?: (file: File) => Promise<void>;
  onCoverUpload?: (file: File) => Promise<void>;
}

export function ProfileHeader({
  coverPhoto,
  avatar,
  fullName = '',
  username,
  friendsCount = 0,
  isOwnProfile = false,
  loading = false,
  profileUserId,
  friendshipStatus,
  onFriendshipStatusChange,
  onEditClick,
  onAvatarUpload,
  onCoverUpload,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Lightbox / upload state
  const [viewerImage, setViewerImage]     = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading]   = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  // Image load tracking — prevents flash of default image
  const [coverLoaded, setCoverLoaded] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef  = useRef<HTMLInputElement>(null);

  // Reset loaded flags whenever the image URL changes (e.g. after upload)
  useEffect(() => { setCoverLoaded(false); }, [coverPhoto]);

  useEffect(() => {
    if (isOwnProfile || !profileUserId) {
      setIsBlockedByMe(false);
      return;
    }
    let cancelled = false;
    void userSettingsApi.getBlockStatus(profileUserId).then((status) => {
      if (!cancelled) setIsBlockedByMe(status.blockedByMe);
    }).catch(() => {
      if (!cancelled) setIsBlockedByMe(false);
    });
    return () => { cancelled = true; };
  }, [isOwnProfile, profileUserId]);

  /* -------- friend actions -------- */
  const handleSendFriendRequest = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !profileUserId) return;
    setFriendActionLoading(true);
    try {
      const res = await friendService.sendFriendRequest(currentUser.id, profileUserId);
      onFriendshipStatusChange?.({ friendshipId: res.friendshipId, status: 'PENDING', sentByMe: true });
      toast.success(t('profile.friendRequestSent'));
    } catch {
      toast.error(t('profile.friendRequestFailed'));
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!friendshipStatus?.friendshipId) return;
    setFriendActionLoading(true);
    try {
      await friendService.deleteFriendship(friendshipStatus.friendshipId);
      onFriendshipStatusChange?.(null);
      toast.success(t('profile.friendCancelSuccess'));
    } catch {
      toast.error(t('profile.friendCancelFailed'));
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendshipStatus?.friendshipId) return;
    setFriendActionLoading(true);
    try {
      const res = await friendService.acceptFriendRequest(friendshipStatus.friendshipId);
      onFriendshipStatusChange?.({ friendshipId: res.friendshipId, status: 'ACCEPTED', sentByMe: false });
      window.dispatchEvent(new Event(FRIENDSHIP_CHANGED_EVENT));
      toast.success(t('profile.friendAcceptSuccess'));
    } catch {
      toast.error(t('profile.friendAcceptFailed'));
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!friendshipStatus?.friendshipId) return;
    setFriendActionLoading(true);
    try {
      await friendService.deleteFriendship(friendshipStatus.friendshipId);
      onFriendshipStatusChange?.(null);
      window.dispatchEvent(new Event(FRIENDSHIP_CHANGED_EVENT));
      toast.success(t('profile.unfriendSuccess'));
    } catch {
      toast.error(t('profile.unfriendFailed'));
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!profileUserId) return;
    setBlockActionLoading(true);
    try {
      await userSettingsApi.blockUser(profileUserId);
      setIsBlockedByMe(true);
      onFriendshipStatusChange?.(null);
      setBlockDialogOpen(false);
      toast.success(t('profile.blockSuccess'));
    } catch {
      toast.error(t('profile.blockError'));
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!profileUserId) return;
    setBlockActionLoading(true);
    try {
      await userSettingsApi.unblockUser(profileUserId);
      setIsBlockedByMe(false);
      toast.success(t('profile.unblockSuccess'));
    } catch {
      toast.error(t('profile.unblockError'));
    } finally {
      setBlockActionLoading(false);
    }
  };

  /* -------- upload handlers -------- */
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAvatarUpload) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Kích thước ảnh không được vượt quá 5MB'); return; }
    setAvatarUploading(true);
    try {
      await onAvatarUpload(file);
      toast.success('Cập nhật ảnh đại diện thành công');
    } catch {
      toast.error('Cập nhật ảnh đại diện thất bại');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onCoverUpload) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Kích thước ảnh không được vượt quá 5MB'); return; }
    setCoverUploading(true);
    try {
      await onCoverUpload(file);
      toast.success('Cập nhật ảnh bìa thành công');
    } catch {
      toast.error('Cập nhật ảnh bìa thất bại');
    } finally {
      setCoverUploading(false);
      e.target.value = '';
    }
  };

  /* -------- derived -------- */
  const hasRealAvatar = !isPlaceholderAvatar(avatar);
  const resolvedCover = coverPhoto || DEFAULT_COVER;
  const displayName = fullName?.trim() || username?.trim() || 'Người dùng';

  const showCoverSkeleton = loading || (!coverLoaded && !coverUploading);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-none border-b border-gray-200 dark:border-gray-700">

      {/* ── Lightbox ── */}
      {viewerImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 lg:p-12 animate-in fade-in duration-200"
          onClick={() => setViewerImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-full text-white transition-colors"
            onClick={e => { e.stopPropagation(); setViewerImage(null); }}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={viewerImage}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="max-w-[1100px] mx-auto">

        {/* ── Cover photo ── */}
        <div
          className="relative h-[250px] md:h-[350px] w-full rounded-b-xl overflow-hidden bg-gray-200 dark:bg-gray-700 group/cover"
          onClick={() => coverLoaded && !loading && setViewerImage(resolvedCover)}
          style={{ cursor: coverLoaded && !loading ? 'pointer' : 'default' }}
        >
          {/* Shimmer — sits on top, fades out once the image is ready */}
          <div
            className={`absolute inset-0 bg-gray-300 dark:bg-gray-600 transition-opacity duration-500 pointer-events-none ${
              showCoverSkeleton ? 'opacity-100 animate-pulse' : 'opacity-0'
            }`}
          />

          {/* Real cover — rendered only after profile loaded; fades in on browser load */}
          {!loading && (
            <img
              src={resolvedCover}
              alt="Cover photo"
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover/cover:scale-[1.02] ${
                coverLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setCoverLoaded(true)}
              onError={e => { e.currentTarget.src = DEFAULT_COVER; setCoverLoaded(true); }}
            />
          )}

          {/* Upload overlay */}
          {coverUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="w-10 h-10 animate-spin text-white" />
            </div>
          )}

          {/* Edit cover button */}
          {isOwnProfile && !loading && (
            <>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} onClick={e => e.stopPropagation()} />
              <button
                onClick={e => { e.stopPropagation(); coverInputRef.current?.click(); }}
                disabled={coverUploading}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-muted text-gray-900 dark:text-gray-100 rounded-lg shadow-sm dark:shadow-none font-medium text-sm transition-colors disabled:opacity-70"
              >
                {coverUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {coverUploading ? 'Đang tải...' : 'Chỉnh sửa ảnh bìa'}
              </button>
            </>
          )}
        </div>

        {/* ── Profile info row ── */}
        <div className="relative px-4 pb-4 pt-1">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-8 md:-mt-12 lg:-mt-16">

            {/* ── Avatar ── */}
            <div
              className="relative group/avatar flex-shrink-0"
              style={{ cursor: hasRealAvatar && !loading ? 'pointer' : 'default' }}
              onClick={() => hasRealAvatar && avatar && !loading && setViewerImage(avatar)}
            >
              <div className="relative w-[168px] h-[168px] rounded-full border-[5px] border-white dark:border-card bg-white dark:bg-card overflow-hidden shadow-sm">
                {loading ? (
                  <div className="absolute inset-0 bg-muted animate-pulse" />
                ) : (
                  <UserAvatar
                    name={displayName}
                    avatarUrl={avatar}
                    userId={profileUserId}
                    className="absolute inset-0 h-full w-full group-hover/avatar:brightness-95 transition-[filter]"
                    rounded="full"
                    initialsClassName="text-5xl font-bold tracking-wide"
                  />
                )}

                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-700/80">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500 dark:text-gray-400" />
                  </div>
                )}
              </div>

              {/* Camera button */}
              {isOwnProfile && !loading && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} onClick={e => e.stopPropagation()} />
                  <button
                    onClick={e => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                    disabled={avatarUploading}
                    className="absolute bottom-3 right-3 w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors border-2 border-white dark:border-gray-800 shadow-sm dark:shadow-none cursor-pointer disabled:opacity-70"
                  >
                    <Camera className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                </>
              )}
            </div>

            {/* ── Name & friends count ── */}
            <div className="flex-1 min-w-0 text-center md:text-left mb-2 md:pb-2">
              {loading ? (
                <div className="space-y-2.5 py-1">
                  <div className="h-8 w-52 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse mx-auto md:mx-0" />
                  <div className="h-4 w-32 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse mx-auto md:mx-0" />
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white break-words">
                    {fullName}
                  </h1>
                  {username && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                      @{username}
                    </p>
                  )}
                  <p className="text-gray-600 dark:text-gray-400 font-semibold mt-1">
                    {t('common.friends', { count: friendsCount })}
                  </p>
                </>
              )}
            </div>

            {/* ── Action buttons ── */}
            <div className="flex items-center gap-2 mb-2 md:pb-2 flex-shrink-0">
              {loading ? (
                <>
                  <div className="h-10 w-36 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="h-10 w-48 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                </>
              ) : isOwnProfile ? (
                <>
                  <button
                    onClick={() => navigate('/stories/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium text-[15px]"
                  >
                    <Plus className="w-5 h-5" />
                    {t('profile.addStory')}
                  </button>
                  <button
                    onClick={onEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium text-[15px]"
                  >
                    <Edit className="w-4 h-4" />
                    {t('profile.editProfile')}
                  </button>
                </>
              ) : (
                <>
                  {friendshipStatus?.status === 'ACCEPTED' ? (
                    <button
                      onClick={handleUnfriend}
                      disabled={friendActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium disabled:opacity-60"
                    >
                      {friendActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                      {t('profile.friends')}
                    </button>
                  ) : friendshipStatus?.status === 'PENDING' && friendshipStatus.sentByMe ? (
                    <button
                      onClick={handleCancelFriendRequest}
                      disabled={friendActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium disabled:opacity-60"
                    >
                      {friendActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                      {t('profile.requestSent')}
                    </button>
                  ) : friendshipStatus?.status === 'PENDING' && !friendshipStatus.sentByMe ? (
                    <>
                      <button
                        onClick={handleAcceptFriendRequest}
                        disabled={friendActionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium disabled:opacity-60"
                      >
                        {friendActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        {t('profile.accept')}
                      </button>
                      <button
                        onClick={handleCancelFriendRequest}
                        disabled={friendActionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium disabled:opacity-60"
                      >
                        {friendActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                        {t('profile.reject')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={friendActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium disabled:opacity-60"
                    >
                      {friendActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      {t('profile.addFriend')}
                    </button>
                  )}

                  {friendshipStatus?.status === 'ACCEPTED' ? (
                    <button
                      onClick={() => navigate(`/messages?with=${profileUserId}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {t('profile.message')}
                    </button>
                  ) : (
                    <button
                      disabled
                      title={t('profile.messageDisabled')}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {t('profile.message')}
                    </button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={blockActionLoading}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors disabled:opacity-60"
                        title={t('profile.more')}
                      >
                        {blockActionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="w-5 h-5" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-[10px]">
                      {isBlockedByMe ? (
                        <DropdownMenuItem onClick={() => void handleUnblockUser()} className="cursor-pointer">
                          <Ban className="mr-2 h-4 w-4" />
                          {t('profile.unblock')}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setBlockDialogOpen(true)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          {t('profile.block')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                    <AlertDialogContent className="rounded-[12px]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t('profile.blockConfirmTitle', { name: fullName || username || '' })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('profile.blockConfirmDesc')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={blockActionLoading}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(event) => {
                            event.preventDefault();
                            void handleBlockUser();
                          }}
                          disabled={blockActionLoading}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('profile.block')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
