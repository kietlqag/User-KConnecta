export interface GoogleSignupSession {
  googleSignup: true;
  googleIdToken?: string;
  googleAccessToken?: string;
  email: string;
  suggestedName?: string;
}

const STORAGE_KEY = 'kconnecta.googleSignupSession';

export function decodeGoogleIdTokenPayload(idToken: string): {
  email?: string;
  name?: string;
  picture?: string;
} {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='));
    const parsed = JSON.parse(json) as { email?: string; name?: string; picture?: string };
    return {
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      picture: typeof parsed.picture === 'string' ? parsed.picture : undefined,
    };
  } catch {
    return {};
  }
}

export function saveGoogleSignupSession(session: GoogleSignupSession) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readGoogleSignupSession(): GoogleSignupSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleSignupSession>;
    if (!parsed.googleSignup || !parsed.email) return null;
    if (!parsed.googleIdToken && !parsed.googleAccessToken) return null;
    return {
      googleSignup: true,
      googleIdToken: parsed.googleIdToken,
      googleAccessToken: parsed.googleAccessToken,
      email: parsed.email,
      suggestedName: parsed.suggestedName,
    };
  } catch {
    return null;
  }
}

export function clearGoogleSignupSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function resolveGoogleSignupSession(
  locationState: Partial<GoogleSignupSession> | null | undefined,
): GoogleSignupSession | null {
  const fromToken = locationState?.googleIdToken
    ? decodeGoogleIdTokenPayload(locationState.googleIdToken)
    : {};
  const email = locationState?.email?.trim() || fromToken.email?.trim() || '';

  const hasCredential = Boolean(locationState?.googleIdToken || locationState?.googleAccessToken);
  if (locationState?.googleSignup && hasCredential && email) {
    const session: GoogleSignupSession = {
      googleSignup: true,
      googleIdToken: locationState.googleIdToken,
      googleAccessToken: locationState.googleAccessToken,
      email,
      suggestedName: locationState.suggestedName,
    };
    saveGoogleSignupSession(session);
    return session;
  }

  return readGoogleSignupSession();
}
