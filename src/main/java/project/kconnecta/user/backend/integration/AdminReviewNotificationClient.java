package project.kconnecta.user.backend.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class AdminReviewNotificationClient {

    private final RestTemplate restTemplate;

    @Value("${admin-service.url:http://localhost:8082}")
    private String adminServiceUrl;

    @Value("${admin-service.internal-key:kconnecta-internal-secret}")
    private String internalKey;

    public AdminReviewNotificationClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void notifyAccountReviewRequest(UUID userId, String username, String reason) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "username", username != null ? username : "",
                    "reason", reason != null ? reason : ""
            );
            restTemplate.postForEntity(
                    adminServiceUrl + "/api/v1/internal/account-review-requests",
                    new HttpEntity<>(body, headers),
                    Void.class
            );
        } catch (Exception ex) {
            log.warn("Failed to notify admin of account review request for user {}: {}", userId, ex.getMessage());
        }
    }
}
