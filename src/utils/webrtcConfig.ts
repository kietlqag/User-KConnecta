type EnvValue = string | undefined;

function parseBoolean(value: EnvValue): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function splitCsv(value: EnvValue): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIceServer(value: string): RTCIceServer | null {
  const [urlsPart, usernamePart, credentialPart] = value.split('|').map((item) => item.trim());
  if (!urlsPart) return null;

  const urls = splitCsv(urlsPart);
  if (urls.length === 0) return null;

  const server: RTCIceServer = {
    urls: urls.length === 1 ? urls[0] : urls,
  };

  if (usernamePart && credentialPart) {
    server.username = usernamePart;
    server.credential = credentialPart;
  }

  return server;
}

function fromCompactIceList(value: EnvValue): RTCIceServer[] {
  if (!value) return [];

  return value
    .split(';')
    .map((item) => parseIceServer(item.trim()))
    .filter((item): item is RTCIceServer => item !== null);
}

export function buildRtcConfig(): RTCConfiguration {
  const forceRelay = parseBoolean(import.meta.env.VITE_WEBRTC_FORCE_RELAY);
  const compact = fromCompactIceList(import.meta.env.VITE_WEBRTC_ICE_SERVERS);
  if (compact.length > 0) {
    return {
      iceServers: compact,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: forceRelay ? 'relay' : 'all',
    };
  }

  const stunUrls = splitCsv(import.meta.env.VITE_STUN_URLS);
  const turnUrls = splitCsv(import.meta.env.VITE_TURN_URLS);
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const iceServers: RTCIceServer[] = [];

  if (stunUrls.length > 0) {
    iceServers.push({ urls: stunUrls.length === 1 ? stunUrls[0] : stunUrls });
  } else {
    iceServers.push({
      urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    });
  }

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: forceRelay ? 'relay' : 'all',
  };
}

export function isWebRtcDebugEnabled(): boolean {
  return parseBoolean(import.meta.env.VITE_WEBRTC_DEBUG);
}
