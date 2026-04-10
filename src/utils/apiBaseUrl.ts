const DEFAULT_API_ORIGIN = 'http://localhost:8080';

function normalizeOrigin(origin?: string) {
  if (!origin) {
    return DEFAULT_API_ORIGIN;
  }

  return origin.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  return `${normalizeOrigin(import.meta.env.VITE_API_URL)}/api`;
}

/** ws://localhost:8080 hoặc wss://... tuỳ môi trường */
export function getWsBaseUrl() {
  return normalizeOrigin(import.meta.env.VITE_API_URL).replace(/^http/, 'ws');
}
