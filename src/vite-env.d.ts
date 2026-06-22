/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_MODERATION_URL?: string;
  readonly VITE_WEBRTC_ICE_SERVERS?: string;
  readonly VITE_STUN_URLS?: string;
  readonly VITE_TURN_URLS?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
  readonly VITE_WEBRTC_FORCE_RELAY?: string;
  readonly VITE_WEBRTC_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
