package project.kconnecta.user.backend.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyTwoFactorLoginRequest {
    @NotBlank
    private String twoFactorToken;

    @NotBlank
    private String otp;
}
