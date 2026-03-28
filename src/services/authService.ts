import { api } from './api';

const AUTH_USER_KEY = 'authUser';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
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
}

export const authService = {
  checkEmailExists: (email: string) =>
    api.get<{ exists: boolean }>(`/auth/check-email?email=${encodeURIComponent(email)}`),

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

  googleLogin: (idToken: string) =>
    api.post<AuthUser>('/auth/google-login', { idToken }),

  saveCurrentUser: (user: AuthUser, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    otherStorage.removeItem(AUTH_USER_KEY);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  getCurrentUser: (): AuthUser | null => {
    const raw = localStorage.getItem(AUTH_USER_KEY) ?? sessionStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  },
};
