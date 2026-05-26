package project.kconnecta.user.backend.feature.post.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ReportPostRequest {
    private UUID reporterId;
    private String reason;
}
