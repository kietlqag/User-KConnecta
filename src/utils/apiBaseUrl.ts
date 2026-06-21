const DEFAULT_API_ORIGIN = 'http://localhost:8080';

function normalizeOrigin(origin?: string) {
  if (!origin) {
    return DEFAULT_API_ORIGIN;
  }

  return origin.replace(/\/+$/, '').replace(/\/api\/?$/, '');
}

export function getApiBaseUrl() {
  if (!import.meta.env.VITE_API_URL) {
    return '/api';
  }
  return `${normalizeOrigin(import.meta.env.VITE_API_URL)}/api`;
}

/** WebSocket base URL — same host proxy in dev, backend origin in production */
export function getWsBaseUrl() {
  const pageProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const pageHost = `${pageProtocol}//${window.location.host}`;

  if (!import.meta.env.VITE_API_URL) {
    return pageHost;
  }

  const apiOrigin = normalizeOrigin(import.meta.env.VITE_API_URL);

  // Local dev: route WS through Vite proxy (/ws) instead of cross-origin :8080
  if (import.meta.env.DEV && /^https?:\/\/(localhost|127\.0\.0\.1):8080$/i.test(apiOrigin)) {
    return pageHost;
  }

  return apiOrigin.replace(/^http/i, 'ws');
}
