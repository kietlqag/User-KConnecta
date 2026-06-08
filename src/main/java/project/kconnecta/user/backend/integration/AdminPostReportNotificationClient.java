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
public class AdminPostReportNotificationClient {

    private final RestTemplate restTemplate;

    @Value("${admin-service.url:http://localhost:8082}")
    private String adminServiceUrl;

    @Value("${admin-service.internal-key:kconnecta-internal-secret}")
    private String internalKey;

    public AdminPostReportNotificationClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void notifyPostReport(UUID reporterId, UUID postId, String reporterUsername, String reason) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);
            Map<String, Object> body = Map.of(
                    "reporterId", reporterId,
                    "postId", postId,
                    "reporterUsername", reporterUsername != null ? reporterUsername : "",
                    "reason", reason != null ? reason : ""
            );
            restTemplate.postForEntity(
                    adminServiceUrl + "/api/v1/internal/post-report-requests",
                    new HttpEntity<>(body, headers),
                    Void.class
            );
        } catch (Exception ex) {
            log.warn("Failed to notify admin of post report {} by {}: {}", postId, reporterId, ex.getMessage());
        }
    }
}
