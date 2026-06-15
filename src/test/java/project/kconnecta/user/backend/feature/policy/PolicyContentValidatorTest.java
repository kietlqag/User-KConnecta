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
import project.kconnecta.user.backend.exception.ValidationException;
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

    // ── suspect pre-filter (comment moderation) ─────────────────────────────

    private JsonNode configWithWatchlist(String keyword) throws Exception {
        String json = """
                {
                  "keywords": [{ "value": "%s", "category": "watchlist" }]
                }
                """.formatted(keyword);
        return mapper.readTree(json);
    }

    @Test
    void isSuspect_watchlistKeyword_true() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("đồ ngu"));
        assertThat(validator.isSuspect("mày đúng là đồ ngu")).isTrue();
    }

    @Test
    void isSuspect_containsUrl_true_withoutCallingConfig() {
        // URL is detected before reading config — no stubbing needed.
        assertThat(validator.isSuspect("xem ở https://spam.example/x")).isTrue();
    }

    @Test
    void isSuspect_cleanText_false() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("đồ ngu"));
        assertThat(validator.isSuspect("hôm nay trời đẹp quá")).isFalse();
    }

    @Test
    void isSuspect_blankOrNull_false() {
        // Returns before touching config.
        assertThat(validator.isSuspect("   ")).isFalse();
        assertThat(validator.isSuspect(null)).isFalse();
    }

    // ── accent-folding (né dấu) ─────────────────────────────────────────────

    @Test
    void isSuspect_accentStrippedMultiWordKeyword_true() throws Exception {
        // "con cho" không dấu phải khớp watchlist "con chó".
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("con chó"));
        assertThat(validator.isSuspect("thằng này đúng là con cho")).isTrue();
    }

    @Test
    void isSuspect_shortSingleWordNoAccent_true() throws Exception {
        // "giet" (không dấu) phải khớp watchlist "giết" — kể cả từ ngắn.
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("giết"));
        assertThat(validator.isSuspect("tao se giet may")).isTrue();
    }

    @Test
    void isSuspect_leetspeakSubstitution_true() throws Exception {
        // Né bằng ký tự số/biểu tượng: "c0n ch0" phải khớp "con chó".
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("con chó"));
        assertThat(validator.isSuspect("dm thang c0n ch0")).isTrue();
    }

    @Test
    void isSuspect_collapsesExtraWhitespace_true() throws Exception {
        // Né bằng nhiều khoảng trắng: "con    cho" phải khớp "con chó".
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("con chó"));
        assertThat(validator.isSuspect("con    cho")).isTrue();
    }

    // ── watchlist mềm cho comment, cứng cho post/chat ───────────────────────

    @Test
    void validateComment_watchlistKeyword_doesNotThrow() throws Exception {
        // Watchlist là vùng xám với comment → không chặn cứng, để isSuspect đẩy sang AI.
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("con chó"));
        assertThatNoException().isThrownBy(() -> validator.validateComment("đồ con chó"));
    }

    @Test
    void validateComment_blacklistKeyword_throws() throws Exception {
        // Blacklist vẫn chặn cứng ngay cả với comment.
        when(policyService.getConfigJson()).thenReturn(configWithKeyword("từ tục"));
        assertThatThrownBy(() -> validator.validateComment("đây là từ tục"))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void validateComment_blockedDomainPlainText_throws() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithBlockedDomain("casino"));
        assertThatThrownBy(() -> validator.validateComment("casino"))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void validateComment_blockedDomainWithoutScheme_throws() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithBlockedDomain("bit.ly/phish"));
        assertThatThrownBy(() -> validator.validateComment("bit.ly/phish"))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void validatePost_watchlistKeyword_stillBlocks() throws Exception {
        // Post vẫn chặn cứng watchlist (không có hàng đợi PENDING như comment).
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("con chó"));
        assertThatThrownBy(() -> validator.validatePost(userId, "đồ con chó", 0))
            .isInstanceOf(ValidationException.class);
    }
}
