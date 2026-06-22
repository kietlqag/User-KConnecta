package project.kconnecta.user.backend.feature.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class LeaveGroupConversationRequest {
    /** Required when the leaving user is the group creator. */
    private UUID newAdminUserId;
}
