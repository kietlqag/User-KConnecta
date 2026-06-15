const DEFAULT_API_ORIGIN = 'http://localhost:8080';

function normalizeOrigin(origin?: string) {
  if (!origin) {
    return DEFAULT_API_ORIGIN;
  }

  return origin.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  if (!import.meta.env.VITE_API_URL) {
    return '/api';
  }
  return `${normalizeOrigin(import.meta.env.VITE_API_URL)}/api`;
}

/** ws:// pointing to the same host as the page when no VITE_API_URL (goes through Vite proxy /ws) */
export function getWsBaseUrl() {
  if (!import.meta.env.VITE_API_URL) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return normalizeOrigin(import.meta.env.VITE_API_URL).replace(/^http/, 'ws');
}
