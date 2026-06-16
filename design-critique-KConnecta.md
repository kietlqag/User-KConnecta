# Design Critique: KConnecta (User Frontend)

> **Phạm vi & phương pháp**: Môi trường làm việc không thể chạy live preview (mount `node_modules` lỗi I/O, không cài được Chromium headless do thiếu quyền sudo trong sandbox). Bản review này dựa trên việc đọc trực tiếp source code: design tokens (`globals.css`), layout chính (`MainLayout`, `Header`, `LeftSidebar`), hệ thống UI (`shadcn/ui` trong `components/ui`), và quét pattern sử dụng class trên toàn bộ 211 file `.tsx`. Vì vậy nhận xét tập trung vào **hệ thống thiết kế, cấu trúc layout và tính nhất quán** hơn là cảm nhận thị giác trực tiếp.

## Overall Impression

Nền tảng khá tốt: project dùng shadcn/ui (Radix + CVA) với một bộ design token đầy đủ cho light/dark mode trong `globals.css` (màu, shadow, radius, font). `WelcomePage` cho thấy đội ngũ biết cách làm UI sạch, có chiều sâu. Nhưng phần còn lại của app (211 file, ~20 feature module) phần lớn **không dùng bộ token đó** — thay vào đó là class Tailwind cứng (`bg-gray-100`, `text-gray-900`, `bg-blue-600`...). Đây là cơ hội lớn nhất: hệ thống thiết kế đã tồn tại, chỉ chưa được áp dụng đồng bộ.

## Usability

| Phát hiện | Mức độ | Đề xuất |
|---|---|---|
| `MainLayout` dùng `bg-gray-100` cứng cho toàn bộ nền app, thay vì `bg-background` (token `#f5f5fa`/`#0d0d14`) | 🟡 Moderate | Đổi sang `bg-background` để dark mode hoạt động ngay từ layout gốc |
| Các liên kết footer ở `LeftSidebar` ("Quyền riêng tư", "Điều khoản", "Quảng cáo"...) đều là `href="#"` | 🟢 Minor | Gắn route thật hoặc ẩn tạm nếu chưa có trang đích, tránh dead-link gây khó hiểu |
| Input tìm kiếm trong `Header` không có `aria-label`/`<label>`, chỉ có placeholder | 🟡 Moderate | Thêm `aria-label="Tìm kiếm trên KConnecta"` |
| Nút icon trong header (`p-2` quanh icon 20px ⇒ ~36px) hơi nhỏ so với khuyến nghị 44px cho touch target | 🟢 Minor | Tăng padding lên `p-2.5`/`p-3` trên breakpoint mobile |

## Visual Hierarchy

- **Header**: bố cục logo + search (trái) — nav chính (giữa) — messenger/notification/avatar (phải) là pattern Facebook chuẩn, dễ hiểu, đúng trọng tâm.
- **Feed (`HomePage`)**: cột nội dung giới hạn `max-w-[680px]` căn giữa, kèm `RightSidebar` — độ rộng đọc hợp lý, đúng best practice cho feed dạng card.
- **LeftSidebar**: thứ tự menu (Trang cá nhân → Bạn bè → Đã lưu → Nhóm → Video) hợp lý, mỗi icon có khối màu nền riêng (blue/purple/emerald) — tạo điểm nhấn thị giác tốt, nhưng các màu này không liên kết với `--primary` (emerald) của brand nên trông như được chọn ngẫu nhiên hơn là có chủ đích.
- **WelcomePage**: chia 2 panel (brand tối bên trái, feature rail sáng bên phải) tạo tương phản mạnh, đúng vai trò landing page — điểm nhìn đầu tiên rơi vào headline + CTA, chính xác.

## Consistency

| Yếu tố | Vấn đề | Đề xuất |
|---|---|---|
| Màu nền/chữ | **3.252 lần** dùng class `bg/text/border-gray-*` cứng trên **135/211 file** (64%), trong khi token ngữ nghĩa (`bg-muted`, `text-foreground`, `bg-surface`...) chỉ xuất hiện **136 lần**. Hệ quả: phần lớn UI sẽ vỡ hoặc không đổi màu khi chuyển dark mode | Thay thế dần theo nhóm: `bg-gray-100`→`bg-muted`, `text-gray-900`→`text-foreground`, `text-gray-500/600`→`text-muted-foreground`, `border-gray-*`→`border-border` |
| Dark mode | Chỉ **45/211 file (21%)** có class `dark:`. `globals.css` định nghĩa `.dark{...}` rất đầy đủ nhưng gần như chỉ phát huy tác dụng ở các trang dùng token (Welcome, một phần Post) | Ưu tiên audit dark mode cho các trang lõi (Home, Profile, Messenger, Settings) trước |
| Màu chủ đạo (primary) | Token `--primary` = emerald `#10b981`, nhưng nhiều trang dùng `blue-600`/`green-600`/`green-700` làm màu nhấn cho nút/link chính (Messenger, Settings, CreateGroup, LiveSetup, CreateStory) | Map các CTA chính về `bg-primary`/`text-primary` để thương hiệu nhất quán |
| Component Button | `buttonVariants` (CVA) định nghĩa rõ 6 variant, dùng token đầy đủ — đây là chuẩn tốt, nhưng nhiều nơi không dùng `<Button>` mà tự viết `<button className="...">` với màu cứng (thấy rõ ở `Header`, `LeftSidebar`) | Khuyến khích dùng lại `<Button variant="ghost"/"outline">` cho action button thay vì class tay |

## Accessibility

- **Color contrast**: `--muted-foreground: #9898b8` trên `--background: #f5f5fa` cho tỉ lệ tương phản **≈ 2.6:1** — không đạt WCAG AA cho text thường (cần ≥ 4.5:1), thậm chí dưới ngưỡng text lớn (3:1). Token này được dùng rộng cho timestamp, mô tả phụ, placeholder ⇒ rất nhiều text phụ trong app khó đọc với người yếu thị lực.
  - Đề xuất: hạ độ sáng, ví dụ dùng tông gần `--text-secondary: #6b6b8a` (tương phản tốt hơn) cho `--muted-foreground`, hoặc tách hai token rõ ràng theo mục đích sử dụng.
- **Touch targets**: nút icon header/sidebar ~36px, hơi dưới chuẩn 44×44px của WCAG 2.1 AAA / khuyến nghị mobile.
- **Focus state**: `buttonVariants` có `focus-visible:outline` — tốt, nhưng các `<button>` viết tay (Header, LeftSidebar, nhiều page) không kế thừa class này nên có thể thiếu focus ring khi điều hướng bằng bàn phím.
- **Alt text**: các `<img>` đã review (logo, avatar) đều có `alt` — điểm tốt, nên giữ chuẩn này khi thêm ảnh mới.

## What Works Well

- **`globals.css`** là một bộ design token rất đầy đủ và có tổ chức: màu semantic, shadow (`--shadow-subtle/elevated/glow`), radius scale, font weight — nền tảng tốt hơn nhiều project thực tế.
- **`WelcomePage`** dùng token nhất quán (`bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`), có animation `motion-safe` và xử lý `prefers-reduced-motion` — đúng chuẩn accessibility cho motion.
- **Hệ thống Button (CVA)** rõ ràng, dễ mở rộng, đã map đúng token.
- **Cấu trúc feature-based** (`src/features/<domain>/{components,pages,hooks,types}`) rất sạch, dễ scale cho một sản phẩm 20 module.

## Priority Recommendations

1. **Chuẩn hóa màu nền/chữ về design token** — đây là thay đổi ROI cao nhất: chỉ cần thay class theo mapping (`gray-100→muted`, `gray-900→foreground`, `gray-500→muted-foreground`, `gray-300→border`) trên 135 file sẽ tự động kích hoạt dark mode cho toàn app vì `.dark{}` đã định nghĩa sẵn.
2. **Sửa contrast của `--muted-foreground`** (`#9898b8` → tông tối hơn, ví dụ gần `#6b6b8a`) để các đoạn text phụ (timestamp, mô tả, placeholder) đạt WCAG AA — ảnh hưởng hàng trăm vị trí cùng lúc vì là token toàn cục.
3. **Map các CTA chính (blue/green hardcode) về `--primary` emerald** ở Messenger, Settings, Live, Groups, Stories để thương hiệu nhất quán xuyên suốt app, đồng thời thêm `aria-label` cho ô tìm kiếm và hoàn thiện các link footer (`href="#"`) trong `LeftSidebar`.
