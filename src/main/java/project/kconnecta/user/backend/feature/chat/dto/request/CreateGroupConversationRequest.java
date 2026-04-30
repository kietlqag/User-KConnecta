package project.kconnecta.user.backend.feature.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CreateGroupConversationRequest {
    private String name;
    private String avatarUrl;
    private List<UUID> memberIds;
}

