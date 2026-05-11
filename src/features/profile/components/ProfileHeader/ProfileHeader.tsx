import { useState, useRef } from 'react';
import { Camera, Plus, Edit, ChevronDown, MoreHorizontal, X, Loader2, UserPlus, UserCheck, UserX, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { toast } from 'sonner';
import { friendService, FRIENDSHIP_CHANGED_EVENT, type FriendshipStatusResponse } from '@/services/friendService';
import { authService } from '@/services/authService';

interface ProfileHeaderProps {
  coverPhoto: string;
  avatar: string;
  fullName: string;
  username?: string;
  friendsCount: number;
  location?: string;
  school?: string;
  isOwnProfile?: boolean;
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
  fullName,
  username,
  friendsCount,
  location,
  school,
  isOwnProfile = true,
  profileUserId,
  friendshipStatus,
  onFriendshipStatusChange,
  onEditClick,
  onAvatarUpload,
  onCoverUpload,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleSendFriendRequest = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !profileUserId) return;
    setFriendActionLoading(true);
    try {
      const res = await friendService.sendFriendRequest(currentUser.id, profileUserId);
      onFriendshipStatusChange?.({
        friendshipId: res.friendshipId,
        status: 'PENDING',
        sentByMe: true,
      });
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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAvatarUpload) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }
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
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }
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

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      {/* Image Viewer Lightbox */}
      {viewerImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 lg:p-12 animate-in fade-in duration-200"
          onClick={() => setViewerImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-full text-white transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setViewerImage(null);
            }}
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="relative max-w-full max-h-full">
            <img 
              src={viewerImage} 
              alt="Full size" 
              className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto">
        {/* Cover Photo Area */}
        <div
          className="relative h-[250px] md:h-[350px] w-full rounded-b-xl overflow-hidden bg-gray-200 dark:bg-gray-700 group/cover cursor-pointer"
          onClick={() => setViewerImage(coverPhoto)}
        >
          <ImageWithFallback
            src={coverPhoto}
            alt="Cover photo"
            className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-[1.02]"
          />
          {isOwnProfile && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverFileChange}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}
                disabled={coverUploading}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg shadow-sm font-medium transition-colors text-sm cursor-pointer disabled:opacity-70"
              >
                {coverUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {coverUploading ? 'Đang tải...' : 'Chỉnh sửa ảnh bìa'}
              </button>
            </>
          )}
        </div>

        {/* Profile Info Area */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-8 md:-mt-12 lg:-mt-16">
            {/* Avatar - overlaps cover photo */}
            <div
              className="relative group/avatar flex-shrink-0 cursor-pointer"
              onClick={() => setViewerImage(avatar)}
            >
              <div className="w-[168px] h-[168px] rounded-full border-[5px] border-white dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                {avatarUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <ImageWithFallback
                    src={avatar}
                    alt={fullName}
                    className="w-full h-full object-cover transition-opacity duration-200 group-hover/avatar:opacity-90"
                  />
                )}
              </div>
              {isOwnProfile && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                    disabled={avatarUploading}
                    className="absolute bottom-3 right-3 w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors border-2 border-white dark:border-gray-800 shadow-sm cursor-pointer disabled:opacity-70"
                  >
                    <Camera className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                </>
              )}
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1 min-w-0 text-center md:text-left mb-2 md:pb-2">
              <h1 className="text-3xl md:text-3xl font-bold text-gray-900 dark:text-white flex flex-wrap items-baseline justify-center md:justify-start gap-x-3 gap-y-1">
                <span className="break-words">{fullName}</span>
                {username && (
                  <span className="text-gray-500 dark:text-gray-400 font-normal text-xl md:text-2xl leading-none">
                    ({username})
                  </span>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 font-semibold mt-1">
                {friendsCount} người bạn
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-2 md:pb-2">
              {isOwnProfile ? (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-[15px]">
                    <Plus className="w-5 h-5" />
                    Thêm vào tin
                  </button>
                  <button 
                    onClick={onEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium text-[15px]"
                  >
                    <Edit className="w-4 h-4 text-gray-900 dark:text-white" />
                    Chỉnh sửa trang cá nhân
                  </button>
                  <button className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  {/* Friend action button — changes based on relationship */}
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

                  {/* Message button — only active when friends */}
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
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                      title="Kết bạn để nhắn tin"
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
