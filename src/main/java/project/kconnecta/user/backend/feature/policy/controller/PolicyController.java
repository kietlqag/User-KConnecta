package project.kconnecta.user.backend.feature.policy.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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
}
