package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GroupConversationResponse {
    private UUID id;
    private String name;
    private String avatarUrl;
    private String themeColor;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private List<GroupConversationMemberResponse> members;
}
