import * as React from 'react';
import { Outlet, useNavigate, useLocation, useParams, useOutletContext } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../home/components/Header';
import { EditProfileDialog, ProfileHeader, ProfileTabs } from '../components';
import { authService, type AuthUser } from '@/services/authService';
import { friendService, FRIENDSHIP_CHANGED_EVENT, type FriendshipStatusResponse } from '@/services/friendService';
import {
  buildEditProfileInitialData,
  buildProfileDisplay,
  getProfileHeaderName,
  isOwnProfileUser,
  resolveRouteProfileUserId,
} from '../utils/profileDisplayUtils';

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
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

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

  const isOwnProfile = isOwnProfileUser(currentUser, {
    resolvedProfileId: resolvedId,
    routeUserId: userId,
  });

  React.useEffect(() => {
    if (!userId || userId === 'undefined') { setLoading(false); return; }
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

        const contentRestricted = Boolean(profileData.profileContentRestricted);
        setAccessDenied(contentRestricted);

        const profileKey = profileData.username || id;
        const basePath = `/profile/${profileKey}`;

        // Redirect /profile/UUID → /profile/username; strip sub-routes when content is restricted
        if (profileData.username && userId !== profileData.username) {
          const subPath = contentRestricted ? '' : location.pathname.replace(`/profile/${userId}`, '');
          navigate(
            { pathname: `${basePath}${subPath}`, search: location.search },
            { replace: true },
          );
        } else if (contentRestricted && location.pathname !== basePath) {
          navigate({ pathname: basePath, search: location.search }, { replace: true });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        if (cancelled) return;

        const status = (err as Error & { status?: number })?.status;
        if (status === 403) {
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
      } catch {
        // ignore — stale UI is better than crashing
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
          profileUserId={userProfile.id}
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
