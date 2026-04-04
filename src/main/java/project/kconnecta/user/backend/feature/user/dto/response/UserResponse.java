package project.kconnecta.user.backend.feature.user.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.common.enums.AccountStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserResponse {
    private UUID id;
    private String username;
    private String email;
    private AccountStatus accountStatus;
    private String fullName;
    private String bio;
    private String gender;
    private String location;
    private String hometown;
    private String relationshipStatus;
    private String school;
    private LocalDate dateOfBirth;
    private String avatarUrl;
    private String coverPhotoUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
