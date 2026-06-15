# Test cases — AI kiểm duyệt comment

Kiểm thử thủ công qua API. Mỗi case có: **mục tiêu → bước → kết quả mong đợi**.
Map 1-1 với phần Verification trong plan.

---

## 0. Chuẩn bị (BẮT BUỘC làm trước)

### 0.1. Boot với `ddl-auto: update` (thêm 3 cột mới + validate JPQL)
- Chạy app bằng profile `local` (đã đặt `ddl-auto: update`).
- Quan sát log khởi động: **KHÔNG** có `QueryException` / `BeanCreationException`.
  Nếu khởi động sạch → các `@Query` mới của `PostCommentRepository` hợp lệ.
- Kiểm tra DB đã có cột mới trên `post_comments`:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'post_comments'
    AND column_name IN ('status','moderation_fail_reason','moderation_attempts');
  -- mong đợi: trả về đủ 3 dòng; comment cũ có status = 'APPROVED', moderation_attempts = 0
  ```

### 0.2. Nạp watchlist vào config DB (NẾU KHÔNG, isSuspect chỉ bắt được URL)
Config policy đọc từ bảng `platform_policies` (1 dòng, id=1), **không** tự đọc lại `default-config.json`.
Chọn 1 trong 2 cách:

**Cách A — nhanh cho DB test (re-seed lại từ file đã có watchlist):**
```sql
DELETE FROM platform_policies WHERE id = 1;
```
→ Khởi động lại app → tự seed lại config từ `default-config.json` (đã có 14 watchlist).

**Cách B — không mất config hiện tại (qua API nội bộ):**
```bash
# Lấy config hiện tại
curl -s {{BASE}}/api/internal/policies -H "X-Internal-Key: {{INTERNAL_KEY}}"
# Sửa mảng "keywords", thêm {"id":"wl-1","value":"đm","category":"watchlist"} ... rồi PUT lại:
curl -X PUT {{BASE}}/api/internal/policies \
  -H "X-Internal-Key: {{INTERNAL_KEY}}" -H "Content-Type: application/json" \
  -d '{"config": { ...toàn bộ config kèm watchlist... }, "updatedBy": "tester"}'
```

Xác minh watchlist đã vào config:
```sql
SELECT config_json::text LIKE '%watchlist%' FROM platform_policies WHERE id = 1; -- mong đợi: true
```

### 0.3. Biến môi trường / dữ liệu test
| Tên | Ý nghĩa |
|---|---|
| `{{BASE}}` | vd `http://localhost:8081` |
| `{{TOKEN_A}}` | JWT của **User A** (người bình luận) |
| `{{TOKEN_B}}` | JWT của **User B** (người xem khác) |
| `{{INTERNAL_KEY}}` | giá trị env `INTERNAL_API_KEY` |
| `{{POST_ID}}` | 1 post của User B (để A bình luận vào, có notification) |
| `{{GEMINI}}` | `GEMINI_API_KEY` đã cấu hình (cho TC03/TC04) |

Tạo sẵn 1 post của User B:
```bash
curl -X POST {{BASE}}/api/posts -H "Authorization: Bearer {{TOKEN_B}}" \
  -H "Content-Type: application/json" -d '{"content":"post de test comment","privacy":"PUBLIC"}'
# → lưu id trả về thành {{POST_ID}}
```

---

## TC01 — Comment sạch → APPROVED ngay, hiển thị, KHÔNG gọi AI
**Bước:**
```bash
curl -i -X POST {{BASE}}/api/posts/{{POST_ID}}/comments \
  -H "Authorization: Bearer {{TOKEN_A}}" -H "Content-Type: application/json" \
  -d '{"content":"hôm nay trời đẹp quá"}'
```
**Mong đợi:**
- HTTP `201`; body có `"moderationStatus":"APPROVED"`, `content` đầy đủ.
- Log **KHÔNG** có dòng `Gemini call succeeded` (không tốn quota).
- User B GET thấy comment ngay:
  `curl {{BASE}}/api/posts/{{POST_ID}}/comments -H "Authorization: Bearer {{TOKEN_B}}"` → có comment, `content` đầy đủ.
- User B nhận được notification COMMENT.

---

## TC02 — Comment nghi ngờ (watchlist) → PENDING, ẩn với người khác, hiện với tác giả, hoãn notification
**Bước:**
```bash
curl -i -X POST {{BASE}}/api/posts/{{POST_ID}}/comments \
  -H "Authorization: Bearer {{TOKEN_A}}" -H "Content-Type: application/json" \
  -d '{"content":"mày đúng là đồ ngu đm"}'
```
**Mong đợi:**
- HTTP `201`; body (góc nhìn tác giả A) có `"moderationStatus":"PENDING"`, `content` đầy đủ.
- **User B GET comment list** → **KHÔNG thấy** comment này (hoặc thấy placeholder không có nội dung nếu nó có reply).
- **User A GET comment list** → thấy comment kèm `"moderationStatus":"PENDING"`.
- User B **CHƯA** nhận notification (đã hoãn).
- DB: `SELECT status, moderation_attempts FROM post_comments WHERE id='<id>'` → `PENDING`, `0`.

---

## TC03 — Job nền duyệt: lành → APPROVED + notification; độc → REJECTED + lý do
*(Cần `{{GEMINI}}` còn quota.)*
**Bước:**
1. Tạo 1 comment "nghi ngờ nhưng lành" (khớp watchlist nhưng nội dung không vi phạm), vd chứa từ watchlist `"mua bán"`: `{"content":"cho mình hỏi chỗ mua bán sách cũ với"}`.
2. Tạo 1 comment thực sự độc (vi phạm rõ).
3. Đợi ≤ 1 phút (job chạy cron mỗi phút).

**Mong đợi:**
- Comment (1): `status` → `APPROVED`; User B giờ thấy; User B nhận notification COMMENT (đã gửi muộn).
- Comment (2): `status` → `REJECTED`; `moderation_fail_reason` có nội dung; User A GET thấy nhãn lý do từ chối; User B không thấy.
- Log có `[scheduler] moderate pending comments: count=...`.

---

## TC04 — Hard-block keyword → chặn đồng bộ, KHÔNG lưu
*(Dùng từ thuộc `category:"blacklist"` trong config, mặc định `"từ tục"`.)*
**Bước:**
```bash
curl -i -X POST {{BASE}}/api/posts/{{POST_ID}}/comments \
  -H "Authorization: Bearer {{TOKEN_A}}" -H "Content-Type: application/json" \
  -d '{"content":"đây là từ tục nhé"}'
```
**Mong đợi:**
- HTTP `400`, message "Nội dung chứa từ khóa không được phép".
- DB không có comment mới (không lưu).

---

## TC05 — updateComment: sửa từ lành → nghi ngờ ⇒ về PENDING + ẩn (vá lỗ hổng)
**Bước:**
1. Tạo comment lành (TC01) → lấy `{{CMT_ID}}`, đang APPROVED.
2. Sửa:
```bash
curl -i -X PUT {{BASE}}/api/posts/{{POST_ID}}/comments/{{CMT_ID}} \
  -H "Authorization: Bearer {{TOKEN_A}}" -H "Content-Type: application/json" \
  -d '{"content":"sửa lại thành đm cho bõ ghét"}'
```
**Mong đợi:**
- HTTP `200`, `"moderationStatus":"PENDING"`.
- User B không còn thấy comment này nữa.
- (Kiểm tra phụ) Sửa update chứa từ `blacklist` → HTTP `400` (trước đây update KHÔNG validate, giờ đã chặn).

---

## TC06 — Fail-closed khi AI không phản hồi (hết quota / thiếu key)
**Bước:**
1. Tạm bỏ/đặt sai `GEMINI_API_KEY` rồi restart.
2. Tạo comment nghi ngờ (như TC02) → PENDING.
3. Đợi qua vài lần job (vài phút).

**Mong đợi:**
- Comment **vẫn PENDING** (KHÔNG tự APPROVED), `moderation_attempts` **tăng mỗi phút** (1,2,3...).
- Sau khi `moderation_attempts >= 3`: comment **không còn được job lấy ra nữa** (rớt khỏi hàng đợi AI) nhưng **vẫn PENDING** chờ admin.
  ```sql
  SELECT id, status, moderation_attempts FROM post_comments WHERE status='PENDING' ORDER BY moderation_attempts DESC;
  ```

---

## TC07 — Admin duyệt tay (endpoint nội bộ)
**Bước:**
```bash
# Liệt kê comment đang PENDING
curl {{BASE}}/api/internal/comments/pending -H "X-Internal-Key: {{INTERNAL_KEY}}"

# Duyệt 1 comment
curl -i -X POST {{BASE}}/api/internal/comments/{{CMT_ID}}/approve -H "X-Internal-Key: {{INTERNAL_KEY}}"

# Hoặc từ chối kèm lý do
curl -i -X POST {{BASE}}/api/internal/comments/{{CMT_ID}}/reject \
  -H "X-Internal-Key: {{INTERNAL_KEY}}" -H "Content-Type: application/json" \
  -d '{"reason":"spam quảng cáo"}'
```
**Mong đợi:**
- `/pending` trả `Page` chứa comment ở TC06, có `moderationAttempts`.
- `approve` → `204`; comment thành APPROVED; User B thấy + nhận notification.
- `reject` → `204`; comment thành REJECTED + `moderation_fail_reason="spam quảng cáo"`.

---

## TC08 — Bảo vệ endpoint nội bộ
**Bước:**
```bash
curl -i {{BASE}}/api/internal/comments/pending -H "X-Internal-Key: sai-key"
curl -i {{BASE}}/api/internal/comments/pending   # thiếu header
```
**Mong đợi:** cả hai trả `401 Unauthorized`.

---

## TC09 — URL luôn bị coi là nghi ngờ (kể cả không có watchlist)
**Bước:**
```bash
curl -i -X POST {{BASE}}/api/posts/{{POST_ID}}/comments \
  -H "Authorization: Bearer {{TOKEN_A}}" -H "Content-Type: application/json" \
  -d '{"content":"xem ở https://example.com/abc nhé"}'
```
**Mong đợi:** `201`, `"moderationStatus":"PENDING"` (chống spam link, không phụ thuộc watchlist).

---

## TC10 — Số đếm comment chỉ tính APPROVED
**Bước:**
1. Trên 1 post: tạo 2 comment APPROVED + 1 comment PENDING (chưa duyệt).
2. GET post:
```bash
curl {{BASE}}/api/posts/{{POST_ID}} -H "Authorization: Bearer {{TOKEN_B}}"
```
**Mong đợi:** `commentCount = 2` (không tính comment PENDING) — khớp số comment User B thực sự nhìn thấy.

---

## Bảng tổng hợp nhanh

| TC | Tình huống | Kết quả chính |
|---|---|---|
| 01 | comment sạch | APPROVED ngay, không gọi AI, có notification |
| 02 | watchlist | PENDING, ẩn với người khác, hoãn notification |
| 03 | job duyệt | lành→APPROVED+notify; độc→REJECTED+reason |
| 04 | blacklist | 400, không lưu |
| 05 | update→nghi ngờ | về PENDING + ẩn (vá lỗ hổng update) |
| 06 | hết quota | giữ PENDING, attempts tăng, rớt queue sau 3 lần |
| 07 | admin duyệt tay | approve/reject hoạt động |
| 08 | sai/thiếu key | 401 |
| 09 | có link | PENDING |
| 10 | đếm comment | chỉ tính APPROVED |
