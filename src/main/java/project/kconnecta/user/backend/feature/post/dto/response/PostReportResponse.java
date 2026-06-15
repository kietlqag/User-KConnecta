package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.post.entity.enums.ReportCategory;
import project.kconnecta.user.backend.feature.post.entity.enums.ReportStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PostReportResponse {
    private UUID id;
    private UUID postId;
    private UUID reporterId;
    private String reporterUsername;
    private ReportCategory category;
    private String reason;
    private ReportStatus status;
    private String aiAnalysis;
    private String aiSeverity;
    private LocalDateTime createdAt;
}
