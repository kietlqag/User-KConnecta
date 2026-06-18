package project.kconnecta.user.backend.feature.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import project.kconnecta.user.backend.feature.policy.dto.PolicyKeywordMergeResult;

public interface PolicyKeywordService {

    long count();

    ArrayNode findAllAsJsonArray();

    void replaceAll(JsonNode keywords);

    PolicyKeywordMergeResult mergeFromDefault(JsonNode defaultKeywords);

    void resetFromDefault(JsonNode defaultKeywords);

    /**
     * If the table is empty and legacy config JSON still has a keywords array, import once.
     *
     * @return number of keywords migrated, or 0 if nothing to do
     */
    int migrateFromLegacyJsonIfNeeded(JsonNode legacyConfig);
}
