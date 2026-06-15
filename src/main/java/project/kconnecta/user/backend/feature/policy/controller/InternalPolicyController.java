package project.kconnecta.user.backend.feature.policy.controller;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.security.MessageDigest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.user.backend.feature.policy.dto.PolicyConfigUpdateRequest;
import project.kconnecta.user.backend.feature.policy.service.PolicyService;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/policies")
@RequiredArgsConstructor
public class InternalPolicyController {

    @Value("${internal.api.key}")
    private String internalApiKey;

    private final PolicyService policyService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getConfig(@RequestHeader("X-Internal-Key") String key) {
        validateKey(key);
        return ResponseEntity.ok(Map.of(
                "config", policyService.getConfigJson(),
                "raw", policyService.getConfigJsonRaw()
        ));
    }

    @PutMapping
    public ResponseEntity<JsonNode> saveConfig(
            @RequestHeader("X-Internal-Key") String key,
            @RequestBody PolicyConfigUpdateRequest request) {
        validateKey(key);
        JsonNode saved = policyService.saveConfig(request.config(), request.updatedBy());
        return ResponseEntity.ok(saved);
    }

    private void validateKey(String key) {
        if (!MessageDigest.isEqual(
                internalApiKey.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                key.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal key");
        }
    }
}
