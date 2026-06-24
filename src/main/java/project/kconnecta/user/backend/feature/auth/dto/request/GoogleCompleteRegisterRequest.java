package project.kconnecta.user.backend.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.LocalDate;

@Getter
public class GoogleCompleteRegisterRequest {
    private String idToken;
    private String accessToken;

    @NotBlank
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
