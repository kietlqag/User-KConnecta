# User-UI-KConnecta

Frontend ứng dụng mạng xã hội **KConnecta** dành cho người dùng cuối, xây dựng bằng React + TypeScript + Vite.

## Tech Stack

| Lớp | Công nghệ |
|-----|-----------|
| Framework | React 18, TypeScript 5, Vite 6 |
| Routing | React Router 7 |
| State / Fetching | TanStack Query (React Query 5) |
| UI Components | Radix UI, shadcn/ui, Lucide React |
| Styling | Tailwind CSS 4 |
| Forms | React Hook Form 7 |
| Real-time (chat / gọi / live) | STOMP over WebSocket (`@stomp/stompjs`) |
| Video/Audio call | WebRTC |
| Livestream | LiveKit (`livekit-client`) |
| Charts | Recharts |
| Toast UI | Sonner, React Hot Toast |
| Theme | next-themes (dark / light) |
| i18n | i18next (tiếng Việt) |

## Tính năng đã triển khai

- **Xác thực**: đăng nhập, đăng ký nhiều bước, OTP qua email, Google OAuth, 2FA, quên mật khẩu
- **Newsfeed**: bài viết (`POST`), stories, reactions, bình luận, lên lịch đăng
- **Hồ sơ cá nhân**: ảnh đại diện, bìa, bài viết, ảnh, thước phim (reel)
- **Bạn bè & sinh nhật**: gợi ý, lời mời kết bạn, trang sinh nhật
- **Nhóm**: tạo/khám phá nhóm, feed nhóm, thành viên, sự kiện, bình chọn
- **Nhắn tin (Messenger)**: chat thời gian thực (STOMP), gọi thoại / video (WebRTC), ghi âm
- **Thông báo**: panel thông báo, **làm mới định kỳ qua REST API (~30 giây)** — chưa dùng WebSocket trên FE
- **Tin nhắn mới**: toast khi có tin nhắn đến (STOMP, tách khỏi panel thông báo)
- **Tìm kiếm**: người dùng, nhóm, bài viết, reel (Redis Search phía backend)
- **Watch (Reels)**: xem reel (`REEL`), lưu reel, tạo reel riêng (tách khỏi đăng bài thường)
- **Live**: phát trực tiếp (LiveKit), lên lịch, xem live; HLS/DVR khi bật egress + lưu trữ object
- **Album**: tạo album, thêm media từ bài viết
- **Đã lưu**: bài viết đã lưu và bộ sưu tập
- **Cài đặt**: bảo mật, quyền riêng tư, giao diện, nhắc nhở / thời gian sử dụng
- **Hỗ trợ**: gửi yêu cầu hỗ trợ (đồng bộ với Admin)

> **Quản trị**: ứng dụng Admin riêng tại `../../Admin` (kiểm duyệt, báo cáo, chính sách, thống kê).

## Phạm vi chưa triển khai (frontend)

Các mục sau **chưa có** trong codebase user FE — không liệt kê như tính năng sẵn có:

| Mục | Trạng thái |
|-----|------------|
| **Marketplace** (chợ / đăng sản phẩm) | Chưa triển khai |
| **Trang Facebook-style (Pages)** | Chỉ có entity phía backend, chưa có UI |
| **Bảng điều khiển thống kê người dùng** | Đã gỡ khỏi sidebar (không còn route `/dashboard`) |
| **Thông báo push WebSocket trên panel** | Backend REST đủ dùng; FE poll 30s |

## Realtime — phạm vi thực tế

| Kênh | Cơ chế |
|------|--------|
| Chat, typing, presence | STOMP / WebSocket |
| Gọi thoại / video (mesh P2P) | WebRTC + signaling STOMP |
| Phiên live (host/viewer) | STOMP + LiveKit |
| Panel thông báo (like, comment, kết bạn…) | REST, poll **30s** (`useNotifications.ts`) |
| Toast tin nhắn mới | STOMP (`useMessageNotifications`) |

## Yêu cầu

- Node.js ≥ 18
- npm ≥ 9
- Backend KConnecta đang chạy (xem [`../user_be`](../user_be))

## Cài đặt & chạy

```bash
# Cài dependencies
npm install

# Khởi động dev server (http://localhost:3000)
npm run dev

# Build production
npm run build
```

## Biến môi trường

Tạo file `.env` ở thư mục gốc (hoặc cấu hình trên Vercel):

```env
# URL của backend (bắt buộc dùng https:// trên production để WebSocket dùng wss://)
VITE_API_URL=https://<your-render-backend-domain>

# --- Cấu hình WebRTC ICE Servers ---

# Cách A: chuỗi gộp, mỗi server cách nhau bằng ";"
# Định dạng mỗi entry: <urls>|<username>|<credential>  (STUN có thể bỏ qua username/credential)
# VITE_WEBRTC_ICE_SERVERS=stun:stun.l.google.com:19302;turn:turn.your-domain.com:3478|user|pass;turns:turn.your-domain.com:5349|user|pass

# Cách B: tách từng biến (dùng khi không dùng Cách A)
VITE_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
VITE_TURN_URLS=turn:turn.your-domain.com:3478,turns:turn.your-domain.com:5349
VITE_TURN_USERNAME=<turn-username>
VITE_TURN_CREDENTIAL=<turn-password>

# Tùy chọn debug
VITE_WEBRTC_DEBUG=true          # Bật log chi tiết WebRTC
VITE_WEBRTC_FORCE_RELAY=true    # Ép dùng TURN (tắt sau khi debug xong)
```

> **Lưu ý TURN server**: Khi người dùng ở các mạng khác nhau (4G vs Wi-Fi), cần TURN server để đảm bảo kết nối gọi ổn định.

## Cấu trúc thư mục

```
src/
├── assets/             # Hình ảnh tĩnh
├── components/         # UI dùng chung (shadcn/ui, shared, reactions)
├── features/           # Mỗi tính năng là một module độc lập
│   ├── auth/           #   Xác thực
│   ├── home/           #   Newsfeed
│   ├── profile/        #   Hồ sơ cá nhân & đăng bài
│   ├── friends/        #   Bạn bè
│   ├── birthdays/      #   Sinh nhật
│   ├── groups/         #   Nhóm
│   ├── messenger/      #   Nhắn tin & gọi video
│   ├── notifications/  #   Panel thông báo (REST poll)
│   ├── search/         #   Tìm kiếm
│   ├── watch/          #   Reels / video ngắn
│   ├── live/           #   Livestream
│   ├── stories/        #   Stories
│   ├── albums/         #   Album ảnh/video
│   ├── saved/          #   Đã lưu & bộ sưu tập
│   ├── settings/       #   Cài đặt tài khoản
│   ├── support/        #   Yêu cầu hỗ trợ
│   └── account/        #   Menu tài khoản
├── i18n/               # Bản dịch (vi)
├── layouts/            # Layout wrapper
├── routes/             # Định nghĩa routes
├── services/           # API client (axios), auth service
├── lib/                # Tiện ích (cn, ...)
└── utils/              # apiBaseUrl, webrtcConfig
```

## Thiết kế gốc

Figma: [User-UI-KConnecta](https://www.figma.com/design/nbOWtCRDVQ5InzpBFJk11j/User-UI-KConnecta)
