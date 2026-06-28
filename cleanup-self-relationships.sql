-- Dọn dữ liệu "self-relationship" sai sinh ra trong giai đoạn bug self friend-request.
-- An toàn để chạy nhiều lần (idempotent). Chạy trên DB PostgreSQL của user-service.
--
-- psql:  psql "$DB_URL" -f cleanup-self-relationships.sql
-- hoặc dán trực tiếp vào công cụ SQL (pgAdmin/DBeaver).

BEGIN;

-- 1) Kết bạn với chính mình (requester == addressee)
DELETE FROM public.friendships
WHERE requester_id = addressee_id;

-- 2) Thông báo gửi cho chính mình (recipient == sender)
DELETE FROM public.notifications
WHERE sender_id IS NOT NULL
  AND recipient_id = sender_id;

-- 3) Tin nhắn riêng tự gửi cho chính mình (sender == receiver)
--    Xóa bản ghi ghim phụ thuộc trước (FK chat_pinned_messages.message_id không cascade trên DB hiện tại)
DELETE FROM public.chat_pinned_messages
WHERE message_id IN (
    SELECT id FROM public.chat_messages
    WHERE receiver_id IS NOT NULL AND sender_id = receiver_id
);

DELETE FROM public.chat_messages
WHERE receiver_id IS NOT NULL
  AND sender_id = receiver_id;

COMMIT;

-- Kiểm tra lại sau khi dọn (kỳ vọng tất cả = 0):
-- SELECT COUNT(*) AS self_friendships FROM public.friendships WHERE requester_id = addressee_id;
-- SELECT COUNT(*) AS self_notifications FROM public.notifications WHERE sender_id = recipient_id;
-- SELECT COUNT(*) AS self_messages FROM public.chat_messages WHERE sender_id = receiver_id;
