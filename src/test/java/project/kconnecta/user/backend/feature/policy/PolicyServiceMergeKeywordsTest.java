package project.kconnecta.user.backend.feature.policy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.kconnecta.user.backend.feature.policy.entity.PlatformPolicy;
import project.kconnecta.user.backend.feature.policy.repository.PlatformPolicyRepository;
import project.kconnecta.user.backend.feature.policy.service.impl.PolicyServiceImpl;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PolicyServiceMergeKeywordsTest {

    @Mock
    private PlatformPolicyRepository repository;

    @InjectMocks
    private PolicyServiceImpl policyService;

    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        String existingJson = """
                {
                  "keywords": [
                    {"id":"old-1","value":"đm","category":"watchlist"},
                    {"id":"old-2","value":"casino","category":"blocked_domain"}
                  ],
                  "postPolicy": {"maxPostLength": 5000}
                }
                """;
        PlatformPolicy entity = PlatformPolicy.builder()
                .id(PlatformPolicy.SINGLETON_ID)
                .configJson(existingJson)
                .updatedAt(LocalDateTime.now())
                .updatedBy("test")
                .build();

        when(repository.findById(PlatformPolicy.SINGLETON_ID)).thenReturn(Optional.of(entity));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Prime cache via reflection-free init: call getConfigJson through merge path prep
        var field = PolicyServiceImpl.class.getDeclaredField("cachedConfig");
        field.setAccessible(true);
        field.set(policyService, mapper.readTree(existingJson));
    }

    @Test
    void mergeDefaultKeywords_addsMissingAndSkipsDuplicates() throws Exception {
        var result = policyService.mergeDefaultKeywords("admin");

        assertThat(result.added()).isGreaterThan(0);
        assertThat(result.skipped()).isGreaterThan(0);
        assertThat(result.totalKeywords()).isEqualTo(result.added() + 2);

        ArgumentCaptor<PlatformPolicy> captor = ArgumentCaptor.forClass(PlatformPolicy.class);
        verify(repository).save(captor.capture());

        JsonNode saved = mapper.readTree(captor.getValue().getConfigJson());
        ArrayNode keywords = (ArrayNode) saved.path("keywords");

        boolean hasBlacklistDm = false;
        boolean hasWatchlistDm = false;
        for (JsonNode kw : keywords) {
            if ("đm".equalsIgnoreCase(kw.path("value").asText())) {
                if ("blacklist".equals(kw.path("category").asText())) {
                    hasBlacklistDm = true;
                }
                if ("watchlist".equals(kw.path("category").asText())) {
                    hasWatchlistDm = true;
                }
            }
        }
        assertThat(hasWatchlistDm).isTrue();
        assertThat(hasBlacklistDm).isTrue();
    }
}
