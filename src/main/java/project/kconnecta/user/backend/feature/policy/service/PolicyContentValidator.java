package project.kconnecta.user.backend.feature.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.exception.ChatValidationException;
import project.kconnecta.user.backend.exception.ValidationException;

import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class PolicyContentValidator {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String VOICE_MESSAGE_PREFIX = "__VOICE__:";
    private static final String IMAGE_MESSAGE_PREFIX = "__IMAGE__:";
    private static final String FILE_MESSAGE_PREFIX = "__FILE__:";
    private static final String REPLY_PREFIX = "__REPLY__:";
    private static final String CHAT_ACTION_PREFIX = "__CHAT_ACTION__:";
    private static final String CALL_LOG_PREFIX = "__CALL_LOG__:";
    private static final String VIDEO_SHARE_PREFIX = "__VIDEO_SHARE__:";
    private static final String POST_SHARE_PREFIX = "__POST_SHARE__:";
    private static final String STORY_REPLY_PREFIX = "__STORY_REPLY__:";

    private static final Pattern URL_PATTERN = Pattern.compile(
            "(https?://[^\\s]+|www\\.[^\\s]+)",
            Pattern.CASE_INSENSITIVE
    );

    private final PolicyService policyService;

    private final Map<UUID, Deque<Instant>> postTimestamps = new ConcurrentHashMap<>();
    private final Map<String, ConsecutiveMessageState> consecutiveMessageStates = new ConcurrentHashMap<>();

    private static final class ConsecutiveMessageState {
        private String lastNormalizedContent = "";
        private int streak;
    }

    public void validatePost(UUID authorId, String content, int mediaCount) {
        JsonNode config = policyService.getConfigJson();
        JsonNode postPolicy = config.path("postPolicy");

        int maxLength = postPolicy.path("maxPostLength").asInt(5000);
        int maxImages = postPolicy.path("maxImagesPerPost").asInt(10);
        int postsPerMinute = postPolicy.path("postsPerMinute").asInt(3);

        String text = content == null ? "" : content;
        if (text.length() > maxLength) {
            throw new ValidationException("Bài viết vượt quá " + maxLength + " ký tự cho phép");
        }
        if (mediaCount > maxImages) {
            throw new ValidationException("Tối đa " + maxImages + " ảnh/video mỗi bài");
        }

        // Watchlist (vùng xám) không chặn cứng — PostServiceImpl chỉ gọi Gemini khi isSuspect.
        checkKeywords(text, config, false, "đăng bài viết");
        checkRateLimit(authorId, postsPerMinute, postTimestamps, "đăng bài");
    }

    public void validatePostUpdate(UUID authorId, String content, int mediaCount) {
        JsonNode config = policyService.getConfigJson();
        JsonNode postPolicy = config.path("postPolicy");

        int maxLength = postPolicy.path("maxPostLength").asInt(5000);
        int maxImages = postPolicy.path("maxImagesPerPost").asInt(10);

        String text = content == null ? "" : content;
        if (text.length() > maxLength) {
            throw new ValidationException("Không thể lưu thay đổi bài viết. Lý do: nội dung vượt quá "
                    + maxLength + " ký tự cho phép.");
        }
        if (mediaCount > maxImages) {
            throw new ValidationException("Không thể lưu thay đổi bài viết. Lý do: tối đa "
                    + maxImages + " ảnh/video mỗi bài.");
        }

        checkKeywords(text, config, false, "lưu thay đổi bài viết");
    }

    /**
     * Cheap, AI-free pre-filter: returns true when a comment looks risky enough to
     * warrant async AI review (a "watchlist" keyword or any link). Hard-blocked
     * keywords are handled separately by {@link #validateComment}; this only flags
     * the grey zone. Recall of the whole moderation pipeline is bounded by this filter.
     */
    public boolean isSuspect(String content) {
        if (content == null || content.isBlank()) {
            return false;
        }
        if (URL_PATTERN.matcher(content).find()) {
            return true;
        }
        String lower = content.toLowerCase(Locale.ROOT);
        String norm = normalizeForMatch(content);
        JsonNode keywords = policyService.getConfigJson().path("keywords");
        if (!keywords.isArray()) {
            return false;
        }
        for (JsonNode kw : keywords) {
            if (!"watchlist".equals(kw.path("category").asText(""))) {
                continue;
            }
            String value = kw.path("value").asText("");
            if (!value.isBlank() && keywordMatches(lower, norm, value)) {
                return true;
            }
        }
        return false;
    }

    /** Từ cấm đã khớp khi bình luận vi phạm (để audit vi phạm). */
    public record MatchedKeyword(String id, String value, String category) {}

    /**
     * Trả về từ cấm (blacklist / blocked_domain) đầu tiên mà nội dung bình luận khớp,
     * rỗng nếu không vi phạm (KHÔNG tính lỗi độ dài, watchlist là vùng xám nên bỏ qua).
     * Dùng để ghi vi phạm kèm từ khóa đã khớp, không làm thay đổi luồng chặn của
     * {@link #validateComment}.
     */
    public Optional<MatchedKeyword> findCommentViolationKeyword(String content) {
        String text = content == null ? "" : content;
        if (text.isBlank()) {
            return Optional.empty();
        }
        JsonNode keywords = policyService.getConfigJson().path("keywords");
        if (!keywords.isArray()) {
            return Optional.empty();
        }
        String lower = text.toLowerCase(Locale.ROOT);
        String norm = normalizeForMatch(text);
        for (JsonNode kw : keywords) {
            String category = kw.path("category").asText("");
            if ("watchlist".equals(category)) {
                continue; // vùng xám: không tính vi phạm cứng
            }
            String value = kw.path("value").asText("");
            if (value.isBlank()) {
                continue;
            }
            if (keywordMatches(lower, norm, value)) {
                return Optional.of(new MatchedKeyword(kw.path("id").asText(null), value, category));
            }
        }
        return Optional.empty();
    }

    public void validateComment(String content) {
        JsonNode config = policyService.getConfigJson();
        String text = content == null ? "" : content;
        int maxLength = config.path("postPolicy").path("maxPostLength").asInt(5000);
        if (text.length() > maxLength) {
            throw new ValidationException("Bình luận quá dài");
        }
        // Watchlist (vùng xám) KHÔNG chặn cứng ở đây — để isSuspect đẩy sang PENDING cho AI duyệt.
        // Blacklist chặn ngay. blocked_domain chặn cả khi không phải URL đầy đủ (vd: "casino", "bit.ly/phish").
        checkKeywords(text, config, false, "đăng bình luận");
        checkBlockedDomainsInText(text, config);
        checkBlockedLinks(text, config);
    }

    public void validateChatMessage(UUID senderId, String content, UUID conversationId, String messageClientId) {
        JsonNode config = policyService.getConfigJson();
        JsonNode chatPolicy = config.path("chatPolicy");
        String text = content == null ? "" : content;
        String policyText = extractPolicyCheckableText(text);
        String convId = conversationId != null ? conversationId.toString() : null;

        if (chatPolicy.path("antiSpamEnabled").asBoolean(true)) {
            int maxConsecutive = chatPolicy.path("messagesPerMinute").asInt(10);
            checkDuplicateMessageSpam(senderId, text, maxConsecutive, convId, messageClientId);
        }

        try {
            checkKeywords(policyText, config, true, "gửi tin nhắn");
        } catch (ValidationException e) {
            throw new ChatValidationException("CHAT_BLOCKED_KEYWORD",
                    "Tin nhắn chứa nội dung không phù hợp nên không thể gửi.", null, convId, messageClientId);
        }

        if (chatPolicy.path("blockMaliciousLinks").asBoolean(true)) {
            try {
                checkBlockedLinks(policyText, config);
            } catch (ValidationException e) {
                throw new ChatValidationException("CHAT_MALICIOUS_LINK",
                        "Tin nhắn chứa liên kết không an toàn nên đã bị chặn.", null, convId, messageClientId);
            }
        }
    }

    /**
     * Structured chat payloads (image/voice/file metadata) must not be keyword-scanned as plain text —
     * URLs and JSON keys often false-match community rules. Only user-authored fields are checked.
     */
    private String extractPolicyCheckableText(String content) {
        if (content == null || content.isBlank()) {
            return "";
        }
        if (content.startsWith(REPLY_PREFIX)) {
            return readJsonStringField(content.substring(REPLY_PREFIX.length()), "text");
        }
        if (content.startsWith(IMAGE_MESSAGE_PREFIX)) {
            return readJsonStringField(content.substring(IMAGE_MESSAGE_PREFIX.length()), "caption");
        }
        if (content.startsWith(VOICE_MESSAGE_PREFIX)
                || content.startsWith(FILE_MESSAGE_PREFIX)
                || content.startsWith(CHAT_ACTION_PREFIX)
                || content.startsWith(CALL_LOG_PREFIX)
                || content.startsWith(VIDEO_SHARE_PREFIX)
                || content.startsWith(POST_SHARE_PREFIX)
                || content.startsWith(STORY_REPLY_PREFIX)) {
            return "";
        }
        return content;
    }

    private String readJsonStringField(String json, String fieldName) {
        try {
            JsonNode payload = OBJECT_MAPPER.readTree(json);
            JsonNode node = payload.get(fieldName);
            if (node == null || node.isNull()) {
                return "";
            }
            return node.asText("").trim();
        } catch (Exception ignored) {
            return "";
        }
    }

    private void checkKeywords(String text, JsonNode config, boolean blockWatchlist, String actionLabel) {
        if (text.isBlank()) {
            return;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        String norm = normalizeForMatch(text);
        JsonNode keywords = config.path("keywords");
        if (!keywords.isArray()) {
            return;
        }
        for (JsonNode kw : keywords) {
            String value = kw.path("value").asText("");
            String category = kw.path("category").asText("");
            if (value.isBlank()) {
                continue;
            }
            if ("blocked_domain".equals(category)) {
                continue;
            }
            // Khi gọi từ comment, watchlist là vùng xám → bỏ qua chặn cứng, nhường cho isSuspect + AI.
            if (!blockWatchlist && "watchlist".equals(category)) {
                continue;
            }
            if (keywordMatches(lower, norm, value)) {
                throw new ValidationException(buildPostPolicyViolationMessage(category, actionLabel));
            }
        }
    }

    private String buildPostPolicyViolationMessage(String category, String actionPhrase) {
        String reason = switch (category) {
            case "blacklist", "banned" -> "chứa từ ngữ bị cấm theo quy tắc cộng đồng";
            case "watchlist" -> "chứa ngôn từ nhạy cảm hoặc không phù hợp tiêu chuẩn cộng đồng";
            case "blocked_domain" -> "chứa liên kết hoặc tên miền không được phép";
            default -> "chứa nội dung không được phép";
        };
        return "Không thể " + actionPhrase + ". Lý do: nội dung " + reason
                + ". Vui lòng chỉnh sửa và thử lại.";
    }

    /**
     * Khớp từ khóa trên CẢ hai dạng: bản gốc (giữ dấu) và bản chuẩn hóa né-kiểm-duyệt.
     * Nhờ vậy "con cho"→"con chó", "tao se giet may"→"giết", "cac"→"cặc", "vay tien"→"vay tiền"
     * đều bị bắt. Watchlist chỉ đẩy comment sang PENDING (AI duyệt lại), nên dương tính giả
     * kiểu "các"/"Nguyễn" sẽ được AI gỡ — không chặn oan.
     */
    private boolean keywordMatches(String lowerText, String normText, String keyword) {
        String lowerKw = keyword.toLowerCase(Locale.ROOT);
        if (lowerText.contains(lowerKw)) {
            return true;
        }
        String normKw = normalizeForMatch(keyword);
        return !normKw.isBlank() && normText.contains(normKw);
    }

    // Ký tự thường dùng để né kiểm duyệt (leetspeak / thay thế) → chữ gốc.
    private static final Map<Character, Character> LEET_MAP = Map.ofEntries(
            Map.entry('0', 'o'), Map.entry('1', 'i'), Map.entry('3', 'e'),
            Map.entry('4', 'a'), Map.entry('5', 's'), Map.entry('6', 'g'),
            Map.entry('7', 't'), Map.entry('8', 'b'), Map.entry('9', 'g'),
            Map.entry('@', 'a'), Map.entry('$', 's'), Map.entry('|', 'i')
    );
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    /**
     * Chuẩn hóa để so khớp: lowercase + trim + gom khoảng trắng + bỏ dấu tiếng Việt (đ→d)
     * + map ký tự né (c0n→con, v4y→vay...). Dùng cho cả nội dung lẫn từ khóa.
     */
    private static String normalizeForMatch(String s) {
        String lower = s.toLowerCase(Locale.ROOT).trim();
        String noAccent = Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd');
        StringBuilder sb = new StringBuilder(noAccent.length());
        for (int i = 0; i < noAccent.length(); i++) {
            char c = noAccent.charAt(i);
            sb.append(LEET_MAP.getOrDefault(c, c));
        }
        return WHITESPACE.matcher(sb).replaceAll(" ");
    }

    private void checkBlockedDomainsInText(String text, JsonNode config) {
        if (text.isBlank()) {
            return;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        String norm = normalizeForMatch(text);
        JsonNode keywords = config.path("keywords");
        if (!keywords.isArray()) {
            return;
        }
        for (JsonNode kw : keywords) {
            if (!"blocked_domain".equals(kw.path("category").asText(""))) {
                continue;
            }
            String value = kw.path("value").asText("");
            if (!value.isBlank() && keywordMatches(lower, norm, value)) {
                throw new ValidationException(
                        "Không thể đăng bình luận. Lý do: nội dung chứa liên kết hoặc tên miền không được phép. "
                                + "Vui lòng chỉnh sửa và thử lại.");
            }
        }
    }

    private void checkBlockedLinks(String text, JsonNode config) {
        var matcher = URL_PATTERN.matcher(text);
        List<String> blocked = new ArrayList<>();
        JsonNode keywords = config.path("keywords");
        if (keywords.isArray()) {
            for (JsonNode kw : keywords) {
                if ("blocked_domain".equals(kw.path("category").asText())) {
                    String v = kw.path("value").asText("").toLowerCase(Locale.ROOT);
                    if (!v.isBlank()) {
                        blocked.add(v);
                    }
                }
            }
        }
        while (matcher.find()) {
            String url = matcher.group(1).toLowerCase(Locale.ROOT);
            for (String b : blocked) {
                if (url.contains(b)) {
                    throw new ValidationException("Link không được phép trên nền tảng");
                }
            }
        }
    }

    private void checkRateLimit(UUID userId, int limitPerMinute, Map<UUID, Deque<Instant>> store, String action) {
        if (userId == null || limitPerMinute <= 0) {
            return;
        }
        Instant cutoff = Instant.now().minusSeconds(60);
        Deque<Instant> deque = store.computeIfAbsent(userId, k -> new ConcurrentLinkedDeque<>());
        while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) {
            deque.pollFirst();
        }
        if (deque.size() >= limitPerMinute) {
            throw new ValidationException("Bạn đang " + action + " quá nhanh. Vui lòng thử lại sau.");
        }
        deque.addLast(Instant.now());
    }

    private void checkDuplicateMessageSpam(UUID userId, String content, int maxConsecutive, String conversationId, String messageClientId) {
        if (userId == null || maxConsecutive <= 0) {
            return;
        }
        String normalized = normalizeChatContent(content);
        if (normalized.isEmpty()) {
            return;
        }
        String stateKey = userId + ":" + (conversationId != null ? conversationId : "_");
        ConsecutiveMessageState state = consecutiveMessageStates.computeIfAbsent(stateKey, key -> new ConsecutiveMessageState());

        if (normalized.equals(state.lastNormalizedContent)) {
            if (state.streak >= maxConsecutive) {
                throw new ChatValidationException(
                        "CHAT_RATE_LIMITED",
                        "Bạn đã gửi quá nhiều tin giống nhau liên tiếp. Vui lòng đổi nội dung.",
                        null,
                        conversationId,
                        messageClientId
                );
            }
            state.streak++;
            return;
        }

        state.lastNormalizedContent = normalized;
        state.streak = 1;
    }

    private String normalizeChatContent(String content) {
        if (content == null) {
            return "";
        }
        return content.trim().replaceAll("\\s+", " ");
    }
}
