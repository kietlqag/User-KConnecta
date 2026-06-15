package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LiveEventSubscriptionStatusResponse {
    private boolean subscribed;
    private long subscriptionCount;
}
