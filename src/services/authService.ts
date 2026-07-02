import { api } from './api';

const AUTH_USER_KEY = 'authUser';
export const AUTH_STORAGE_KEY = AUTH_USER_KEY;
const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Profile cache without time expiry — session cookies on the backend control real auth lifetime. */
const BROWSER_SESSION_EXPIRES_AT = 0;
export const AUTH_USER_CHANGED_EVENT = 'auth-user-changed';

const notifyAuthUserChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_USER_CHANGED_EVENT));
};

interface StoredAuthUser {
  user: AuthUser;
  /** >0 = remember-me expiry timestamp; 0 = browser session profile cache. */
  expiresAt: number;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  token?: string;
  refreshToken?: string;
  accountStatus?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'DELETED';
  blockedReason?: string;
  lockedUntil?: string;
  hasPassword?: boolean;
  bio?: string;
  gender?: string;
  location?: string;
  hometown?: string;
  relationshipStatus?: string;
  school?: string;
  workplace?: string;
  jobTitle?: string;
  phoneNumber?: string;
  website?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  profileContentRestricted?: boolean;
  blocked?: boolean;
  requiresProfileSetup?: boolean;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
  /** True when the user is currently under a temporary comment ban. */
  commentLocked?: boolean;
  /** True when the user is currently under a temporary post ban. */
  postLocked?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  username: string;
  dateOfBirth: string;
  gender: string;
  location?: string;
  bio?: string;
  hometown?: string;
  relationshipStatus?: string;
  school?: string;
  workplace?: string;
  jobTitle?: string;
  phoneNumber?: string;
  website?: string;
}

export interface GoogleCompleteRegisterData {
  idToken?: string;
  accessToken?: string;
  fullName: string;
  username: string;
  dateOfBirth: string;
  gender: string;
  location?: string;
  bio?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Strip JWT secrets before persisting profile — tokens live in HttpOnly cookies. */
function sanitizeStoredUser(user: AuthUser): AuthUser {
  const { token: _t, refreshToken: _r, ...rest } = user;
  return rest;
}

/** Remove legacy JWT fields from existing storage (one-time cleanup on read). */
function stripLegacyTokensFromStorage() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as StoredAuthUser | AuthUser;
    if (typeof parsed === 'object' && parsed !== null && 'user' in parsed && 'expiresAt' in parsed) {
      const payload = parsed as StoredAuthUser;
      if (payload.user?.token || payload.user?.refreshToken) {
        payload.user = sanitizeStoredUser(payload.user);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload));
      }
    } else {
      const user = parsed as AuthUser;
      if (user.token || user.refreshToken) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sanitizeStoredUser(user)));
      }
    }
  } catch {
    /* ignore */
  }
}

function normalizeStoredPayload(raw: string): StoredAuthUser | null {
  try {
    const parsed = JSON.parse(raw) as StoredAuthUser | AuthUser;
    if (typeof parsed === 'object' && parsed !== null && 'user' in parsed && 'expiresAt' in parsed) {
      return parsed as StoredAuthUser;
    }
    return {
      user: parsed as AuthUser,
      expiresAt: BROWSER_SESSION_EXPIRES_AT,
    };
  } catch {
    return null;
  }
}

function isRememberMeExpired(expiresAt: number) {
  return expiresAt > 0 && expiresAt <= Date.now();
}

/** sessionStorage was tab-scoped — migrate once so one browser shares one account. */
function migrateSessionAuthToLocalStorage() {
  const sessionRaw = sessionStorage.getItem(AUTH_USER_KEY);
  if (!sessionRaw) return;

  if (!localStorage.getItem(AUTH_USER_KEY)) {
    const payload = normalizeStoredPayload(sessionRaw);
    if (payload) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload));
    }
  }
  sessionStorage.removeItem(AUTH_USER_KEY);
}

function readStoredAuthUser(): StoredAuthUser | null {
  migrateSessionAuthToLocalStorage();
  const localRaw = localStorage.getItem(AUTH_USER_KEY);
  if (!localRaw) return null;

  const payload = normalizeStoredPayload(localRaw);
  if (!payload) {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }

  if (isRememberMeExpired(payload.expiresAt)) {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }

  return payload;
}

function writeStoredAuthUser(user: AuthUser, rememberMe: boolean) {
  const payload: StoredAuthUser = {
    user: sanitizeStoredUser(user),
    expiresAt: rememberMe ? Date.now() + REMEMBER_ME_TTL_MS : BROWSER_SESSION_EXPIRES_AT,
  };
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload));
  sessionStorage.removeItem(AUTH_USER_KEY);
  notifyAuthUserChanged();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_USER_KEY) {
      notifyAuthUserChanged();
    }
  });
}

export const authService = {
  updateProfile: (id: string, data: Partial<RegisterData>) => {
    if (!id || id === 'undefined') return Promise.reject(new Error('Invalid user ID'));
    return api.put<AuthUser>(`/users/${id}`, data);
  },
  getUserById: (id: string, options?: { skipSessionRedirect?: boolean }) => {
    if (!id || id === 'undefined') return Promise.reject(new Error('Invalid user ID'));
    return api.get<AuthUser>(`/users/${id}`, options);
  },
  /** Resolves profile by UUID or username without a failed UUID request first. */
  getUser: (identifier: string) => {
    if (!identifier || identifier === 'undefined') {
      return Promise.reject(new Error('Invalid user identifier'));
    }
    return api.get<AuthUser>(`/users/${encodeURIComponent(identifier)}`);
  },

  uploadAvatar: (id: string, file: File) => {
    if (!id || id === 'undefined') return Promise.reject(new Error('Invalid user ID'));
    const formData = new FormData();
    formData.append('file', file);
    return api.postMultipart<AuthUser>(`/users/${id}/avatar`, formData);
  },

  uploadCoverPhoto: (id: string, file: File) => {
    if (!id || id === 'undefined') return Promise.reject(new Error('Invalid user ID'));
    const formData = new FormData();
    formData.append('file', file);
    return api.postMultipart<AuthUser>(`/users/${id}/cover`, formData);
  },
  getUserByUsername: (username: string) => {
    if (!username || username === 'undefined') return Promise.reject(new Error('Invalid username'));
    return api.get<AuthUser>(`/users/username/${username}`);
  },
  checkEmailExists: (email: string) =>
    api.get<{ exists: boolean }>(`/auth/check-email?email=${encodeURIComponent(email)}`),
  checkUsernameExists: (username: string) =>
    api.get<{ exists: boolean }>(`/auth/check-username?username=${encodeURIComponent(username)}`),

  sendOtp: (email: string) =>
    api.post<{ message: string }>('/auth/send-otp', { email }),

  verifyOtp: (email: string, otp: string) =>
    api.post<{ verified: boolean }>('/auth/verify-otp', { email, otp }),

  resetPassword: (email: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { email, newPassword }),

  register: (data: RegisterData) =>
    api.post<AuthUser>('/auth/register', data),

  login: (email: string, password: string, rememberMe?: boolean) =>
    api.post<AuthUser>('/auth/login', { email, password, rememberMe: !!rememberMe }),

  verifyTwoFactorLogin: (twoFactorToken: string, otp: string) =>
    api.post<AuthUser>('/auth/verify-2fa-login', { twoFactorToken, otp }),

  resendTwoFactorLogin: (twoFactorToken: string) =>
    api.post<{ message: string }>('/auth/resend-2fa-login', { twoFactorToken }),

  changePassword: (email: string, oldPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { email, oldPassword, newPassword }),

  setPassword: (email: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/set-password', { email, newPassword }),

  googleLogin: (credential: { idToken?: string; accessToken?: string }) =>
    api.post<AuthUser>('/auth/google-login', credential),

  googleCompleteRegister: (data: GoogleCompleteRegisterData) =>
    api.post<AuthUser>('/auth/google-complete-register', data),

  requestAccountReview: (email: string, reason: string) =>
    api.post<{ message: string }>('/auth/request-account-review', { email, reason }),

  saveCurrentUser: (user: AuthUser, rememberMe?: boolean) => {
    const currentPayload = readStoredAuthUser();
    const sameAccount = currentPayload?.user?.id === user.id;
    const mergedUser: AuthUser = sanitizeStoredUser({
      ...(sameAccount ? currentPayload?.user ?? {} : {}),
      ...user,
    });

    if (rememberMe === true) {
      writeStoredAuthUser(mergedUser, true);
      return;
    }

    if (rememberMe === false) {
      writeStoredAuthUser(mergedUser, false);
      return;
    }

    const keepRememberMe =
      currentPayload !== null &&
      currentPayload.expiresAt > 0 &&
      !isRememberMeExpired(currentPayload.expiresAt);
    writeStoredAuthUser(mergedUser, keepRememberMe);
  },

  getCurrentUser: (): AuthUser | null => {
    stripLegacyTokensFromStorage();
    return readStoredAuthUser()?.user ?? null;
  },

  logout: async () => {
    try {
      await api.post<{ message?: string }>('/auth/logout', {});
    } catch {
      // Still clear local session if network fails
    } finally {
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      window.google?.accounts?.id?.disableAutoSelect?.();
      notifyAuthUserChanged();
    }
  },
};
