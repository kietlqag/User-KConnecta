package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentVerificationResponse {
    private boolean safe;
    private String level; // NONE, BLACKLIST, WATCHLIST, AI_UNSAFE
    private String matchedKeyword;
    private String reason;
}
