import * as React from 'react';
import { Outlet, useNavigate, useLocation, useParams, useOutletContext } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const { t } = useTranslation();
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
    if (!userId || userId === 'undefined') { setLoading(false); return; }

    const loaded = loadedProfileRef.current;
    if (loaded && (userId === loaded.id || userId === loaded.username)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setAccessDenied(false);
    setProfile(null);
    setResolvedId('');
    setFriendsCount(0);
    setFriendshipStatus(null);

    const run = async () => {
      try {
        const profileData = (await authService.getUser(userId)) as AuthUser;

        const id: string = profileData.id;

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
          hasToken: Boolean(currentUser?.token),
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background">
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
          profileUserId={resolvedId || profile?.id || undefined}
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
              <h2 className="text-lg font-semibold text-foreground">{t('profile.accessDeniedTitle')}</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{t('profile.accessDeniedDesc')}</p>
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
