package project.kconnecta.user.backend.feature.policy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import project.kconnecta.user.backend.feature.policy.dto.PolicyKeywordMergeResult;
import project.kconnecta.user.backend.feature.policy.entity.PolicyKeyword;
import project.kconnecta.user.backend.feature.policy.entity.enums.KeywordCategory;
import project.kconnecta.user.backend.feature.policy.repository.PolicyKeywordRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PolicyKeywordServiceTest {

    @Mock
    private PolicyKeywordRepository repository;

    @InjectMocks
    private project.kconnecta.user.backend.feature.policy.service.impl.PolicyKeywordServiceImpl policyKeywordService;

    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(policyKeywordService, "objectMapper", mapper);
    }

    @Test
    void replaceAll_replacesTableAndDedupesByValueAndCategory() throws Exception {
        when(repository.save(any(PolicyKeyword.class))).thenAnswer(inv -> inv.getArgument(0));

        String json = """
                [
                  {"id":"k1","value":"đm","category":"blacklist"},
                  {"id":"k2","value":"đm","category":"blacklist"},
                  {"id":"k3","value":"casino","category":"blocked_domain"}
                ]
                """;
        policyKeywordService.replaceAll(mapper.readTree(json));

        verify(repository).deleteAllKeywords();
        ArgumentCaptor<PolicyKeyword> captor = ArgumentCaptor.forClass(PolicyKeyword.class);
        verify(repository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertThat(captor.getAllValues()).extracting(PolicyKeyword::getValue)
                .containsExactlyInAnyOrder("đm", "casino");
    }

    @Test
    void mergeFromDefault_addsOnlyMissingKeywords() throws Exception {
        when(repository.save(any(PolicyKeyword.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.findAllByOrderByCategoryAscValueAsc()).thenReturn(List.of(
                PolicyKeyword.builder()
                        .id("wl-1")
                        .value("đm")
                        .category(KeywordCategory.WATCHLIST)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build()
        ));
        when(repository.count()).thenReturn(3L);

        String defaults = """
                [
                  {"id":"bl-1","value":"đm","category":"blacklist"},
                  {"id":"wl-1","value":"đm","category":"watchlist"},
                  {"id":"bd-1","value":"casino","category":"blocked_domain"}
                ]
                """;
        PolicyKeywordMergeResult result = policyKeywordService.mergeFromDefault(mapper.readTree(defaults));

        assertThat(result.added()).isEqualTo(2);
        assertThat(result.skipped()).isEqualTo(1);
        assertThat(result.totalKeywords()).isEqualTo(3);
    }

    @Test
    void findAllAsJsonArray_mapsEntitiesToJson() {
        when(repository.findAllByOrderByCategoryAscValueAsc()).thenReturn(List.of(
                PolicyKeyword.builder()
                        .id("bl-1")
                        .value("đm")
                        .category(KeywordCategory.BLACKLIST)
                        .keywordGroup("profanity")
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build()
        ));

        ArrayNode array = policyKeywordService.findAllAsJsonArray();

        assertThat(array).hasSize(1);
        assertThat(array.get(0).path("value").asText()).isEqualTo("đm");
        assertThat(array.get(0).path("category").asText()).isEqualTo("blacklist");
        assertThat(array.get(0).path("group").asText()).isEqualTo("profanity");
    }

    @Test
    void migrateFromLegacyJsonIfNeeded_importsWhenTableEmpty() throws Exception {
        when(repository.save(any(PolicyKeyword.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.count()).thenReturn(0L, 1L);

        String legacy = """
                {
                  "keywords": [{"id":"k1","value":"spam","category":"blacklist"}],
                  "postPolicy": {"maxPostLength": 5000}
                }
                """;
        int migrated = policyKeywordService.migrateFromLegacyJsonIfNeeded(mapper.readTree(legacy));

        assertThat(migrated).isEqualTo(1);
        verify(repository).deleteAllKeywords();
        verify(repository).save(any(PolicyKeyword.class));
    }
}
