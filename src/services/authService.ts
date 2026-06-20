import { api } from './api';

const AUTH_USER_KEY = 'authUser';
const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const AUTH_USER_CHANGED_EVENT = 'auth-user-changed';

const notifyAuthUserChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_USER_CHANGED_EVENT));
};

interface StoredAuthUser {
  user: AuthUser;
  expiresAt: number;
}

interface CurrentAuthState {
  user: AuthUser | null;
  storage: 'local' | 'session' | null;
  expiresAt: number | null;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  token?: string;
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
  dateOfBirth?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  requiresProfileSetup?: boolean;
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
}

export interface GoogleCompleteRegisterData {
  idToken: string;
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

export const authService = {
  updateProfile: (id: string, data: Partial<RegisterData>) => {
    if (!id || id === 'undefined') return Promise.reject(new Error('Invalid user ID'));
    return api.put<AuthUser>(`/users/${id}`, data);
  },
  getUserById: (id: string) => {
    if (!id || id === 'undefined') return Promise.reject(new Error('Invalid user ID'));
    return api.get<AuthUser>(`/users/${id}`);
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

  login: (email: string, password: string) =>
    api.post<AuthUser>('/auth/login', { email, password }),

  changePassword: (email: string, oldPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { email, oldPassword, newPassword }),

  setPassword: (email: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/set-password', { email, newPassword }),

  googleLogin: (idToken: string) =>
    api.post<AuthUser>('/auth/google-login', { idToken }),

  googleCompleteRegister: (data: GoogleCompleteRegisterData) =>
    api.post<AuthUser>('/auth/google-complete-register', data),

  requestAccountReview: (email: string, reason: string) =>
    api.post<{ message: string }>('/auth/request-account-review', { email, reason }),

  saveCurrentUser: (user: AuthUser, rememberMe?: boolean) => {
    const readCurrentState = (): CurrentAuthState => {
      const localRaw = localStorage.getItem(AUTH_USER_KEY);
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw) as StoredAuthUser | AuthUser;
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'user' in parsed &&
            'expiresAt' in parsed
          ) {
            return {
              user: parsed.user,
              storage: 'local',
              expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null,
            };
          }

          return {
            user: parsed as AuthUser,
            storage: 'local',
            expiresAt: null,
          };
        } catch {
          // ignore parse error and continue reading session
        }
      }

      const sessionRaw = sessionStorage.getItem(AUTH_USER_KEY);
      if (sessionRaw) {
        try {
          return {
            user: JSON.parse(sessionRaw) as AuthUser,
            storage: 'session',
            expiresAt: null,
          };
        } catch {
          // ignore parse error and fallback to empty state
        }
      }

      return { user: null, storage: null, expiresAt: null };
    };

    const currentState = readCurrentState();
    const mergedUser: AuthUser = {
      ...(currentState.user ?? {}),
      ...user,
      token: user.accountStatus === 'BLOCKED' ? undefined : user.token ?? currentState.user?.token,
    };

    const targetStorage: 'local' | 'session' =
      rememberMe === true
        ? 'local'
        : rememberMe === false
          ? 'session'
          : currentState.storage ?? 'session';

    if (targetStorage === 'local') {
      const payload: StoredAuthUser = {
        user: mergedUser,
        expiresAt:
          currentState.storage === 'local' &&
          currentState.expiresAt !== null &&
          currentState.expiresAt > Date.now()
            ? currentState.expiresAt
            : Date.now() + REMEMBER_ME_TTL_MS,
      };
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload));
      sessionStorage.removeItem(AUTH_USER_KEY);
      notifyAuthUserChanged();
      return;
    }

    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(mergedUser));
    localStorage.removeItem(AUTH_USER_KEY);
    notifyAuthUserChanged();
  },

  getCurrentUser: (): AuthUser | null => {
    const localUser = localStorage.getItem(AUTH_USER_KEY);
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser) as StoredAuthUser | AuthUser;

        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'user' in parsed &&
          'expiresAt' in parsed
        ) {
          if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
            localStorage.removeItem(AUTH_USER_KEY);
          } else {
            return parsed.user;
          }
        } else {
          authService.saveCurrentUser(parsed as AuthUser, true);
          return parsed as AuthUser;
        }
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }

    const sessionUser = sessionStorage.getItem(AUTH_USER_KEY);
    if (!sessionUser) return null;

    try {
      return JSON.parse(sessionUser) as AuthUser;
    } catch {
      sessionStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  },

  logout: async () => {
    const token = authService.getCurrentUser()?.token;
    try {
      if (token) {
        await api.post<{ message?: string }>('/auth/logout', {});
      }
    } catch {
      // Vẫn đăng xuất cục bộ nếu token hết hạn hoặc mạng lỗi
    } finally {
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      notifyAuthUserChanged();
    }
  },
};
