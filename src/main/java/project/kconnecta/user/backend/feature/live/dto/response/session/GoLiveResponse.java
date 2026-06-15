package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GoLiveResponse {
    private LiveSessionResponse session;
    private String livekitUrl;
    private String hostToken;
}
