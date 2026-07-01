# KConnecta — User Frontend (`user_fe`)

SPA React phục vụ client người dùng của nền tảng KConnecta. Giao tiếp với `user_be` qua REST và STOMP/WebSocket; media qua Cloudinary; live qua LiveKit; gọi P2P qua WebRTC.

## Ngữ cảnh hệ thống

```
┌─────────────┐     REST /api      ┌──────────────┐
│  user_fe    │◄──────────────────►│   user_be    │
│  (Vite SPA) │     WS  /ws        │ Spring Boot  │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ WebRTC (signaling qua WS)         ├── PostgreSQL
       │ LiveKit SDK                       ├── Redis (search)
       ▼                                  └── Cloudinary / R2 (media, HLS)
  Cloudinary CDN
```

| Thành phần | Đường dẫn | Vai trò |
|------------|-----------|---------|
| User API | [`../user_be`](../user_be) | Backend bắt buộc |
| Admin | [`../../Admin`](../../Admin) | Ứng dụng quản trị độc lập |

## Stack

| | |
|---|---|
| Runtime | Node.js ≥ 18, npm ≥ 9 |
| UI | React 18, TypeScript 5, Vite 6 |
| Router | React Router 7 (lazy routes) |
| Data | TanStack Query 5, Axios |
| Styling | Tailwind CSS 4, Radix UI |
| Realtime | `@stomp/stompjs` |
| Media | `livekit-client`, `hls.js`, WebRTC |

## Cài đặt

```bash
npm install
```

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server — mặc định `http://localhost:3000` |
| `npm run build` | Production build → thư mục `build/` |

## Cấu hình môi trường

Tạo `.env` tại root `user_fe` (hoặc biến môi trường trên Vercel). Tất cả biến client phải có prefix `VITE_`.

| Biến | Bắt buộc | Mặc định (dev) | Mô tả |
|------|----------|----------------|--------|
| `VITE_API_URL` | Production: có | — (dùng proxy) | Origin backend, không kèm `/api`. Dev + `localhost:8080` → FE proxy `/api` |
| `VITE_APP_URL` | Không | `window.location.origin` | Origin public cho link chia sẻ |
| `VITE_GOOGLE_CLIENT_ID` | Nếu bật Google login | — | OAuth client ID |
| `VITE_WEBRTC_ICE_SERVERS` | Không | Google STUN | Chuỗi ICE: `url\|user\|pass` ngăn cách `;` |
| `VITE_STUN_URLS` | Không | — | STUN CSV (khi không dùng `VITE_WEBRTC_ICE_SERVERS`) |
| `VITE_TURN_URLS` | Không | — | TURN CSV |
| `VITE_TURN_USERNAME` | Khi có TURN | — | |
| `VITE_TURN_CREDENTIAL` | Khi có TURN | — | |
| `VITE_WEBRTC_FORCE_RELAY` | Không | `false` | Ép `iceTransportPolicy: relay` |
| `VITE_WEBRTC_DEBUG` | Không | `false` | Log WebRTC |
| `VITE_MODERATION_URL` | Không | — | Override URL moderation (nếu tách service) |

### Dev proxy (`vite.config.ts`)

| Path FE | Target | Ghi chú |
|---------|--------|---------|
| `/api/*` | `http://localhost:8080` | Cookie auth same-origin |
| `/ws/*` | `ws://localhost:8080` | STOMP |

Khi `VITE_API_URL` trỏ `http://localhost:8080`, `getApiBaseUrl()` và `getWsBaseUrl()` tự chuyển sang proxy — không gọi thẳng `:8080` từ browser.

## Build & triển khai

- **Output:** `build/` (không phải `dist/`)
- **Platform:** Vercel (`vercel.json`) — SPA fallback `/* → /index.html`
- **Production:** đặt `VITE_API_URL=https://<backend-host>` (HTTPS → WSS tự suy ra)
- **CSP:** header trong `vercel.json`; cập nhật `connect-src` / `media-src` khi đổi domain backend, LiveKit, R2

Backend mặc định local: `http://localhost:8080`.

## Kiến trúc mã nguồn

```
src/
├── routes/           # createBrowserRouter, RouteGuards, lazy loading
├── layouts/          # MainLayout, AuthLayout
├── services/         # Axios client, domain API wrappers
├── features/         # Module theo domain (pages, components, hooks)
├── components/       # Shared UI (shadcn, Post, reactions)
├── contexts/         # RealtimeCallProvider, SidebarContext
├── hooks/            # Cross-feature hooks
├── constants/        # Chuỗi UI (`vi.ts`), `formatVi`
├── utils/            # apiBaseUrl, webrtcConfig, policy validation
└── lib/              # cn(), helpers
```

**Alias:** `@/` → `src/` (Vite + TypeScript).

**Routing:** protected routes bọc `ProtectedRoute`; messenger/live/watch mount dưới `RealtimeLayout` (STOMP + call context).

**State:** server state qua React Query; auth user trong `localStorage` (`authService`); không Redux.

## Tích hợp runtime

| Subsystem | Client entry | Transport |
|-----------|--------------|-----------|
| REST API | `services/api.ts` | HTTPS `/api`, cookie + JWT refresh |
| Chat / signaling | `useChatSocket`, messenger hooks | STOMP `/ws` |
| Voice/video call | `useVoiceCall`, `RealtimeCallContext` | WebRTC + STOMP signaling |
| Live | `livekit-client`, `useLiveHlsPlayback` | LiveKit token từ API; HLS optional |
| Notifications panel | `useNotifications` | REST poll 30s |
| Message toast | `useMessageNotifications` | STOMP |
| Search | `searchService` | REST (index Redis phía BE) |

**Post model:** `postType` = `POST` \| `REEL` — feed và Watch tách pipeline tạo/nạp dữ liệu.

## Bảo mật client

- Request API: `withCredentials: true` (HttpOnly refresh cookie)
- 401: auto refresh token, redirect login khi hết phiên
- Dev/preview: security headers trong `security-headers.ts`
- Production CSP: `vercel.json`

## Thiết kế UI

[Figma — User-UI-KConnecta](https://www.figma.com/design/nbOWtCRDVQ5InzpBFJk11j/User-UI-KConnecta)
