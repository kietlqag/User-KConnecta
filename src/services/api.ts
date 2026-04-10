import { getApiBaseUrl } from '@/utils/apiBaseUrl';

const BASE_URL = getApiBaseUrl();

/** Đọc JWT trực tiếp từ storage để tránh circular dependency với authService */
function getToken(): string | null {
  try {
    const AUTH_KEY = 'authUser';
    for (const storage of [localStorage, sessionStorage]) {
      const raw = storage.getItem(AUTH_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      // StoredAuthUser shape: { user: AuthUser, expiresAt: number }
      const token = parsed?.user?.token ?? parsed?.token ?? null;
      if (token) return token;
    }
  } catch { /* ignore */ }
  return null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle 401/403: token hết hạn hoặc không hợp lệ → về trang login
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('authUser');
    sessionStorage.removeItem('authUser');
    window.location.href = '/login';
    throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
  }

  // Parse JSON an toàn — Spring có thể trả body rỗng
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || 'Có lỗi xảy ra');
  }

  return data as T;
}

async function requestMultipart<T>(path: string, formData: FormData, method = 'POST'): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    body: formData,
    headers,
    // No Content-Type — browser sets multipart boundary automatically
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Có lỗi xảy ra');
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),

  postMultipart: <T>(path: string, formData: FormData) =>
    requestMultipart<T>(path, formData, 'POST'),

  putMultipart: <T>(path: string, formData: FormData) =>
    requestMultipart<T>(path, formData, 'PUT'),
};
