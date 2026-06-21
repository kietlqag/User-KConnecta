package project.kconnecta.user.backend.feature.post.service;

import java.util.UUID;

/**
 * Ghi nhận vi phạm bình luận và áp dụng tạm cấm. Mỗi vi phạm là 1 dòng riêng (audit);
 * đủ ngưỡng trong cửa sổ 30 ngày (reset sau mỗi lần khóa) thì tạo lệnh khóa comment 24h.
 *
 * <p>Các method ghi chạy trong transaction RIÊNG (REQUIRES_NEW) để dòng vi phạm vẫn được
 * lưu kể cả khi transaction gọi bên ngoài bị rollback (luồng blacklist ném ValidationException).
 */
public interface CommentViolationService {

    /** Vi phạm do từ cấm (blacklist) — comment chưa được lưu nên không có commentId. */
    void recordBlacklistViolation(UUID userId, String content, String matchedKeywordId, String matchedKeyword);

    /** Vi phạm do AI kết luận UNSAFE — có commentId (và reportId nếu phát sinh từ report). */
    void recordAiUnsafeViolation(UUID userId, UUID commentId, UUID reportId, String contentSnapshot, String reason);

    /** User có đang bị khóa quyền bình luận (lệnh ACTIVE chưa hết hạn) không. */
    boolean isCommentLocked(UUID userId);
}
