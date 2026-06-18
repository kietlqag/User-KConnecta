package project.kconnecta.user.backend.feature.policy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Reads the current AI-moderation policy at runtime. Phase 1 only exposes {@code enabled};
 * the remaining flags (sensitivity / detect / autoHidePost / autoWarning / autoBan) are
 * deferred to a later phase.
 */
@Component
@RequiredArgsConstructor
public class AiModerationPolicyReader {

    private final PolicyService policyService;

    /** True when AI moderation is on. Defaults to true when the key is absent (matches default-config + frontend). */
    public boolean isEnabled() {
        return policyService.getConfigJson().path("aiModeration").path("enabled").asBoolean(true);
    }
}
