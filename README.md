
  # User-UI-KConnecta

  This is a code bundle for User-UI-KConnecta. The original project is available at https://www.figma.com/design/nbOWtCRDVQ5InzpBFJk11j/User-UI-KConnecta.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Environment variables (important for call/video call on different networks)

  Create `.env` (local) or configure on Vercel:

  ```env
  VITE_API_URL=https://<your-render-backend-domain>
  # Option A: compact list, each server is urls|username|credential, servers separated by ;
  # STUN-only entry can omit username/credential
  # Example:
  # VITE_WEBRTC_ICE_SERVERS=stun:stun.l.google.com:19302;turn:turn.your-domain.com:3478|user|pass;turns:turn.your-domain.com:5349|user|pass

  # Option B: split variables
  VITE_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
  VITE_TURN_URLS=turn:turn.your-domain.com:3478,turns:turn.your-domain.com:5349
  VITE_TURN_USERNAME=<turn-username>
  VITE_TURN_CREDENTIAL=<turn-password>
  # Debug/diagnostic options
  VITE_WEBRTC_DEBUG=true
  VITE_WEBRTC_FORCE_RELAY=true
  ```

  Notes:
  - `VITE_API_URL` must be `https://...` in production so WebSocket uses `wss://...`.
  - For users on different networks (4G/Wi-Fi khác nhau), TURN server is required for stable call connectivity.
  - `VITE_WEBRTC_FORCE_RELAY=true` is useful for debugging cross-network calls. Turn it off after verification.
  
