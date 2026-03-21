package project.kconnecta.user.backend.feature.user.dto.request;

import java.time.LocalDate;
import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class CreateUserRequest {
    @NotBlank(message = "Username is required")
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

    @NotBlank(message = "Password is required")
    private String passwordHash;

    private LocalDate dateOfBirth;
}
