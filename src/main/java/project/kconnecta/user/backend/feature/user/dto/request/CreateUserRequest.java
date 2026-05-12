package project.kconnecta.user.backend.feature.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateUserRequest {
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain letters, numbers, and underscore")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String bio;

    @NotBlank(message = "Gender is required")
    private String gender;

    private String location;

    private String hometown;

    private String relationshipStatus;

    private String school;

    @NotBlank(message = "Password is required")
    private String password;

    private LocalDate dateOfBirth;
}
