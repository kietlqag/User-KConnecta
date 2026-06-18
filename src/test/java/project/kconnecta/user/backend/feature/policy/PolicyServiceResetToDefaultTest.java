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
import org.springframework.test.util.ReflectionTestUtils;
import project.kconnecta.user.backend.feature.policy.entity.PlatformPolicy;
import project.kconnecta.user.backend.feature.policy.repository.PlatformPolicyRepository;
import project.kconnecta.user.backend.feature.policy.service.PolicyKeywordService;
import project.kconnecta.user.backend.feature.policy.service.impl.PolicyServiceImpl;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PolicyServiceResetToDefaultTest {

    @Mock
    private PlatformPolicyRepository repository;

    @Mock
    private PolicyKeywordService policyKeywordService;

    @InjectMocks
    private PolicyServiceImpl policyService;

    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        String existingJson = """
                {
                  "auditLog": [{"id":"a1","section":"keywords"}],
                  "postPolicy": {"maxPostLength": 999}
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

        ReflectionTestUtils.setField(policyService, "objectMapper", mapper);

        ArrayNode defaultKeywords = mapper.createArrayNode();
        IntStream.range(0, 55).forEach(i ->
                defaultKeywords.addObject().put("id", "bl-" + i).put("value", "kw" + i).put("category", "blacklist"));
        when(policyKeywordService.findAllAsJsonArray()).thenReturn(defaultKeywords);

        var field = PolicyServiceImpl.class.getDeclaredField("cachedConfig");
        field.setAccessible(true);
        ObjectNode cached = (ObjectNode) mapper.readTree(existingJson);
        cached.set("keywords", defaultKeywords);
        field.set(policyService, cached);
    }

    @Test
    void resetToDefault_resetsKeywordTableAndStripsKeywordsFromStoredJson() throws Exception {
        JsonNode result = policyService.resetToDefault("admin");

        verify(policyKeywordService).resetFromDefault(any());

        ArgumentCaptor<PlatformPolicy> captor = ArgumentCaptor.forClass(PlatformPolicy.class);
        verify(repository).save(captor.capture());

        JsonNode saved = mapper.readTree(captor.getValue().getConfigJson());
        assertThat(saved.path("postPolicy").path("maxPostLength").asInt()).isEqualTo(5000);
        assertThat(saved.path("auditLog")).isInstanceOf(ArrayNode.class);
        assertThat(saved.path("auditLog")).isEmpty();
        assertThat(saved.has("keywords")).isFalse();

        assertThat(result.path("keywords").size()).isGreaterThan(50);
    }
}
