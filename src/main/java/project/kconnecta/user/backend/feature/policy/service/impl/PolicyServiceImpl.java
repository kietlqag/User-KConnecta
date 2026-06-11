package project.kconnecta.user.backend.feature.policy.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.node.ObjectNode;
import project.kconnecta.user.backend.feature.policy.dto.AiModerationConfigRequest;
import project.kconnecta.user.backend.feature.policy.dto.PublicPolicyResponse;
import project.kconnecta.user.backend.feature.policy.entity.PlatformPolicy;
import project.kconnecta.user.backend.feature.policy.repository.PlatformPolicyRepository;
import project.kconnecta.user.backend.feature.policy.service.PolicyService;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PolicyServiceImpl implements PolicyService {

    private final PlatformPolicyRepository repository;
    private final ObjectMapper objectMapper;

    private volatile JsonNode cachedConfig;

    @PostConstruct
    public void init() {
        ensurePolicyExists();
        cachedConfig = loadFromDb();
    }

    @Override
    public JsonNode getConfigJson() {
        JsonNode local = cachedConfig;
        if (local != null) {
            return local;
        }
        return loadFromDb();
    }

    @Override
    public String getConfigJsonRaw() {
        return getEntity().getConfigJson();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicPolicyResponse getPublicPolicies() {
        JsonNode config = getConfigJson();
        PlatformPolicy entity = getEntity();

        List<PublicPolicyResponse.CommunityRuleView> rules = new ArrayList<>();
        JsonNode communityRules = config.path("communityRules");
        if (communityRules.isArray()) {
            for (JsonNode rule : communityRules) {
                if (!rule.path("enabled").asBoolean(false)) {
                    continue;
                }
                rules.add(new PublicPolicyResponse.CommunityRuleView(
                        rule.path("id").asText(),
                        rule.path("label").asText(),
                        rule.path("description").asText(""),
                        rule.path("severity").asText("medium")
                ));
            }
        }

        JsonNode post = config.path("postPolicy");
        JsonNode chat = config.path("chatPolicy");
        JsonNode privacy = config.path("privacy");

        return new PublicPolicyResponse(
                entity.getUpdatedAt(),
                rules,
                new PublicPolicyResponse.PostPolicyView(
                        post.path("maxPostLength").asInt(5000),
                        post.path("maxImagesPerPost").asInt(10),
                        post.path("maxVideoMb").asInt(100),
                        post.path("allowedFileTypes").asText("jpg,png"),
                        post.path("postsPerMinute").asInt(3)
                ),
                new PublicPolicyResponse.ChatPolicyView(
                        chat.path("antiSpamEnabled").asBoolean(true),
                        chat.path("blockMaliciousLinks").asBoolean(true),
                        chat.path("messagesPerMinute").asInt(20),
                        chat.path("aiScanEnabled").asBoolean(true)
                ),
                new PublicPolicyResponse.PrivacyPolicyView(
                        privacy.path("logRetentionDays").asInt(90),
                        privacy.path("chatRetentionDays").asInt(30),
                        privacy.path("allowDataExport").asBoolean(true),
                        privacy.path("allowAccountDeletion").asBoolean(true),
                        privacy.path("cookiePolicyEnabled").asBoolean(true),
                        privacy.path("sessionMaxHours").asInt(168)
                ),
                config
        );
    }

    @Override
    @Transactional
    public JsonNode saveConfig(JsonNode config, String updatedBy) {
        if (config == null || config.isNull()) {
            throw new IllegalArgumentException("config is required");
        }
        PlatformPolicy entity = getEntity();
        try {
            entity.setConfigJson(objectMapper.writeValueAsString(config));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid policy JSON");
        }
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setUpdatedBy(updatedBy != null ? updatedBy : "admin");
        repository.save(entity);
        cachedConfig = config;
        return config;
    }

    private void ensurePolicyExists() {
        if (repository.existsById(PlatformPolicy.SINGLETON_ID)) {
            return;
        }
        try {
            ClassPathResource resource = new ClassPathResource("policy/default-config.json");
            String json = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            PlatformPolicy policy = PlatformPolicy.builder()
                    .id(PlatformPolicy.SINGLETON_ID)
                    .configJson(json)
                    .updatedAt(LocalDateTime.now())
                    .updatedBy("system")
                    .build();
            repository.save(policy);
            log.info("Seeded default platform policy");
        } catch (IOException e) {
            throw new IllegalStateException("Failed to seed default policy", e);
        }
    }

    private PlatformPolicy getEntity() {
        return repository.findById(PlatformPolicy.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Platform policy not initialized"));
    }

    @Override
    @Transactional
    public void saveAiModerationConfig(AiModerationConfigRequest config, String updatedBy) {
        try {
            ObjectNode mutable = (ObjectNode) objectMapper.readTree(objectMapper.writeValueAsString(getConfigJson()));
            ObjectNode aiNode = objectMapper.valueToTree(config);
            mutable.set("aiModeration", aiNode);
            saveConfig(mutable, updatedBy);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to save AI moderation config: " + e.getMessage());
        }
    }

    private JsonNode loadFromDb() {
        try {
            JsonNode node = objectMapper.readTree(getEntity().getConfigJson());
            cachedConfig = node;
            return node;
        } catch (Exception e) {
            throw new IllegalStateException("Invalid policy JSON in database", e);
        }
    }
}
