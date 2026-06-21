package project.kconnecta.user.backend.feature.post.entity.enums;

/** Vòng đời một báo cáo comment. PENDING: chờ AI; DISMISSED: AI xác nhận an toàn; ACTIONED: AI đã ẩn comment. */
public enum CommentReportStatus {
    PENDING,
    DISMISSED,
    ACTIONED
}
