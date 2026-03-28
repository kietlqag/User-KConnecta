package project.kconnecta.user.backend.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class GoogleLoginRequest {
    @NotBlank
    private String idToken;
}
