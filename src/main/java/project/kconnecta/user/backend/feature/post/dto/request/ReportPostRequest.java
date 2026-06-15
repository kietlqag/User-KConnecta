package project.kconnecta.user.backend.feature.post.dto.request;

import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.post.entity.enums.ReportCategory;

import java.util.UUID;

@Getter
@Setter
public class ReportPostRequest {
    private UUID reporterId;
    private ReportCategory category;
    private String reason;
}
