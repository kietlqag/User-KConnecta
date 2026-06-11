package project.kconnecta.user.backend.feature.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import project.kconnecta.user.backend.feature.policy.dto.AiModerationConfigRequest;
import project.kconnecta.user.backend.feature.policy.dto.PublicPolicyResponse;

public interface PolicyService {

    JsonNode getConfigJson();

    String getConfigJsonRaw();

    PublicPolicyResponse getPublicPolicies();

    JsonNode saveConfig(JsonNode config, String updatedBy);

    void saveAiModerationConfig(AiModerationConfigRequest config, String updatedBy);
}
