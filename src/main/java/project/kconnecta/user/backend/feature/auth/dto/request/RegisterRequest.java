package project.kconnecta.user.backend.feature.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.LocalDate;

@Getter
public class RegisterRequest {
    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 8)
    private String password;

    @NotBlank
    @Size(max = 120)
    @Pattern(regexp = "^[^<>&\"']+$", message = "Full name contains invalid characters")
    private String fullName;

    @NotBlank
    @Size(min = 3, max = 30)
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain letters, numbers, and underscore")
    private String username;

    private LocalDate dateOfBirth;

    @NotBlank
    private String gender;

    private String location;
    private String bio;
}
