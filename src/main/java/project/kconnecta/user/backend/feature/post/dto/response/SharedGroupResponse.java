package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;

import java.util.UUID;

/** Summary of a group embedded in a "share group to feed" post. */
@Getter
@Builder
public class SharedGroupResponse {
    private UUID id;
    private String name;
    private String coverPhotoUrl;
    private GroupPrivacy privacy;
    private int memberCount;
}
