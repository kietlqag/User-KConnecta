package project.kconnecta.user.backend.feature.group.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class GroupResponse {
    private UUID id;
    private String name;
    private String description;
    private String coverPhotoUrl;
    private GroupPrivacy privacy;
    private int memberCount;
    private GroupMemberRole role;
    private LocalDateTime updatedAt;
}
