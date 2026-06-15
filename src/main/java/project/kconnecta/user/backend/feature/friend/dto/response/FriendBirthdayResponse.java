package project.kconnecta.user.backend.feature.friend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class FriendBirthdayResponse {
    private UUID friendshipId;
    private UUID userId;
    private String fullName;
    private String avatarUrl;
    private LocalDate dateOfBirth;
}
