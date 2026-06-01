package project.kconnecta.user.backend.feature.policy.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record PolicyConfigUpdateRequest(JsonNode config, String updatedBy) {
}
