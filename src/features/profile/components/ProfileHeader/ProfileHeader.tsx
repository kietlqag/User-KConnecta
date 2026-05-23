import { useState, useRef, useEffect } from 'react';
import {
  Camera, Plus, Edit, ChevronDown, MoreHorizontal,
  X, Loader2, UserPlus, UserCheck, UserX, MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { friendService, FRIENDSHIP_CHANGED_EVENT, type FriendshipStatusResponse } from '@/services/friendService';
import { authService } from '@/services/authService';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';
const DEFAULT_COVER  = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

interface ProfileHeaderProps {
  coverPhoto?: string;
  avatar?: string;
  fullName?: string;
  username?: string;
  friendsCount?: number;
  location?: string;
  school?: string;
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

  // Lightbox / upload state
  const [viewerImage, setViewerImage]     = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading]   = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  // Image load tracking — prevents flash of default image
  const [coverLoaded, setCoverLoaded]       = useState(false);
  const [avatarImgLoaded, setAvatarImgLoaded] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef  = useRef<HTMLInputElement>(null);

  // Reset loaded flags whenever the image URL changes (e.g. after upload)
  useEffect(() => { setCoverLoaded(false); }, [coverPhoto]);
  useEffect(() => { setAvatarImgLoaded(false); }, [avatar]);

  /* -------- friend actions -------- */
  const handleSendFriendRequest = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !profileUserId) return;
    setFriendActionLoading(true);
    try {
      const res = await friendService.sendFriendRequest(currentUser.id, profileUserId);
      onFriendshipStatusChange?.({ friendshipId: res.friendshipId, status: 'PENDING', sentByMe: true });
      toast.success('Đã gửi lời mời kết bạn');
    } catch {
      toast.error('Không thể gửi lời mời kết bạn');
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
      toast.success('Đã hủy lời mời kết bạn');
    } catch {
      toast.error('Không thể hủy lời mời kết bạn');
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
      toast.success('Đã hủy kết bạn');
    } catch {
      toast.error('Không thể hủy kết bạn');
    } finally {
      setFriendActionLoading(false);
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
  const resolvedAvatar = avatar  || DEFAULT_AVATAR;
  const resolvedCover  = coverPhoto || DEFAULT_COVER;

  const showCoverSkeleton  = loading || (!coverLoaded && !coverUploading);
  const showAvatarSkeleton = loading || (!avatarImgLoaded && !avatarUploading);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">

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
                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg shadow-sm font-medium text-sm transition-colors disabled:opacity-70"
              >
                {coverUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {coverUploading ? 'Đang tải...' : 'Chỉnh sửa ảnh bìa'}
              </button>
            </>
          )}
        </div>

        {/* ── Profile info row ── */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-8 md:-mt-12 lg:-mt-16">

            {/* ── Avatar ── */}
            <div
              className="relative group/avatar flex-shrink-0"
              style={{ cursor: avatarImgLoaded && !loading ? 'pointer' : 'default' }}
              onClick={() => avatarImgLoaded && !loading && setViewerImage(resolvedAvatar)}
            >
              <div className="relative w-[168px] h-[168px] rounded-full border-[5px] border-white dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                {/* Shimmer circle */}
                <div
                  className={`absolute inset-0 bg-gray-300 dark:bg-gray-600 transition-opacity duration-300 pointer-events-none ${
                    showAvatarSkeleton ? 'opacity-100 animate-pulse' : 'opacity-0'
                  }`}
                />

                {/* Real avatar */}
                {!loading && !avatarUploading && (
                  <img
                    src={resolvedAvatar}
                    alt={fullName}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 group-hover/avatar:brightness-95 ${
                      avatarImgLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setAvatarImgLoaded(true)}
                    onError={e => { e.currentTarget.src = DEFAULT_AVATAR; setAvatarImgLoaded(true); }}
                  />
                )}

                {/* Upload spinner */}
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-700/80">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
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
                    className="absolute bottom-3 right-3 w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors border-2 border-white dark:border-gray-800 shadow-sm cursor-pointer disabled:opacity-70"
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
                  <p className="text-gray-600 dark:text-gray-400 font-semibold mt-1">
                    {friendsCount} người bạn
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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-[15px]"
                  >
                    <Plus className="w-5 h-5" />
                    Thêm vào tin
                  </button>
                  <button
                    onClick={onEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium text-[15px]"
                  >
                    <Edit className="w-4 h-4" />
                    Chỉnh sửa trang cá nhân
                  </button>
                  <button className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors">
                    <ChevronDown className="w-5 h-5" />
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
                      Bạn bè
                    </button>
                  ) : friendshipStatus?.status === 'PENDING' && friendshipStatus.sentByMe ? (
                    <button
                      onClick={handleCancelFriendRequest}
                      disabled={friendActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium disabled:opacity-60"
                    >
                      {friendActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                      Đã gửi lời mời
                    </button>
                  ) : (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={friendActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-60"
                    >
                      {friendActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Thêm bạn bè
                    </button>
                  )}

                  {friendshipStatus?.status === 'ACCEPTED' ? (
                    <button
                      onClick={() => navigate(`/messages?with=${profileUserId}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Nhắn tin
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Kết bạn để nhắn tin"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Nhắn tin
                    </button>
                  )}

                  <button className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
