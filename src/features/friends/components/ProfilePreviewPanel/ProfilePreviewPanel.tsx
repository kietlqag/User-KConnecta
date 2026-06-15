import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Expand, Loader2, MessageCircle, UserPlus, Users, X } from 'lucide-react';
import { authService, type AuthUser } from '../../../../services/authService';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import {
  PROFILE_DEFAULT_AVATAR,
  PROFILE_DEFAULT_COVER,
} from '../../../profile/utils/profileDisplayUtils';

interface ProfilePreviewPanelProps {
  userId: string | null;
  isPending: boolean;
  isFriend: boolean;
  mutualFriends?: number;
  onAddFriend: (userId: string) => Promise<void>;
  onCancelFriendRequest: (userId: string) => Promise<void>;
}

export const ProfilePreviewPanel = ({
  userId,
  isPending,
  isFriend,
  mutualFriends = 0,
  onAddFriend,
  onCancelFriendRequest,
}: ProfilePreviewPanelProps) => {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setCoverLoaded(false);
    authService.getUser(userId).then((res) => {
      setProfile(res);
    }).catch(() => {
      setProfile(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [userId]);

  const handleAdd = async () => {
    if (!userId) return;
    setActionLoading(true);
    try { await onAddFriend(userId); } finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!userId) return;
    setActionLoading(true);
    try { await onCancelFriendRequest(userId); } finally { setActionLoading(false); }
  };

  // Empty state
  if (!userId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <Users className="h-12 w-12 text-gray-400" />
        </div>
        <p className="text-[15px] font-medium text-gray-500">
          Chọn tên của người mà bạn muốn xem trước trang cá nhân.
        </p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <p className="text-gray-500">Không thể tải thông tin người dùng.</p>
      </div>
    );
  }

  const infoItems = [
    profile.location && { icon: '📍', label: `Sống ở ${profile.location}` },
    profile.hometown && { icon: '🏠', label: `Quê quán ${profile.hometown}` },
    profile.workplace && { icon: '💼', label: profile.jobTitle ? `${profile.jobTitle} tại ${profile.workplace}` : profile.workplace },
    profile.school && { icon: '🎓', label: profile.school },
    profile.relationshipStatus && { icon: '❤️', label: profile.relationshipStatus },
  ].filter(Boolean) as { icon: string; label: string }[];

  const profilePath = `/profile/${profile.id}`;
  const coverSrc = profile.coverPhotoUrl || PROFILE_DEFAULT_COVER;
  const avatarSrc = profile.avatarUrl || PROFILE_DEFAULT_AVATAR;

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-6">
      {viewerImage && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
          onClick={() => setViewerImage(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-gray-800/50 p-2 text-white transition-colors hover:bg-gray-700/50"
            onClick={(e) => {
              e.stopPropagation();
              setViewerImage(null);
            }}
            aria-label="Đóng"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={viewerImage}
            alt="Ảnh bìa"
            className="max-h-[90vh] max-w-full rounded-sm object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="w-full max-w-xl">
        {/* Cover + Avatar */}
        <div className="relative mb-16">
          <button
            type="button"
            onClick={() => coverLoaded && setViewerImage(coverSrc)}
            disabled={!coverLoaded}
            className="group/cover relative block h-44 w-full overflow-hidden rounded-xl bg-gray-200 cursor-pointer disabled:cursor-default"
            aria-label={`Xem ảnh bìa của ${profile.fullName}`}
          >
            <div
              className={`absolute inset-0 bg-gray-300 transition-opacity duration-500 pointer-events-none ${
                coverLoaded ? 'opacity-0' : 'animate-pulse opacity-100'
              }`}
            />
            <img
              src={coverSrc}
              alt="Ảnh bìa"
              className={`h-full w-full object-cover transition-all duration-500 group-hover/cover:scale-[1.02] ${
                coverLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setCoverLoaded(true)}
              onError={(e) => {
                e.currentTarget.src = PROFILE_DEFAULT_COVER;
                setCoverLoaded(true);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/cover:bg-black/25">
              <span className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 text-sm font-medium text-white opacity-0 transition-opacity group-hover/cover:opacity-100">
                <Expand className="h-4 w-4" />
                Xem ảnh bìa
              </span>
            </div>
          </button>

          <Link
            to={profilePath}
            className="absolute bottom-0 left-6 translate-y-1/2 block cursor-pointer rounded-full ring-4 ring-white transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            aria-label={`Xem trang cá nhân của ${profile.fullName}`}
          >
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-300">
              <ImageWithFallback
                src={avatarSrc}
                alt={profile.fullName}
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
        </div>

        {/* Name + actions */}
        <div className="mb-4 px-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                to={profilePath}
                className="text-2xl font-bold leading-tight text-gray-900 transition-colors hover:underline"
              >
                {profile.fullName}
              </Link>
              {profile.username && (
                <p className="text-sm text-gray-500">@{profile.username}</p>
              )}
              {mutualFriends > 0 && (
                <p className="mt-1 text-sm font-medium text-gray-600">
                  {mutualFriends} bạn chung
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isFriend ? (
                <Link
                  to={`/messages/${profile.id}`}
                  className="flex h-9 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Nhắn tin
                </Link>
              ) : isPending ? (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="flex h-9 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Hủy lời mời
                </button>
              ) : (
                <button
                  onClick={handleAdd}
                  disabled={actionLoading}
                  className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <UserPlus className="h-4 w-4" />}
                  Thêm bạn bè
                </button>
              )}
              <Link
                to={profilePath}
                className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Xem trang cá nhân
              </Link>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
          )}
        </div>

        {/* Divider */}
        {infoItems.length > 0 && (
          <>
            <hr className="border-gray-200 mb-4" />
            <div className="px-1 space-y-2">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Thông tin cá nhân</h3>
              {infoItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-gray-700">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
