package project.kconnecta.user.backend.feature.policy.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.policy.dto.AiModerationConfigRequest;
import project.kconnecta.user.backend.feature.policy.dto.PolicyKeywordMergeResult;
import project.kconnecta.user.backend.feature.policy.dto.PublicPolicyResponse;
import project.kconnecta.user.backend.feature.policy.entity.PlatformPolicy;
import project.kconnecta.user.backend.feature.policy.repository.PlatformPolicyRepository;
import project.kconnecta.user.backend.feature.policy.service.PolicyService;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

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
                        chat.path("messagesPerMinute").asInt(10),
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
            String json = objectMapper.writeValueAsString(loadDefaultConfigJson());
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

    @Override
    @Transactional
    public PolicyKeywordMergeResult mergeDefaultKeywords(String updatedBy) {
        try {
            ObjectNode current = (ObjectNode) objectMapper.readTree(objectMapper.writeValueAsString(getConfigJson()));
            JsonNode defaultConfig = loadDefaultConfigJson();
            JsonNode defaultKeywords = defaultConfig.path("keywords");
            if (!defaultKeywords.isArray()) {
                throw new IllegalStateException("default-config.json has no keywords array");
            }

            ArrayNode mergedKeywords = objectMapper.createArrayNode();
            Set<String> seen = new HashSet<>();

            JsonNode existingKeywords = current.path("keywords");
            if (existingKeywords.isArray()) {
                for (JsonNode kw : existingKeywords) {
                    mergedKeywords.add(kw.deepCopy());
                    seen.add(keywordDedupeKey(kw));
                }
            }

            int added = 0;
            int skipped = 0;
            for (JsonNode kw : defaultKeywords) {
                String key = keywordDedupeKey(kw);
                if (seen.contains(key)) {
                    skipped++;
                    continue;
                }
                mergedKeywords.add(kw.deepCopy());
                seen.add(key);
                added++;
            }

            if (added == 0) {
                log.debug("Default policy keywords already up to date (skipped={})", skipped);
                return new PolicyKeywordMergeResult(0, skipped, mergedKeywords.size());
            }

            current.set("keywords", mergedKeywords);
            saveConfig(current, updatedBy != null ? updatedBy : "system-merge");
            log.info("Merged default policy keywords: added={}, skipped={}, total={}", added, skipped, mergedKeywords.size());
            return new PolicyKeywordMergeResult(added, skipped, mergedKeywords.size());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to merge default policy keywords", e);
        }
    }

    private JsonNode loadDefaultConfigJson() throws IOException {
        ClassPathResource resource = new ClassPathResource("policy/default-config.json");
        return objectMapper.readTree(resource.getInputStream());
    }

    private static String keywordDedupeKey(JsonNode kw) {
        String category = kw.path("category").asText("").trim().toLowerCase(Locale.ROOT);
        String value = kw.path("value").asText("").trim().toLowerCase(Locale.ROOT);
        return category + "|" + value;
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
