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
| Real-time | STOMP over WebSocket (`@stomp/stompjs`) |
| Video/Audio call | WebRTC |
| Charts | Recharts |
| Notifications | Sonner, React Hot Toast |
| Theme | next-themes (dark / light) |

## Tính năng chính

- **Xác thực**: đăng nhập, đăng ký nhiều bước, OTP qua email, quên mật khẩu
- **Newsfeed**: bài viết, stories, reactions, bình luận
- **Hồ sơ cá nhân**: ảnh đại diện, bìa, bài viết, ảnh, danh sách bạn bè
- **Bạn bè**: gợi ý, gửi / chấp nhận / từ chối lời mời kết bạn
- **Nhóm**: trang nhóm và sidebar quản lý nhóm
- **Nhắn tin (Messenger)**: chat thời gian thực, gọi thoại / video call qua WebRTC
- **Thông báo**: panel thông báo real-time
- **Tìm kiếm**: tìm người, nhóm, bài viết
- **Marketplace**: đăng và duyệt sản phẩm
- **Watch**: xem reels / video ngắn
- **Live**: phát trực tiếp

## Yêu cầu

- Node.js ≥ 18
- npm ≥ 9
- Backend KConnecta đang chạy (xem [User_backend](../User_backend))

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

Tạo file `.env` ở thư mục gốc (hoặc cấu hình trên Vercel / Render):

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
│   ├── profile/        #   Hồ sơ cá nhân
│   ├── friends/        #   Bạn bè
│   ├── groups/         #   Nhóm
│   ├── messenger/      #   Nhắn tin & gọi video
│   ├── notifications/  #   Thông báo
│   ├── search/         #   Tìm kiếm
│   ├── marketplace/    #   Chợ
│   ├── watch/          #   Reels / video
│   ├── live/           #   Livestream
│   └── stories/        #   Stories
├── layouts/            # Layout wrapper
├── routes/             # Định nghĩa routes
├── services/           # API client (axios), auth service
├── lib/                # Tiện ích (cn, ...)
└── utils/              # apiBaseUrl, webrtcConfig
```

## Thiết kế gốc

Figma: [User-UI-KConnecta](https://www.figma.com/design/nbOWtCRDVQ5InzpBFJk11j/User-UI-KConnecta)
