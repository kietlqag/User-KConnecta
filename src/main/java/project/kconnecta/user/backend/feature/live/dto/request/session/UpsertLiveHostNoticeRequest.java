package project.kconnecta.user.backend.feature.live.dto.request.session;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpsertLiveHostNoticeRequest {
    @Size(max = 1000)
    private String notice;
}
