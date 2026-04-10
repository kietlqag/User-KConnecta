package project.kconnecta.user.backend.feature.friend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class FriendRequestBody {
    @NotNull
    private UUID requesterId;

    @NotNull
    private UUID addresseeId;
}
