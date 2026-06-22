package project.kconnecta.user.backend.feature.group.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class GroupMemberResponse {
    private UUID id; // member entry id
    private UUID userId;
    private String fullName;
    private String avatarUrl;
    private GroupMemberRole role;
    private LocalDateTime joinedAt;
}
