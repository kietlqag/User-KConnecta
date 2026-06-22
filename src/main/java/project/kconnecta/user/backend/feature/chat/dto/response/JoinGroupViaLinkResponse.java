package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JoinGroupViaLinkResponse {
    /** JOINED | PENDING | ALREADY_MEMBER | ALREADY_PENDING */
    private String status;
    private UUID conversationId;
    private String conversationName;
    private String message;
}
