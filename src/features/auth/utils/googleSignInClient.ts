export type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

export function loadGoogleIdentityScript(locale: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const scriptSrc = `https://accounts.google.com/gsi/client?hl=${locale}`;
    let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`);
    if (!script) {
      script = document.querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi/client"]');
    }

    const onLoad = () => resolve();
    const onError = () => reject(new Error('Không tải được Google Identity Services'));

    if (script) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      return;
    }

    script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    script.onload = onLoad;
    script.onerror = onError;
    document.head.appendChild(script);
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
  });
}

export function requestGoogleAccountPicker(tokenClient: GoogleTokenClient) {
  window.google?.accounts?.id?.disableAutoSelect?.();
  tokenClient.requestAccessToken({ prompt: 'select_account' });
}
