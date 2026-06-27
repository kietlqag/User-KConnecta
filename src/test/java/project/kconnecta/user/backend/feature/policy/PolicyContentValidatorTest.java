package project.kconnecta.user.backend.feature.policy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
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

    // ── chat moderation disabled ────────────────────────────────────────────

    @Test
    void validateChatMessage_isNoOp() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithKeyword("badword"));

        assertThatNoException().isThrownBy(() -> {
            for (int i = 0; i < 20; i++) {
                validator.validateChatMessage(userId, "hi", null, null);
            }
            validator.validateChatMessage(userId, "this has badword in it", null, null);
            validator.validateChatMessage(userId, "check https://evil.com/phish", null, null);
            String imagePayload = "__IMAGE__:{\"imageUrl\":\"https://cdn.example.com/a.jpg\",\"caption\":\"badword here\"}";
            validator.validateChatMessage(userId, imagePayload, null, null);
        });
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

    // ── watchlist mềm cho comment/post (AI duyệt), cứng cho chat ─────────────

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
    void validatePost_watchlistKeyword_doesNotThrow() throws Exception {
        // Watchlist là vùng xám — không chặn cứng bài viết; Gemini quyết định sau đó.
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("con chó"));
        assertThatNoException().isThrownBy(() -> validator.validatePost(userId, "đồ con chó", 0));
    }

    @Test
    void validatePost_idiomaticGietThoiGian_watchlistGiet_doesNotThrow() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithWatchlist("giết"));
        assertThatNoException().isThrownBy(() ->
                validator.validatePost(userId, "viec nay giet thoi gian nhanh qua", 0));
    }

    @Test
    void validatePost_blacklistViolencePhrase_stillBlocks() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithKeyword("giết mày"));
        assertThatThrownBy(() -> validator.validatePost(userId, "tao se giet may", 0))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void validatePostUpdate_rateLimit_blocksAfterLimit() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWith(20, false, false));
        assertThatNoException().isThrownBy(() -> validator.validatePostUpdate(userId, "edit 1", 0));
        assertThatNoException().isThrownBy(() -> validator.validatePostUpdate(userId, "edit 2", 0));
        assertThatNoException().isThrownBy(() -> validator.validatePostUpdate(userId, "edit 3", 0));
        assertThatThrownBy(() -> validator.validatePostUpdate(userId, "edit 4", 0))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("chỉnh sửa bài");
    }

    @Test
    void getPostEditRateLimitStatus_reflectsUsage() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWith(20, false, false));
        validator.validatePostUpdate(userId, "edit 1", 0);
        validator.validatePostUpdate(userId, "edit 2", 0);
        var status = validator.getPostEditRateLimitStatus(userId);
        assertThat(status.limitPerMinute()).isEqualTo(3);
        assertThat(status.usedInWindow()).isEqualTo(2);
        assertThat(status.remaining()).isEqualTo(1);
    }

    private JsonNode configWithAllowedTypes(String allowed) throws Exception {
        String json = """
                {
                  "postPolicy": {
                    "maxPostLength": 5000,
                    "maxImagesPerPost": 10,
                    "postsPerMinute": 3,
                    "allowedFileTypes": "%s"
                  },
                  "keywords": []
                }
                """.formatted(allowed);
        return mapper.readTree(json);
    }

    @Test
    void validatePostMediaUpload_rejectsSpoofedImageFilename() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithAllowedTypes("jpg,png,pdf"));
        byte[] pdfHeader = new byte[]{'%', 'P', 'D', 'F', '-', '1', '.', '4'};
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", pdfHeader);
        assertThatThrownBy(() -> validator.validatePostMediaUpload(file))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("không khớp");
    }

    @Test
    void validatePostMediaUpload_allowsRealPng() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithAllowedTypes("png"));
        byte[] pngHeader = new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        };
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", pngHeader);
        assertThatNoException().isThrownBy(() -> validator.validatePostMediaUpload(file));
    }

    @Test
    void validatePostMediaUpload_rejectsJpgWhenOnlyPngAllowed() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithAllowedTypes("png"));
        assertThatThrownBy(() -> validator.validatePostMediaUpload("photo.jpg", "image/jpeg"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("JPG");
    }

    @Test
    void validatePostMediaUpload_allowsPngWhenOnlyPngAllowed() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithAllowedTypes("png"));
        assertThatNoException().isThrownBy(() ->
                validator.validatePostMediaUpload("photo.png", "image/png"));
    }

    @Test
    void validatePostMediaUpload_allowsPdfWhenListedInAllowedTypes() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithAllowedTypes("jpg,pdf"));
        assertThatNoException().isThrownBy(() ->
                validator.validatePostMediaUpload("doc.pdf", "application/pdf"));
    }

    @Test
    void validatePostMediaUpload_rejectsPdfWhenNotInAllowedTypes() throws Exception {
        when(policyService.getConfigJson()).thenReturn(configWithAllowedTypes("jpg,png"));
        assertThatThrownBy(() -> validator.validatePostMediaUpload("doc.pdf", "application/pdf"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("PDF");
    }
}
