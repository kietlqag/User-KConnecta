package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInSuggestionResponse {
    private String locationText;
    private long usageCount;
}
