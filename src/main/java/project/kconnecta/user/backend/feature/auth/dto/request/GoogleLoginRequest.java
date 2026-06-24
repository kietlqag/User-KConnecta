package project.kconnecta.user.backend.feature.auth.dto.request;

import lombok.Getter;

@Getter
public class GoogleLoginRequest {
    private String idToken;
    private String accessToken;
}
