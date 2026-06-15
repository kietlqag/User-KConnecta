package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class LiveEventSubscribersResponse {
    private long total;
    private List<LiveEventSubscriberResponse> subscribers;
}
