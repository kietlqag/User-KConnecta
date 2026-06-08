package project.kconnecta.user.backend.feature.user.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateUserRequest {
    @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain letters, numbers, and underscore")
    private String username;
    private String email;
    private String fullName;
    private String bio;
    private String gender;
    private String location;
    private String hometown;
    private String relationshipStatus;
    private String school;
    private String workplace;
    private String jobTitle;
    private LocalDate dateOfBirth;
    private String avatarUrl;
    private String coverPhotoUrl;
}
