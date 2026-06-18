package project.kconnecta.user.backend.feature.policy.service.impl;



import com.fasterxml.jackson.databind.JsonNode;

import com.fasterxml.jackson.databind.ObjectMapper;

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

import project.kconnecta.user.backend.feature.policy.service.PolicyKeywordService;

import project.kconnecta.user.backend.feature.policy.service.PolicyService;



import java.io.IOException;

import java.time.LocalDateTime;

import java.util.ArrayList;

import java.util.List;



@Service

@RequiredArgsConstructor

@Slf4j

public class PolicyServiceImpl implements PolicyService {



    private final PlatformPolicyRepository repository;

    private final PolicyKeywordService policyKeywordService;

    private final ObjectMapper objectMapper;



    private volatile JsonNode cachedConfig;



    @PostConstruct

    public void init() {

        ensurePolicyExists();

        try {

            JsonNode raw = parseRawConfigFromDb();

            int migrated = policyKeywordService.migrateFromLegacyJsonIfNeeded(raw);

            if (migrated > 0) {

                persistConfigWithoutKeywords((ObjectNode) raw.deepCopy(), "system-migrate", false);

            } else if (policyKeywordService.count() == 0) {

                JsonNode defaultConfig = loadDefaultConfigJson();

                policyKeywordService.resetFromDefault(defaultConfig.path("keywords"));

            }

            cachedConfig = buildMergedConfig();

        } catch (IOException e) {

            throw new IllegalStateException("Failed to initialize platform policy", e);

        }

    }



    @Override

    public JsonNode getConfigJson() {

        JsonNode local = cachedConfig;

        if (local != null) {

            return local;

        }

        return refreshCachedConfig();

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

        try {

            ObjectNode mutable = (ObjectNode) objectMapper.readTree(objectMapper.writeValueAsString(config));

            JsonNode keywords = mutable.path("keywords");

            policyKeywordService.replaceAll(keywords.isMissingNode() || !keywords.isArray()

                    ? objectMapper.createArrayNode()

                    : keywords);

            mutable.remove("keywords");

            persistConfigWithoutKeywords(mutable, updatedBy, true);

            cachedConfig = buildMergedConfig();

            return cachedConfig;

        } catch (Exception e) {

            throw new IllegalArgumentException("Invalid policy JSON", e);

        }

    }



    private void ensurePolicyExists() {

        if (repository.existsById(PlatformPolicy.SINGLETON_ID)) {

            return;

        }

        try {

            JsonNode defaultConfig = loadDefaultConfigJson();

            ObjectNode withoutKeywords = (ObjectNode) defaultConfig.deepCopy();

            withoutKeywords.remove("keywords");

            withoutKeywords.set("auditLog", objectMapper.createArrayNode());



            PlatformPolicy policy = PlatformPolicy.builder()

                    .id(PlatformPolicy.SINGLETON_ID)

                    .configJson(objectMapper.writeValueAsString(withoutKeywords))

                    .updatedAt(LocalDateTime.now())

                    .updatedBy("system")

                    .build();

            repository.save(policy);

            policyKeywordService.resetFromDefault(defaultConfig.path("keywords"));

            log.info("Seeded default platform policy and keywords table");

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

    public JsonNode resetToDefault(String updatedBy) {

        try {

            JsonNode defaultConfig = loadDefaultConfigJson();

            ObjectNode withoutKeywords = (ObjectNode) defaultConfig.deepCopy();

            withoutKeywords.remove("keywords");

            withoutKeywords.set("auditLog", objectMapper.createArrayNode());



            policyKeywordService.resetFromDefault(defaultConfig.path("keywords"));

            persistConfigWithoutKeywords(

                    withoutKeywords,

                    updatedBy != null ? updatedBy : "system-reset",

                    true);

            cachedConfig = buildMergedConfig();

            log.info("Reset platform policy to default config");

            return cachedConfig;

        } catch (IOException e) {

            throw new IllegalStateException("Failed to reset policy to default", e);

        }

    }



    @Override

    @Transactional

    public PolicyKeywordMergeResult mergeDefaultKeywords(String updatedBy) {

        try {

            JsonNode defaultKeywords = loadDefaultConfigJson().path("keywords");

            PolicyKeywordMergeResult result = policyKeywordService.mergeFromDefault(defaultKeywords);

            if (result.added() > 0) {

                touchMetadata(updatedBy != null ? updatedBy : "system-merge");

            }

            cachedConfig = buildMergedConfig();

            return result;

        } catch (IOException e) {

            throw new IllegalStateException("Failed to merge default policy keywords", e);

        }

    }



    private JsonNode loadDefaultConfigJson() throws IOException {

        ClassPathResource resource = new ClassPathResource("policy/default-config.json");

        return objectMapper.readTree(resource.getInputStream());

    }



    private JsonNode parseRawConfigFromDb() throws IOException {

        return objectMapper.readTree(getEntity().getConfigJson());

    }



    private JsonNode buildMergedConfig() {

        try {

            ObjectNode merged = (ObjectNode) loadDefaultConfigJson().deepCopy();

            merged.remove("keywords");

            ObjectNode dbConfig = (ObjectNode) parseRawConfigFromDb().deepCopy();

            dbConfig.remove("keywords");

            deepMerge(merged, dbConfig);

            merged.set("keywords", policyKeywordService.findAllAsJsonArray());

            return merged;

        } catch (IOException e) {

            throw new IllegalStateException("Invalid policy JSON in database", e);

        }

    }



    /**
     * Recursively merges {@code override} into {@code base} (mutating base): nested objects merge
     * key-by-key; scalars and arrays from override replace base. Lets old DB rows missing a section
     * (e.g. {@code aiModeration} / nested {@code detect}) inherit defaults while DB values always win.
     */
    private static ObjectNode deepMerge(ObjectNode base, ObjectNode override) {
        override.fieldNames().forEachRemaining(field -> {
            JsonNode o = override.get(field);
            JsonNode b = base.get(field);
            if (o != null && o.isObject() && b != null && b.isObject()) {
                deepMerge((ObjectNode) b, (ObjectNode) o);
            } else {
                base.set(field, o);
            }
        });
        return base;
    }

    private JsonNode refreshCachedConfig() {

        cachedConfig = buildMergedConfig();

        return cachedConfig;

    }



    private void persistConfigWithoutKeywords(ObjectNode configWithoutKeywords, String updatedBy, boolean touchMetadata) {

        configWithoutKeywords.remove("keywords");

        try {

            PlatformPolicy entity = getEntity();

            entity.setConfigJson(objectMapper.writeValueAsString(configWithoutKeywords));

            if (touchMetadata) {

                entity.setUpdatedAt(LocalDateTime.now());

                entity.setUpdatedBy(updatedBy != null ? updatedBy : "admin");

            }

            repository.save(entity);

        } catch (Exception e) {

            throw new IllegalArgumentException("Invalid policy JSON");

        }

    }



    private void touchMetadata(String updatedBy) {

        PlatformPolicy entity = getEntity();

        entity.setUpdatedAt(LocalDateTime.now());

        entity.setUpdatedBy(updatedBy);

        repository.save(entity);

    }

}


