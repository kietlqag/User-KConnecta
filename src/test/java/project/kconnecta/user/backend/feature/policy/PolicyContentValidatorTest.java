package project.kconnecta.user.backend.feature.policy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.kconnecta.user.backend.exception.ChatValidationException;
import project.kconnecta.user.backend.feature.policy.service.PolicyService;
import project.kconnecta.user.backend.feature.policy.service.PolicyContentValidator;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PolicyContentValidatorTest {

    @Mock
    private PolicyService policyService;

    @InjectMocks
    private PolicyContentValidator validator;

    private final ObjectMapper mapper = new ObjectMapper();
    private final UUID userId = UUID.randomUUID();

    private JsonNode configWith(int messagesPerMinute, boolean antiSpam, boolean blockLinks) throws Exception {
        String json = """
                {
                  "chatPolicy": {
                    "antiSpamEnabled": %b,
                    "messagesPerMinute": %d,
                    "blockMaliciousLinks": %b
                  },
                  "postPolicy": {
                    "maxPostLength": 5000,
                    "maxImagesPerPost": 10,
                    "postsPerMinute": 3
                  },
                  "keywords": []
                }
                """.formatted(antiSpam, messagesPerMinute, blockLinks);
        return mapper.readTree(json);
    }

    private JsonNode configWithKeyword(String keyword) throws Exception {
        String json = """
                {
                  "chatPolicy": { "antiSpamEnabled": false, "messagesPerMinute": 20, "blockMaliciousLinks": false },
                  "postPolicy": { "maxPostLength": 5000, "maxImagesPerPost": 10, "postsPerMinute": 3 },
                  "keywords": [{ "value": "%s", "category": "banned" }]
                }
                """.formatted(keyword);
        return mapper.readTree(json);
    }

    private JsonNode configWithBlockedDomain(String domain) throws Exception {
        String json = """
                {
                  "chatPolicy": { "antiSpamEnabled": false, "messagesPerMinute": 20, "blockMaliciousLinks": true },
                  "postPolicy": { "maxPostLength": 5000, "maxImagesPerPost": 10, "postsPerMinute": 3 },
                  "keywords": [{ "value": "%s", "category": "blocked_domain" }]
                }
                """.formatted(domain);
        return mapper.readTree(json);
    }

    @BeforeEach
    void setUp() throws Exception {
        // default config used by most tests — overridden per-test via when()
    }

    // ── rate limit ──────────────────────────────────────────────────────────

    @Test
    void rateLimit_underLimit_passes() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWith(5, true, false));

        for (int i = 0; i < 5; i++) {
            assertThatNoException().isThrownBy(
                () -> validator.validateChatMessage(userId, "hi", null, null)
            );
        }
    }

    @Test
    void rateLimit_exceedsLimit_throwsChatRateLimited() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWith(3, true, false));

        for (int i = 0; i < 3; i++) {
            validator.validateChatMessage(userId, "hi", null, null);
        }

        assertThatThrownBy(() -> validator.validateChatMessage(userId, "hi", null, null))
            .isInstanceOf(ChatValidationException.class)
            .satisfies(ex -> {
                ChatValidationException e = (ChatValidationException) ex;
                assertThat(e.getCode()).isEqualTo("CHAT_RATE_LIMITED");
                assertThat(e.getRetryAfterSeconds()).isGreaterThanOrEqualTo(1);
                assertThat(e.getRetryAfterSeconds()).isLessThanOrEqualTo(60);
            });
    }

    @Test
    void rateLimit_carriesConversationIdAndMessageClientId() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWith(1, true, false));
        UUID convId = UUID.randomUUID();
        String clientId = "client-abc";

        validator.validateChatMessage(userId, "hi", convId, clientId);

        assertThatThrownBy(() -> validator.validateChatMessage(userId, "hi", convId, clientId))
            .isInstanceOf(ChatValidationException.class)
            .satisfies(ex -> {
                ChatValidationException e = (ChatValidationException) ex;
                assertThat(e.getConversationId()).isEqualTo(convId.toString());
                assertThat(e.getMessageClientId()).isEqualTo(clientId);
            });
    }

    @Test
    void rateLimit_differentUsers_trackedSeparately() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWith(1, true, false));
        UUID user2 = UUID.randomUUID();

        validator.validateChatMessage(userId, "hi", null, null);
        // user2 should NOT be rate-limited even though userId is
        assertThatNoException().isThrownBy(
            () -> validator.validateChatMessage(user2, "hi", null, null)
        );
    }

    @Test
    void rateLimit_disabled_neverBlocks() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWith(1, false, false));

        for (int i = 0; i < 20; i++) {
            assertThatNoException().isThrownBy(
                () -> validator.validateChatMessage(userId, "hi", null, null)
            );
        }
    }

    // ── keyword blocking ────────────────────────────────────────────────────

    @Test
    void keyword_blocked_throwsChatBlockedKeyword() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithKeyword("badword"));

        assertThatThrownBy(() -> validator.validateChatMessage(userId, "this has badword in it", null, null))
            .isInstanceOf(ChatValidationException.class)
            .satisfies(ex -> {
                ChatValidationException e = (ChatValidationException) ex;
                assertThat(e.getCode()).isEqualTo("CHAT_BLOCKED_KEYWORD");
                assertThat(e.getRetryAfterSeconds()).isNull();
            });
    }

    @Test
    void keyword_caseInsensitive_blocked() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithKeyword("badword"));

        assertThatThrownBy(() -> validator.validateChatMessage(userId, "BADWORD here", null, null))
            .isInstanceOf(ChatValidationException.class)
            .extracting("code").isEqualTo("CHAT_BLOCKED_KEYWORD");
    }

    @Test
    void keyword_clean_passes() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithKeyword("badword"));

        assertThatNoException().isThrownBy(
            () -> validator.validateChatMessage(userId, "hello world", null, null)
        );
    }

    // ── malicious link blocking ─────────────────────────────────────────────

    @Test
    void blockedDomain_inMessage_throwsChatMaliciousLink() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithBlockedDomain("evil.com"));

        assertThatThrownBy(() -> validator.validateChatMessage(userId, "check https://evil.com/phish", null, null))
            .isInstanceOf(ChatValidationException.class)
            .satisfies(ex -> {
                ChatValidationException e = (ChatValidationException) ex;
                assertThat(e.getCode()).isEqualTo("CHAT_MALICIOUS_LINK");
                assertThat(e.getRetryAfterSeconds()).isNull();
            });
    }

    @Test
    void blockedDomain_notPresent_passes() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithBlockedDomain("evil.com"));

        assertThatNoException().isThrownBy(
            () -> validator.validateChatMessage(userId, "check https://safe.com/page", null, null)
        );
    }
}
