import axios from 'axios';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';
import { authService } from '@/services/authService';

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

function getRefreshToken(): string | null {
  try {
    const AUTH_KEY = 'authUser';
    for (const storage of [localStorage, sessionStorage]) {
      const raw = storage.getItem(AUTH_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const rt = parsed?.user?.refreshToken ?? parsed?.refreshToken ?? null;
      if (rt) return rt;
    }
  } catch { /* ignore */ }
  return null;
}

// Đảm bảo nhiều request 401 đồng thời chỉ kích hoạt MỘT lần refresh.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new Error('No refresh token');
  // Dùng axios "trần" (không qua axiosInstance) để KHÔNG đi vào interceptor → tránh đệ quy.
  const resp = await axios.post(
    `${getApiBaseUrl()}/auth/refresh`,
    { refreshToken: rt },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const data = resp.data as { token: string; refreshToken?: string };
  authService.updateTokens({ token: data.token, refreshToken: data.refreshToken });
  return data.token;
}

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 45000,
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
  async error => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? '';
      const isAuthEndpoint = url.startsWith('/auth/');

      // Access token hết hạn → thử refresh MỘT lần rồi retry request gốc.
      const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
      if (status === 401 && !isAuthEndpoint && original && !original._retried && getRefreshToken()) {
        try {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
          }
          const newToken = await refreshPromise;
          original._retried = true;
          original.headers = original.headers ?? {};
          original.headers['Authorization'] = `Bearer ${newToken}`;
          return axiosInstance(original);
        } catch {
          // refresh thất bại → rơi xuống nhánh logout bên dưới
        }
      }

      if (status === 401 && !isAuthEndpoint) {
        const data = error.response?.data;
        const locked =
          typeof data === 'object' && data !== null &&
          (data as { accountStatus?: string }).accountStatus === 'BLOCKED';
        localStorage.removeItem('authUser');
        sessionStorage.removeItem('authUser');
        if (locked) {
          // Carry the lock reason to the login screen so a force-logged-out user can see why.
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

  delete: <T>(path: string) =>
    axiosInstance.delete<T>(path).then(r => r.data),

  postMultipart: <T>(path: string, formData: FormData, signal?: AbortSignal) =>
    axiosInstance.post<T>(path, formData, { signal, headers: { 'Content-Type': undefined } }).then(r => r.data),

  putMultipart: <T>(path: string, formData: FormData, signal?: AbortSignal) =>
    axiosInstance.put<T>(path, formData, { signal, headers: { 'Content-Type': undefined } }).then(r => r.data),
};
