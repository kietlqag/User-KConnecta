export type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

export function loadGoogleIdentityScript(locale: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    // Poll for readiness as a fallback: when an existing <script> already finished
    // loading (its `load` event fired earlier), newly-attached listeners never run.
    // This happens under React StrictMode where the effect mounts/cleans up twice.
    const POLL_INTERVAL_MS = 50;
    const POLL_TIMEOUT_MS = 10000;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let settled = false;

    const cleanup = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const onReady = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onLoad = () => {
      if (window.google?.accounts?.oauth2) {
        onReady();
      }
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Không tải được Google Identity Services'));
    };

    const startPolling = () => {
      const startedAt = Date.now();
      pollTimer = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          onReady();
        } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          onError();
        }
      }, POLL_INTERVAL_MS);
    };

    const scriptSrc = `https://accounts.google.com/gsi/client?hl=${locale}`;
    let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`);
    if (!script) {
      script = document.querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi/client"]');
    }

    if (script) {
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      // The script may already be loaded; polling guarantees we still resolve.
      startPolling();
      return;
    }

    script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.head.appendChild(script);
    startPolling();
  });
}

export function createGoogleTokenClient(
  clientId: string,
  callback: (accessToken: string) => void,
  onError?: (message: string) => void,
): GoogleTokenClient {
  return window.google!.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'openid email profile',
    callback: (response) => {
      if (response.error) {
        if (response.error === 'popup_closed_by_user') return;
        onError?.(response.error_description || response.error || 'Đăng nhập Google thất bại');
        return;
      }
      if (!response.access_token) {
        onError?.('Google không trả về access token');
        return;
      }
      callback(response.access_token);
    },
    // Fires for non-OAuth issues: popup blocked, popup failed to open, or the
    // current origin is not authorized for this client ID. Without this, such
    // failures are only logged to the console and the button seems unresponsive.
    error_callback: (error: { type?: string; message?: string }) => {
      if (error?.type === 'popup_closed') return;
      if (error?.type === 'popup_failed_to_open') {
        onError?.('Trình duyệt đã chặn cửa sổ Google. Vui lòng cho phép pop-up rồi thử lại.');
        return;
      }
      onError?.(
        error?.message ||
          'Không mở được đăng nhập Google. Kiểm tra origin đã được cấp phép trong Google Cloud Console.',
      );
    },
  });
}

export function requestGoogleAccountPicker(tokenClient: GoogleTokenClient) {
  window.google?.accounts?.id?.disableAutoSelect?.();
  tokenClient.requestAccessToken({ prompt: 'select_account' });
}
