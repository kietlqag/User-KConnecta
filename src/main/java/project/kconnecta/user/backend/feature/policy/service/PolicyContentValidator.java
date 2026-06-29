package project.kconnecta.user.backend.feature.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.MediaFileSniffer;
import project.kconnecta.user.backend.exception.ChatValidationException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.post.dto.response.PostRateLimitStatus;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
    private final Map<UUID, Deque<Instant>> postEditTimestamps = new ConcurrentHashMap<>();
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
        long postWindowSeconds = resolvePostWindowSeconds(postPolicy);

        String text = content == null ? "" : content;
        if (text.length() > maxLength) {
            throw new ValidationException("Bài viết vượt quá " + maxLength + " ký tự cho phép");
        }
        if (mediaCount > maxImages) {
            throw new ValidationException("Tối đa " + maxImages + " ảnh/video mỗi bài");
        }

        // Watchlist (vùng xám) không chặn cứng — PostServiceImpl chỉ gọi Gemini khi isSuspect.
        checkKeywords(text, config, false, "đăng bài viết");
        checkRateLimit(authorId, postsPerMinute, postWindowSeconds, postTimestamps, "đăng bài");
    }

    public PostRateLimitStatus getPostRateLimitStatus(UUID userId) {
        JsonNode postPolicy = policyService.getConfigJson().path("postPolicy");
        int limit = postPolicy.path("postsPerMinute").asInt(3);
        long windowSeconds = resolvePostWindowSeconds(postPolicy);
        return buildRateLimitStatus(userId, limit, windowSeconds, postTimestamps);
    }

    public PostRateLimitStatus getPostEditRateLimitStatus(UUID userId) {
        JsonNode postPolicy = policyService.getConfigJson().path("postPolicy");
        int limit = resolveEditsPerMinute(postPolicy);
        long windowSeconds = resolveEditWindowSeconds(postPolicy);
        return buildRateLimitStatus(userId, limit, windowSeconds, postEditTimestamps);
    }

    private PostRateLimitStatus buildRateLimitStatus(
            UUID userId,
            int limit,
            long windowSeconds,
            Map<UUID, Deque<Instant>> store) {
        if (limit <= 0) {
            return new PostRateLimitStatus(0, 0, Integer.MAX_VALUE, 0, windowSeconds);
        }
        if (userId == null) {
            return new PostRateLimitStatus(limit, 0, limit, 0, windowSeconds);
        }

        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(windowSeconds);
        Deque<Instant> deque = store.get(userId);
        if (deque == null) {
            return new PostRateLimitStatus(limit, 0, limit, 0, windowSeconds);
        }

        while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) {
            deque.pollFirst();
        }

        int used = deque.size();
        int remaining = Math.max(0, limit - used);
        long retryAfter = 0;
        if (remaining == 0 && !deque.isEmpty()) {
            Instant oldest = deque.peekFirst();
            retryAfter = Math.max(0, Duration.between(now, oldest.plusSeconds(windowSeconds)).getSeconds());
        }
        return new PostRateLimitStatus(limit, used, remaining, retryAfter, windowSeconds);
    }

    private int resolveEditsPerMinute(JsonNode postPolicy) {
        if (postPolicy != null && postPolicy.hasNonNull("editsPerMinute")) {
            return postPolicy.path("editsPerMinute").asInt(3);
        }
        return postPolicy == null ? 3 : postPolicy.path("postsPerMinute").asInt(3);
    }

    public void validatePostMediaUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("File không hợp lệ");
        }
        JsonNode postPolicy = policyService.getConfigJson().path("postPolicy");
        String allowedRaw = postPolicy.path("allowedFileTypes").asText("jpg,jpeg,png,gif,webp,mp4,mov");

        String sniffedExt = MediaFileSniffer.sniffExtension(file);
        if (sniffedExt.isBlank()) {
            String declaredExt = resolveMediaExtension(file.getOriginalFilename(), file.getContentType());
            if ("txt".equals(declaredExt) && MediaFileSniffer.isLikelyPlainText(file)
                    && isMediaExtensionAllowed("txt", allowedRaw)) {
                return;
            }
            throw new ValidationException(
                    "Không nhận dạng được nội dung file — file có thể bị đổi tên giả hoặc định dạng không được phép");
        }
        if (!isMediaExtensionAllowed(sniffedExt, allowedRaw)) {
            throw new ValidationException(
                    "Định dạng thực tế ." + sniffedExt.toUpperCase(Locale.ROOT)
                            + " không được phép. Chỉ chấp nhận: "
                            + formatAllowedExtensions(allowedRaw));
        }

        String declaredExt = resolveMediaExtension(file.getOriginalFilename(), file.getContentType());
        if (!declaredExt.isBlank() && !MediaFileSniffer.extensionsCompatible(sniffedExt, declaredExt)) {
            throw new ValidationException(
                    "Tên file hoặc loại MIME không khớp nội dung thực tế của file");
        }
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
        int editsPerMinute = resolveEditsPerMinute(postPolicy);
        long editWindowSeconds = resolveEditWindowSeconds(postPolicy);
        checkRateLimit(authorId, editsPerMinute, editWindowSeconds, postEditTimestamps, "chỉnh sửa bài");
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

    public Optional<MatchedKeyword> findAnyMatchedKeyword(String content) {
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
            String value = kw.path("value").asText("");
            if (value.isBlank()) {
                continue;
            }
            if (keywordMatches(lower, norm, value)) {
                return Optional.of(new MatchedKeyword(kw.path("id").asText(""), value, category));
            }
        }
        return Optional.empty();
    }

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
        // Chat moderation disabled — post/comment moderation remains active.
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

    private void checkRateLimit(
            UUID userId,
            int limit,
            long windowSeconds,
            Map<UUID, Deque<Instant>> store,
            String action) {
        if (userId == null || limit <= 0 || windowSeconds <= 0) {
            return;
        }
        Instant cutoff = Instant.now().minusSeconds(windowSeconds);
        Deque<Instant> deque = store.computeIfAbsent(userId, k -> new ConcurrentLinkedDeque<>());
        while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) {
            deque.pollFirst();
        }
        if (deque.size() >= limit) {
            throw new ValidationException("Bạn đang " + action + " quá nhanh. Vui lòng thử lại sau.");
        }
        deque.addLast(Instant.now());
    }

    private long resolvePostWindowSeconds(JsonNode postPolicy) {
        return resolveWindowSeconds(
                postPolicy.path("postRateLimitWindowValue").asInt(1),
                postPolicy.path("postRateLimitWindowUnit").asText("minute"));
    }

    private long resolveEditWindowSeconds(JsonNode postPolicy) {
        return resolveWindowSeconds(
                postPolicy.path("editRateLimitWindowValue").asInt(1),
                postPolicy.path("editRateLimitWindowUnit").asText("minute"));
    }

    private static long resolveWindowSeconds(int value, String unit) {
        int safeValue = Math.max(1, value);
        String normalized = unit == null ? "minute" : unit.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "hour" -> (long) safeValue * 3600L;
            case "day" -> (long) safeValue * 86400L;
            default -> (long) safeValue * 60L;
        };
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

    private static final Map<String, String> MIME_TO_EXT = Map.ofEntries(
            Map.entry("image/jpeg", "jpeg"),
            Map.entry("image/jpg", "jpg"),
            Map.entry("image/png", "png"),
            Map.entry("image/gif", "gif"),
            Map.entry("image/webp", "webp"),
            Map.entry("video/mp4", "mp4"),
            Map.entry("video/quicktime", "mov"),
            Map.entry("video/webm", "webm"),
            Map.entry("application/pdf", "pdf"),
            Map.entry("application/msword", "doc"),
            Map.entry("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
            Map.entry("text/plain", "txt")
    );

    private String resolveMediaExtension(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            String fromName = normalizeExtension(
                    originalFilename.substring(originalFilename.lastIndexOf('.') + 1));
            if (!fromName.isBlank()) {
                return fromName;
            }
        }
        if (contentType != null && !contentType.isBlank()) {
            String mime = contentType.toLowerCase(Locale.ROOT).split(";")[0].trim();
            String mapped = MIME_TO_EXT.get(mime);
            if (mapped != null) {
                return mapped;
            }
        }
        return "";
    }

    private static String normalizeExtension(String raw) {
        if (raw == null) {
            return "";
        }
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if (t.startsWith(".")) {
            t = t.substring(1);
        }
        return t.replaceAll("[^a-z0-9]", "");
    }

    private static Set<String> parseAllowedExtensions(String raw) {
        Set<String> allowed = new HashSet<>();
        if (raw == null || raw.isBlank()) {
            return allowed;
        }
        for (String part : raw.split("[,;\\s]+")) {
            String ext = normalizeExtension(part);
            if (!ext.isBlank()) {
                allowed.add(ext);
            }
        }
        if (allowed.contains("jpg") || allowed.contains("jpeg")) {
            allowed.add("jpg");
            allowed.add("jpeg");
        }
        return allowed;
    }

    private static boolean isMediaExtensionAllowed(String ext, String allowedRaw) {
        Set<String> allowed = parseAllowedExtensions(allowedRaw);
        if (allowed.isEmpty()) {
            return true;
        }
        return allowed.contains(normalizeExtension(ext));
    }

    private static String formatAllowedExtensions(String allowedRaw) {
        List<String> parts = new ArrayList<>();
        for (String ext : parseAllowedExtensions(allowedRaw)) {
            parts.add(ext.toUpperCase(Locale.ROOT));
        }
        return String.join(", ", parts);
    }
}
