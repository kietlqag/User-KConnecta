# Design System Audit — KConnecta (User Frontend)

> Phương pháp: đọc `src/styles/globals.css` (token definitions), `vite.config.ts` (alias/build), 49 component trong `src/components/ui` (shadcn/ui + Radix + CVA), và quét pattern bằng grep trên 211 file `.tsx` để đo mức độ áp dụng token thực tế.

## Summary

**Components reviewed:** 49 UI primitives (`components/ui`) + layout & shared components (`Header`, `LeftSidebar`, `MainLayout`, `Post`, `Card`...) | **Issues found:** 9 | **Score: 52/100**

Hệ thống token (màu, radius, typography, font weight) được định nghĩa rất đầy đủ và đúng chuẩn shadcn/Tailwind v4 (`@theme inline`). Vấn đề không nằm ở *thiết kế* token mà ở *mức độ áp dụng*: phần lớn 211 file feature không dùng token, một số token (shadow) chưa được wire vào Tailwind nên gần như "chết", và còn tồn đọng nhiều dấu vết từ công cụ generate code (Figma Make) chưa được dọn.

## Naming Consistency

| Vấn đề | Components / phạm vi | Khuyến nghị |
|---|---|---|
| **Import specifier kèm version** (`from "@radix-ui/react-tooltip@1.1.8"`, `"sonner@2.0.3"`...) — di sản từ Figma Make | 37/49 file trong `components/ui` | Bỏ phần `@version` trong import, xóa 56 dòng alias tương ứng trong `vite.config.ts` để giảm rủi ro lệch version với `package.json` |
| **Hai token "surface" trùng vai trò**: `--card`/`bg-card` (8 lần dùng) và `--surface`/`bg-surface` (5 lần dùng) cùng biểu diễn "mặt phẳng nổi màu trắng/đen" nhưng có giá trị khác nhau ở dark mode (`--card: oklch(0.145 0 0)` vs `--surface: #16161f`) | Token layer + `Card`, `Post`, `WelcomePage`... | Hợp nhất thành một token (khuyến nghị giữ `surface`/`surface-raised` cho bề mặt tuỳ biến, `card` chỉ cho component `Card` chuẩn shadcn — và đảm bảo 2 giá trị dark-mode khớp nhau) |
| **Token shadow "chết"**: `--shadow-subtle`, `--shadow-elevated`, `--shadow-glow` được định nghĩa trong `:root`/`.dark` nhưng **không** có trong block `@theme inline` ⇒ không tồn tại dưới dạng class Tailwind (`shadow-subtle`...) | `globals.css` | Thêm mapping vào `@theme inline` (`--shadow-elevated: var(--shadow-elevated)`...) hoặc xoá token nếu không dùng |
| **File/folder naming**: `components/ui` dùng kebab-case (`alert-dialog.tsx`) đúng chuẩn shadcn; `components/shared`, `features/*/components` dùng PascalCase (`Post.tsx`, `UserAvatar.tsx`) | Toàn repo | Không sai, nhưng nên ghi rõ convention này trong tài liệu để tránh trộn lẫn khi thêm component mới |

## Token Coverage

| Category | Defined | Hardcoded values found |
|---|---|---|
| **Colors** | 28 token semantic (light + dark) trong `globals.css`: `background/foreground/card/popover/primary/secondary/muted/accent/destructive/border/input/surface/text-primary/text-secondary/sidebar-*` | **3.252** lần dùng `bg/text/border-gray-*` trên **135/211 file** (64%); **132** literal hex (`#10b981`, `#111126`...) trong 39 file dùng `style={{}}`; primary brand là emerald `#10b981` nhưng nhiều CTA dùng `blue-600`/`green-600/700` (Messenger, Settings, Live, Groups, Stories) |
| **Spacing** | Không có spacing token riêng — dùng thang mặc định Tailwind (4px grid) | **245** giá trị `[Npx]` tuỳ ý (ví dụ `w-[680px]`, `top-[14px]`) trên **92/211 file** — phần lớn hợp lý cho layout (max-width cố định) nhưng một số đáng lẽ nên dùng spacing scale |
| **Typography** | `--font-sans` (Geist Variable), `--font-size: 16px`, `--font-weight-medium/normal`; quy tắc `h1–h4`, `label`, `button`, `input` trong `@layer base` | **241** lần `text-[Npx]` (off-scale) so với **1.205** lần dùng scale chuẩn (`text-xs…3xl`) → ~17% text không theo scale |
| **Radius** | `--radius: 0.625rem` + scale `sm/md/lg/xl` qua `@theme inline` | Áp dụng tốt: **1.434** lần dùng `rounded-(sm/md/lg/xl/full/2xl)` vs chỉ **6** lần `rounded-[Npx]` |
| **Shadow** | `--shadow-subtle/elevated/glow` định nghĩa ở token layer nhưng **không map vào `@theme inline`** | **0** lần dùng class `shadow-subtle/elevated/glow`; **14** lần dùng `shadow-[<raw rgba>]` lặp lại chính giá trị mà token đã định nghĩa |
| **Dark mode** | `.dark{}` override đầy đủ cho toàn bộ token màu | Chỉ **45/211 file (21%)** có class `dark:` — phần lớn UI sẽ giữ màu light-mode hardcode khi chuyển theme |

## Component Completeness

| Component | Variants | States | Ref forwarding | Docs | Score |
|---|---|---|---|---|---|
| `Button` | ✅ 6 variant × 4 size (CVA), map đúng token | ✅ hover/disabled/focus-visible | ✅ | ❌ | 8/10 |
| `Badge` | ✅ 4 variant (CVA) | ✅ | — (span) | ❌ | 7/10 |
| `Alert` | ✅ CVA variant | ✅ | — | ❌ | 7/10 |
| `Input` | ⚠️ không có variant (size/state qua class cố định) | ✅ disabled, focus-visible, `aria-invalid` | ✅ forwardRef | ❌ | 6/10 |
| `Card` | ⚠️ không variant — chỉ 1 style cố định (`bg-card`, `rounded-2xl`) | — | — (function component, không cần ref) | ❌ | 6/10 |
| `Dialog` / `AlertDialog` | ✅ đủ sub-component (Header/Content/Footer/Title) qua Radix | ✅ open/close, overlay | ✅ | ❌ | 7/10 |
| `Sidebar` | ✅ CVA, nhiều sub-part | ⚠️ phức tạp, dễ trôi khỏi token nếu copy lại | ⚠️ | ❌ | 6/10 |
| Toàn bộ 49 file `components/ui` | 6/49 dùng CVA (12%) — số còn lại là component đơn giản không cần variant, hợp lý | 80 file có xử lý `disabled`; 83 thuộc tính `aria-*` toàn repo (baseline khá) | 5/49 dùng `forwardRef` (đa số dùng function component kiểu React 19 `data-slot`, ổn) | **0/49** có JSDoc/comment mô tả | — |

**Nhận xét chung component layer**: bản thân các primitive trong `components/ui` *được build đúng chuẩn* (token, CVA, Radix, `data-slot`). Vấn đề thực sự nằm ở **lớp feature phía trên** — nhiều nơi không tái sử dụng `<Button>`/`<Card>` mà viết `<button className="...">` với màu cứng (thấy rõ ở `Header`, `LeftSidebar`, các trang Live/Settings/Messenger).

## Priority Actions

1. **Token adoption sweep** (ROI cao nhất, ảnh hưởng 135 file): thay `bg-gray-100→bg-muted`, `text-gray-900→text-foreground`, `text-gray-500/600→text-muted-foreground`, `border-gray-300→border-border`, và map CTA `blue-600/green-600→primary`. Việc này tự động "mở khoá" dark mode cho phần còn lại của app vì `.dark{}` đã sẵn sàng.
2. **Dọn token tầng nền**: wire `--shadow-subtle/elevated/glow` vào `@theme inline` (hoặc xoá nếu thừa), hợp nhất `--card` và `--surface` thành một cặp token nhất quán giữa light/dark.
3. **Dọn cruft từ Figma Make**: bỏ `@version` trong 37 import specifier ở `components/ui` và xoá alias tương ứng trong `vite.config.ts` — giảm rủi ro khi nâng version dependency thật trong `package.json` không khớp với alias.

### Ghi chú phụ (đã nêu ở bản design-critique trước)
- Contrast `--muted-foreground` (#9898b8 trên #f5f5fa) ≈ 2.6:1, dưới chuẩn WCAG AA cho text thường — nên xử lý cùng lúc với sweep token màu ở mục 1.
