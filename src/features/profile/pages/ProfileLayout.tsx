import { vi } from '@/constants/vi';
import * as React from 'react';
import { Outlet, useNavigate, useLocation, useParams, useOutletContext, useNavigationType } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { EditProfileDialog, ProfileHeader, ProfileTabs } from '../components';
import { authService, AUTH_USER_CHANGED_EVENT, type AuthUser } from '@/services/authService';
import { friendService, FRIENDSHIP_CHANGED_EVENT, type FriendshipStatusResponse } from '@/services/friendService';
import {
  buildEditProfileInitialData,
  buildProfileDisplay,
  extractProfileSubPath,
  getProfileHeaderName,
  isOwnProfileUser,
  resolveRouteProfileUserId,
} from '../utils/profileDisplayUtils';
import {
  logProfileTabError,
  logProfileTabRedirect,
  logProfileTabRouteChange,
} from '../utils/profileTabLogger';
import { scrollToHomeTop } from '@/features/home/utils/scrollToHomeTop';
import {
  getProfileLayoutCache,
  hasProfileLayoutCache,
  setProfileLayoutCache,
} from '../utils/profileSessionCache';

export interface ProfileLayoutContext {
  profile: AuthUser | null;
  setProfile: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  resolvedId: string;
  isOwnProfile: boolean;
  friendsCount: number;
  friendshipStatus: FriendshipStatusResponse | null;
  setFriendshipStatus: React.Dispatch<React.SetStateAction<FriendshipStatusResponse | null>>;
  loading: boolean;
  onEditClick: () => void;
}

export function useProfileLayoutContext() {
  return useOutletContext<ProfileLayoutContext>();
}

export function ProfileLayout() {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(() => authService.getCurrentUser());

  React.useEffect(() => {
    const syncAuth = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  const userId = React.useMemo(
    () => resolveRouteProfileUserId(routeUserId, currentUser),
    [routeUserId, currentUser],
  );

  const [profile, setProfile] = React.useState<AuthUser | null>(null);
  const [resolvedId, setResolvedId] = React.useState('');
  const [friendsCount, setFriendsCount] = React.useState(0);
  const [friendshipStatus, setFriendshipStatus] = React.useState<FriendshipStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [accessDenied, setAccessDenied] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);  const navigationType = useNavigationType();
  const locationRef = React.useRef(location);
  locationRef.current = location;
  const loadedProfileRef = React.useRef<{ id: string; username?: string } | null>(null);

  const isOwnProfile = isOwnProfileUser(currentUser, {
    resolvedProfileId: resolvedId,
    routeUserId: userId,
  });

  React.useEffect(() => {
    logProfileTabRouteChange(location.pathname, {
      resolvedId: resolvedId || undefined,
      accessDenied,
      profileKey: profile?.username || userId || undefined,
    });
  }, [location.pathname, resolvedId, accessDenied, profile?.username, userId]);

  React.useEffect(() => {
    if (navigationType === 'POP' && hasProfileLayoutCache(userId)) return;
    void scrollToHomeTop(480);
  }, [location.pathname, navigationType, userId]);

  React.useEffect(() => {
    if (!profile || !resolvedId || loading) return;
    setProfileLayoutCache(userId, {
      profile,
      resolvedId,
      friendsCount,
      friendshipStatus,
      accessDenied,
      blocked,
    });
  }, [userId, profile, resolvedId, friendsCount, friendshipStatus, accessDenied, blocked, loading]);

  React.useEffect(() => {
    if (!userId || userId === 'undefined') { setLoading(false); return; }

    const loaded = loadedProfileRef.current;
    if (loaded && (userId === loaded.id || userId === loaded.username)) {
      setLoading(false);
      return;
    }

    const cached = getProfileLayoutCache(userId);
    const usedCache = Boolean(cached);
    if (cached) {
      setProfile(cached.profile);
      setResolvedId(cached.resolvedId);
      setFriendsCount(cached.friendsCount);
      setFriendshipStatus(cached.friendshipStatus);
      setAccessDenied(cached.accessDenied);
      setBlocked(cached.blocked);
      setLoading(false);
      loadedProfileRef.current = { id: cached.resolvedId, username: cached.profile.username };
    }

    let cancelled = false;
    if (!usedCache) {
      setLoading(true);
      setAccessDenied(false);
      setBlocked(false);
      setProfile(null);
      setResolvedId('');
      setFriendsCount(0);
      setFriendshipStatus(null);
    }

    const run = async () => {
      try {
        const profileData = (await authService.getUser(userId)) as AuthUser;

        const id: string = profileData.id;

        if (profileData.blocked) {
          if (cancelled) return;
          setProfile(profileData);
          setResolvedId(id);
          setBlocked(true);
          setAccessDenied(true);
          loadedProfileRef.current = { id, username: profileData.username };
          return;
        }

        const fetchStatusPromise = (!currentUser || currentUser.id === id)
          ? Promise.resolve(null)
          : friendService.getStatus(currentUser.id, id);

        const [friendsRes, statusRes] = await Promise.all([
          friendService.getFriends(id),
          fetchStatusPromise,
        ]);

        if (cancelled) return;

        setProfile(profileData);
        setResolvedId(id);
        setFriendsCount(friendsRes.length);
        setFriendshipStatus(statusRes);
        loadedProfileRef.current = { id, username: profileData.username };

        const contentRestricted = Boolean(profileData.profileContentRestricted);
        if (contentRestricted) {
          logProfileTabRouteChange(location.pathname, {
            resolvedId: id,
            accessDenied: true,
            profileKey: profileData.username || id,
          });
        }
        setAccessDenied(contentRestricted);

        const profileKey = profileData.username || id;
        const basePath = `/profile/${profileKey}`;
        const currentPath = locationRef.current.pathname;

        // Redirect /profile/UUID → /profile/username; giữ tab con (/about, /photos…)
        if (profileData.username && userId !== profileData.username) {
          const subPath = contentRestricted
            ? ''
            : extractProfileSubPath(currentPath, userId, profileKey, id);
          const target = `${basePath}${subPath}`;
          if (currentPath !== target) {
            logProfileTabRedirect('canonical-username', currentPath, target);
            navigate(
              { pathname: target, search: locationRef.current.search },
              { replace: true },
            );
          }
        } else if (contentRestricted && currentPath !== basePath) {
          logProfileTabRedirect('profile-content-restricted', currentPath, basePath);
          navigate({ pathname: basePath, search: locationRef.current.search }, { replace: true });
        }
      } catch (err) {
        logProfileTabError('layout', 'load-profile', err, {
          userId,
          pathname: location.pathname,
          hasSession: Boolean(currentUser),
        });
        if (cancelled) return;

        const status = (err as Error & { status?: number })?.status;
        if (status === 403) {
          logProfileTabError('layout', 'http-403', err, {
            userId,
            hint: '403 có thể do thiếu JWT hoặc bị chặn quyền — không nhầm với profileContentRestricted',
          });
          setAccessDenied(true);
          return;
        }

        if (currentUser && (userId === currentUser.id || userId === currentUser.username)) {
          setProfile(currentUser);
          setResolvedId(currentUser.id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [userId, currentUser?.id]);

  // Re-fetch friendship status whenever any friend action fires (accept/reject/unfriend from anywhere)
  React.useEffect(() => {
    if (!currentUser?.id || !resolvedId || isOwnProfile) return;
    const refetch = async () => {
      try {
        const [statusRes, friendsRes] = await Promise.all([
          friendService.getStatus(currentUser.id, resolvedId),
          friendService.getFriends(resolvedId),
        ]);
        setFriendshipStatus(statusRes);
        setFriendsCount(friendsRes.length);
      } catch (err) {
        logProfileTabError('layout', 'refetch-friendship', err, { resolvedId });
      }
    };
    window.addEventListener(FRIENDSHIP_CHANGED_EVENT, refetch);
    return () => window.removeEventListener(FRIENDSHIP_CHANGED_EVENT, refetch);
  }, [currentUser?.id, resolvedId, isOwnProfile]);

  const handleAvatarUpload = async (file: File) => {
    if (!currentUser) return;
    const updatedUser = await authService.uploadAvatar(currentUser.id, file);
    authService.saveCurrentUser(updatedUser);
    setProfile(updatedUser);
  };

  const handleCoverUpload = async (file: File) => {
    if (!currentUser) return;
    const updatedUser = await authService.uploadCoverPhoto(currentUser.id, file);
    authService.saveCurrentUser(updatedUser);
    setProfile(updatedUser);
  };

  const profilePathKey = profile?.username || userId;

  const userProfile = buildProfileDisplay(profile, {
    currentUser,
    fallbackUserId: resolvedId || userId,
    preferCurrentUserMedia: isOwnProfile,
  });

  const context: ProfileLayoutContext = {
    profile,
    setProfile,
    resolvedId,
    isOwnProfile,
    friendsCount,
    friendshipStatus,
    setFriendshipStatus,
    loading,
    onEditClick: () => setIsEditOpen(true),
  };

  if (blocked) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-14">
          <div className="mx-auto max-w-[680px] px-4 py-16">
            <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-14 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Không thể xem trang cá nhân này</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Nội dung hiện không khả dụng. Điều này có thể do bạn và người dùng này đã chặn nhau.
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-6 rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-14">
        <ProfileHeader
          coverPhoto={loading ? undefined : userProfile.coverPhoto}
          avatar={loading ? undefined : userProfile.avatar}
          fullName={getProfileHeaderName(userProfile)}
          username={userProfile.username}
          friendsCount={friendsCount}
          isOwnProfile={isOwnProfile}
          loading={loading}
          profileUserId={profile?.id || resolvedId || undefined}
          friendshipStatus={friendshipStatus}
          onFriendshipStatusChange={setFriendshipStatus}
          onEditClick={isOwnProfile ? () => setIsEditOpen(true) : undefined}
          onAvatarUpload={isOwnProfile ? handleAvatarUpload : undefined}
          onCoverUpload={isOwnProfile ? handleCoverUpload : undefined}
        />
        {accessDenied ? (
          <div className="mx-auto max-w-[680px] px-4 py-10">
            <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center shadow-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Lock className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{vi.profile.accessDeniedTitle}</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{vi.profile.accessDeniedDesc}</p>
            </div>
          </div>
        ) : (
          <>
            <ProfileTabs profileKey={profilePathKey} />
            <Outlet context={context} />
          </>
        )}
      </div>
      {isOwnProfile && profile && (
        <EditProfileDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          initialData={buildEditProfileInitialData(profile)}
          onSaved={(updatedUser) => setProfile(updatedUser)}
        />
      )}
    </div>
  );
}
