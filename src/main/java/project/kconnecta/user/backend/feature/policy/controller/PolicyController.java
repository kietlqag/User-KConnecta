package project.kconnecta.user.backend.feature.policy.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.policy.dto.AiModerationConfigRequest;
import project.kconnecta.user.backend.feature.policy.dto.PublicPolicyResponse;
import project.kconnecta.user.backend.feature.policy.service.PolicyService;

@RestController
@RequestMapping("/api/v1/policies")
@RequiredArgsConstructor
public class PolicyController {

    private final PolicyService policyService;

    @GetMapping("/public")
    public ResponseEntity<PublicPolicyResponse> getPublicPolicies() {
        return ResponseEntity.ok(policyService.getPublicPolicies());
    }

    @PutMapping("/ai-moderation")
    public ResponseEntity<Void> saveAiModerationConfig(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody AiModerationConfigRequest request) {
        String updatedBy = principal != null ? principal.getUserId().toString() : "admin";
        policyService.saveAiModerationConfig(request, updatedBy);
        return ResponseEntity.noContent().build();
    }
}
