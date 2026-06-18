package project.kconnecta.user.backend.feature.policy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

/**
 * Verifies {@code buildMergedConfig()} layers the DB config on top of the classpath
 * default-config.json, so legacy rows missing {@code aiModeration} still expose a complete
 * config (incl. nested {@code detect}) while DB values keep winning.
 * Mirrors the Mockito + AssertJ style of {@link PolicyServiceResetToDefaultTest}.
 */
@ExtendWith(MockitoExtension.class)
class PolicyServiceMergeDefaultsTest {

    @Mock
    private PlatformPolicyRepository repository;
    @Mock
    private PolicyKeywordService policyKeywordService;

    @InjectMocks
    private PolicyServiceImpl policyService;

    private final ObjectMapper mapper = new ObjectMapper();

    private void seed(String configJson) {
        PlatformPolicy entity = PlatformPolicy.builder()
                .id(PlatformPolicy.SINGLETON_ID)
                .configJson(configJson)
                .updatedAt(LocalDateTime.now())
                .updatedBy("test")
                .build();
        lenient().when(repository.findById(PlatformPolicy.SINGLETON_ID)).thenReturn(Optional.of(entity));
        lenient().when(policyKeywordService.findAllAsJsonArray()).thenReturn(mapper.createArrayNode());
        ReflectionTestUtils.setField(policyService, "objectMapper", mapper);
    }

    @Test
    void getConfigJson_fillsAiModerationFromDefaults_whenMissingInDb() {
        seed("""
                { "postPolicy": {"maxPostLength": 999} }
                """);

        JsonNode config = policyService.getConfigJson();

        JsonNode ai = config.path("aiModeration");
        assertThat(ai.path("enabled").asBoolean()).isTrue();
        assertThat(ai.path("detect").path("toxic").asBoolean()).isTrue();
        assertThat(ai.path("detect").path("scam").asBoolean()).isTrue();
        // DB value still wins for sections it does define.
        assertThat(config.path("postPolicy").path("maxPostLength").asInt()).isEqualTo(999);
    }

    @Test
    void getConfigJson_deepMergesDetect_andKeepsDbScalarOverride() {
        // DB has aiModeration but only overrides `enabled` and one detect flag.
        seed("""
                { "aiModeration": { "enabled": false, "detect": { "toxic": false } } }
                """);

        JsonNode ai = policyService.getConfigJson().path("aiModeration");

        assertThat(ai.path("enabled").asBoolean()).isFalse();          // DB override wins
        assertThat(ai.path("detect").path("toxic").asBoolean()).isFalse(); // DB override wins
        assertThat(ai.path("detect").path("spam").asBoolean()).isTrue();   // filled from defaults
        assertThat(ai.path("sensitivity").asInt()).isEqualTo(72);          // filled from defaults
    }
}
