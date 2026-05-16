import axios from 'axios';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';

function getToken(): string | null {
  try {
    const AUTH_KEY = 'authUser';
    for (const storage of [localStorage, sessionStorage]) {
      const raw = storage.getItem(AUTH_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.user?.token ?? parsed?.token ?? null;
      if (token) return token;
    }
  } catch { /* ignore */ }
  return null;
}

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? '';
      const isAuthEndpoint = url.startsWith('/auth/');

      if ((status === 401 || status === 403) && !isAuthEndpoint) {
        localStorage.removeItem('authUser');
        sessionStorage.removeItem('authUser');
        window.location.href = '/auth/login';
        return Promise.reject(new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'));
      }

      const data = error.response?.data;
      const message =
        (typeof data === 'object' && data !== null && 'message' in data ? (data as { message?: string }).message : null)
        || error.message
        || 'Có lỗi xảy ra';
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(path: string) =>
    axiosInstance.get<T>(path).then(r => r.data),

  post: <T>(path: string, body: unknown) =>
    axiosInstance.post<T>(path, body).then(r => r.data),

  put: <T>(path: string, body: unknown) =>
    axiosInstance.put<T>(path, body).then(r => r.data),

  delete: <T>(path: string) =>
    axiosInstance.delete<T>(path).then(r => r.data),

  postMultipart: <T>(path: string, formData: FormData, signal?: AbortSignal) =>
    axiosInstance.post<T>(path, formData, { signal, headers: { 'Content-Type': undefined } }).then(r => r.data),

  putMultipart: <T>(path: string, formData: FormData, signal?: AbortSignal) =>
    axiosInstance.put<T>(path, formData, { signal, headers: { 'Content-Type': undefined } }).then(r => r.data),
};
