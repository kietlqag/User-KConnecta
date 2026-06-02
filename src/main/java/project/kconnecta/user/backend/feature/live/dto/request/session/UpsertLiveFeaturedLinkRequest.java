package project.kconnecta.user.backend.feature.live.dto.request.session;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpsertLiveFeaturedLinkRequest {
    @Size(max = 255)
    private String title;

    @Size(max = 1000)
    private String url;
}
