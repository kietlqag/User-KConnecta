import axios from 'axios';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';
import { authService } from '@/services/authService';

// One in-flight refresh for concurrent 401s.
let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  try {
    await axios.post(
      `${getApiBaseUrl()}/auth/refresh`,
      {},
      { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const data = err.response.data;
      if (typeof data === 'object' && data !== null && (data as { accountStatus?: string }).accountStatus === 'BLOCKED') {
        sessionStorage.setItem('blockedInfo', JSON.stringify(data));
      }
    }
    throw err;
  }
}

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 45000,
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? '';
      const isAuthEndpoint = url.startsWith('/auth/');

      const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
      const shouldTryRefresh =
        (status === 401 || status === 403)
        && !isAuthEndpoint
        && original
        && !original._retried
        && authService.getCurrentUser();

      if (shouldTryRefresh) {
        try {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
          }
          await refreshPromise;
          original._retried = true;
          if (original.headers) {
            delete original.headers.Authorization;
          }
          return axiosInstance(original);
        } catch {
          // refresh failed → logout below
        }
      }

      if ((status === 401 || status === 403) && !isAuthEndpoint) {
        const data = error.response?.data;
        const locked =
          typeof data === 'object' && data !== null &&
          (data as { accountStatus?: string }).accountStatus === 'BLOCKED';
        localStorage.removeItem('authUser');
        sessionStorage.removeItem('authUser');
        if (locked) {
          sessionStorage.setItem('blockedInfo', JSON.stringify(data));
        }
        window.location.href = '/auth/login';
        return Promise.reject(
          new Error(locked ? 'Tài khoản của bạn đã bị khóa.' : 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'),
        );
      }

      const data = error.response?.data;
      const message =
        (typeof data === 'object' && data !== null && 'message' in data ? (data as { message?: string }).message : null)
        || (error.code === 'ECONNABORTED'
          ? 'Server phản hồi quá chậm. Backend có thể đang khởi động — vui lòng đợi vài giây rồi thử lại.'
          : null)
        || error.message
        || 'Có lỗi xảy ra';
      const err = new Error(message) as Error & { status?: number };
      err.status = status;
      return Promise.reject(err);
    }
    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(path: string, options?: { signal?: AbortSignal }) =>
    axiosInstance.get<T>(path, options).then(r => r.data),

  post: <T>(path: string, body: unknown) =>
    axiosInstance.post<T>(path, body).then(r => r.data),

  put: <T>(path: string, body: unknown) =>
    axiosInstance.put<T>(path, body).then(r => r.data),

  patch: <T>(path: string, body?: unknown) =>
    axiosInstance.patch<T>(path, body).then(r => r.data),

  delete: <T>(path: string, body?: unknown) =>
    axiosInstance.delete<T>(path, body !== undefined ? { data: body } : undefined).then(r => r.data),

  postMultipart: <T>(path: string, formData: FormData, signal?: AbortSignal) =>
    axiosInstance.post<T>(path, formData, { signal, headers: { 'Content-Type': undefined } }).then(r => r.data),

  putMultipart: <T>(path: string, formData: FormData, signal?: AbortSignal) =>
    axiosInstance.put<T>(path, formData, { signal, headers: { 'Content-Type': undefined } }).then(r => r.data),
};
