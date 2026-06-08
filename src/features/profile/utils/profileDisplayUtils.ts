import type { AuthUser } from '@/services/authService';

export const PROFILE_DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';

export const PROFILE_DEFAULT_COVER =
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

export interface ProfileDisplayData {
  id: string;
  fullName: string;
  username: string;
  avatar: string;
  coverPhoto: string;
  location: string;
  school: string;
  workplace: string;
  jobTitle: string;
  hometown: string;
  relationship: string;
  bio: string;
  dateOfBirth?: string;
  gender?: string;
}

export function resolveRouteProfileUserId(
  routeUserId: string | undefined,
  currentUser: AuthUser | null,
): string {
  if (!routeUserId || routeUserId === 'undefined') {
    return currentUser?.id || '';
  }
  return routeUserId;
}

export function isOwnProfileUser(
  currentUser: AuthUser | null | undefined,
  options: {
    resolvedProfileId?: string;
    routeUserId?: string;
  },
): boolean {
  if (!currentUser) return false;
  if (options.resolvedProfileId) {
    return currentUser.id === options.resolvedProfileId;
  }
  const route = options.routeUserId || '';
  return route === currentUser.id || route === currentUser.username;
}

export function buildProfileDisplay(
  profile: AuthUser | null | undefined,
  options?: {
    currentUser?: AuthUser | null;
    fallbackUserId?: string;
    preferCurrentUserMedia?: boolean;
  },
): ProfileDisplayData {
  const currentUser = options?.currentUser;
  const isSelf =
    !!currentUser &&
    !!profile?.id &&
    profile.id === currentUser.id;

  const useCurrentUserMedia = options?.preferCurrentUserMedia ?? isSelf;

  return {
    id: profile?.id || options?.fallbackUserId || '',
    fullName: profile?.fullName || (isSelf ? currentUser?.fullName : '') || '',
    username: profile?.username || (isSelf ? currentUser?.username : '') || '',
    avatar:
      profile?.avatarUrl ||
      (useCurrentUserMedia ? currentUser?.avatarUrl : undefined) ||
      PROFILE_DEFAULT_AVATAR,
    coverPhoto:
      profile?.coverPhotoUrl ||
      (useCurrentUserMedia ? currentUser?.coverPhotoUrl : undefined) ||
      PROFILE_DEFAULT_COVER,
    location: profile?.location || '',
    school: profile?.school || '',
    workplace: profile?.workplace || '',
    jobTitle: profile?.jobTitle || '',
    hometown: profile?.hometown || '',
    relationship: profile?.relationshipStatus || '',
    bio: profile?.bio || '',
    dateOfBirth: profile?.dateOfBirth,
    gender: profile?.gender,
  };
}

/** Tên hiển thị trên header — không dùng cho form chỉnh sửa. */
export function hasProfileText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

export function getProfileHeaderName(
  display: Pick<ProfileDisplayData, 'fullName' | 'username'>,
): string {
  const name = display.fullName?.trim();
  if (name) return name;
  const username = display.username?.trim();
  if (username) return username;
  return 'Người dùng';
}

export function buildEditProfileInitialData(profile: AuthUser) {
  const display = buildProfileDisplay(profile);
  return {
    fullName: profile.fullName || '',
    location: profile.location || '',
    hometown: profile.hometown || '',
    school: profile.school || '',
    workplace: profile.workplace || '',
    jobTitle: profile.jobTitle || '',
    relationship: profile.relationshipStatus || '',
    bio: profile.bio || '',
    dateOfBirth: profile.dateOfBirth,
    avatarUrl: profile.avatarUrl || display.avatar,
    coverPhotoUrl: profile.coverPhotoUrl || display.coverPhoto,
  };
}
