package project.kconnecta.user.backend.feature.user.dto.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateUserRequest {
    private String username;
    private String email;
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
}
