package project.kconnecta.user.backend.feature.policy.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.policy.dto.PolicyKeywordMergeResult;
import project.kconnecta.user.backend.feature.policy.entity.PolicyKeyword;
import project.kconnecta.user.backend.feature.policy.entity.enums.KeywordCategory;
import project.kconnecta.user.backend.feature.policy.repository.PolicyKeywordRepository;
import project.kconnecta.user.backend.feature.policy.service.PolicyKeywordService;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PolicyKeywordServiceImpl implements PolicyKeywordService {

    private final PolicyKeywordRepository repository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public long count() {
        return repository.count();
    }

    @Override
    @Transactional(readOnly = true)
    public ArrayNode findAllAsJsonArray() {
        ArrayNode array = objectMapper.createArrayNode();
        for (PolicyKeyword keyword : repository.findAllByOrderByCategoryAscValueAsc()) {
            array.add(toJsonNode(keyword));
        }
        return array;
    }

    @Override
    @Transactional
    public void replaceAll(JsonNode keywords) {
        repository.deleteAllKeywords();
        if (keywords == null || !keywords.isArray() || keywords.isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        Set<String> seen = new HashSet<>();
        for (JsonNode kw : keywords) {
            PolicyKeyword entity = fromJsonNode(kw, now);
            if (entity.getValue().isBlank()) {
                continue;
            }
            String dedupeKey = dedupeKey(entity.getCategory(), entity.getValue());
            if (!seen.add(dedupeKey)) {
                log.warn("Skipping duplicate keyword on save: {} ({})", entity.getValue(), entity.getCategory());
                continue;
            }
            repository.save(entity);
        }
    }

    @Override
    @Transactional
    public PolicyKeywordMergeResult mergeFromDefault(JsonNode defaultKeywords) {
        if (defaultKeywords == null || !defaultKeywords.isArray()) {
            throw new IllegalStateException("default-config.json has no keywords array");
        }

        Set<String> seen = new HashSet<>();
        for (PolicyKeyword existing : repository.findAllByOrderByCategoryAscValueAsc()) {
            seen.add(dedupeKey(existing.getCategory(), existing.getValue()));
        }

        int added = 0;
        int skipped = 0;
        LocalDateTime now = LocalDateTime.now();
        for (JsonNode kw : defaultKeywords) {
            PolicyKeyword entity = fromJsonNode(kw, now);
            if (entity.getValue().isBlank()) {
                skipped++;
                continue;
            }
            String key = dedupeKey(entity.getCategory(), entity.getValue());
            if (seen.contains(key)) {
                skipped++;
                continue;
            }
            repository.save(entity);
            seen.add(key);
            added++;
        }

        long total = repository.count();
        if (added > 0) {
            log.info("Merged default policy keywords into table: added={}, skipped={}, total={}", added, skipped, total);
        } else {
            log.debug("Default policy keywords already up to date (skipped={})", skipped);
        }
        return new PolicyKeywordMergeResult(added, skipped, (int) total);
    }

    @Override
    @Transactional
    public void resetFromDefault(JsonNode defaultKeywords) {
        repository.deleteAllKeywords();
        if (defaultKeywords == null || !defaultKeywords.isArray()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        Set<String> seen = new HashSet<>();
        for (JsonNode kw : defaultKeywords) {
            PolicyKeyword entity = fromJsonNode(kw, now);
            if (entity.getValue().isBlank()) {
                continue;
            }
            String key = dedupeKey(entity.getCategory(), entity.getValue());
            if (!seen.add(key)) {
                continue;
            }
            repository.save(entity);
        }
        log.info("Reset policy keywords table from default config (total={})", repository.count());
    }

    @Override
    @Transactional
    public int migrateFromLegacyJsonIfNeeded(JsonNode legacyConfig) {
        if (repository.count() > 0 || legacyConfig == null) {
            return 0;
        }
        JsonNode keywords = legacyConfig.path("keywords");
        if (!keywords.isArray() || keywords.isEmpty()) {
            return 0;
        }
        replaceAll(keywords);
        int migrated = (int) repository.count();
        log.info("Migrated {} keywords from legacy platform_policies.config_json", migrated);
        return migrated;
    }

    private ObjectNode toJsonNode(PolicyKeyword keyword) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("id", keyword.getId());
        node.put("value", keyword.getValue());
        node.put("category", keyword.getCategory().toJson());
        if (keyword.getKeywordGroup() != null && !keyword.getKeywordGroup().isBlank()) {
            node.put("group", keyword.getKeywordGroup());
        }
        return node;
    }

    private PolicyKeyword fromJsonNode(JsonNode kw, LocalDateTime now) {
        String id = kw.path("id").asText("");
        if (id.isBlank()) {
            id = "kw-" + UUID.randomUUID();
        }
        String value = kw.path("value").asText("").trim();
        KeywordCategory category = KeywordCategory.fromJson(kw.path("category").asText(""));
        String group = kw.path("group").asText(null);
        if (group == null || group.isBlank()) {
            group = kw.path("note").asText(null);
        }
        return PolicyKeyword.builder()
                .id(id)
                .value(value)
                .category(category)
                .keywordGroup(group)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    private static String dedupeKey(KeywordCategory category, String value) {
        return category.toJson() + "|" + value.trim().toLowerCase(Locale.ROOT);
    }
}
