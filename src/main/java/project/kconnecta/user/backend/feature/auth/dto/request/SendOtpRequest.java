package project.kconnecta.user.backend.feature.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class SendOtpRequest {
    @NotBlank
    @Email
    private String email;
}
