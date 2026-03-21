import { api } from './api';

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
  sendOtp: (email: string) =>
    api.post<{ message: string }>('/auth/send-otp', { email }),

  verifyOtp: (email: string, otp: string) =>
    api.post<{ verified: boolean }>('/auth/verify-otp', { email, otp }),

  register: (data: RegisterData) =>
    api.post<AuthUser>('/auth/register', data),

  login: (email: string, password: string) =>
    api.post<AuthUser>('/auth/login', { email, password }),
};
