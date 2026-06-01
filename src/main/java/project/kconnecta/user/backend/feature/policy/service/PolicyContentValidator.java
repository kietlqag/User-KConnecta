package project.kconnecta.user.backend.feature.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.exception.ChatValidationException;
import project.kconnecta.user.backend.exception.ValidationException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class PolicyContentValidator {

    private static final Pattern URL_PATTERN = Pattern.compile(
            "(https?://[^\\s]+|www\\.[^\\s]+)",
            Pattern.CASE_INSENSITIVE
    );

    private final PolicyService policyService;

    private final Map<UUID, Deque<Instant>> postTimestamps = new ConcurrentHashMap<>();
    private final Map<UUID, Deque<Instant>> chatTimestamps = new ConcurrentHashMap<>();

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

        checkKeywords(text, config);
        checkRateLimit(authorId, postsPerMinute, postTimestamps, "đăng bài");
    }

    public void validateComment(String content) {
        JsonNode config = policyService.getConfigJson();
        String text = content == null ? "" : content;
        int maxLength = config.path("postPolicy").path("maxPostLength").asInt(5000);
        if (text.length() > maxLength) {
            throw new ValidationException("Bình luận quá dài");
        }
        checkKeywords(text, config);
    }

    public void validateChatMessage(UUID senderId, String content, UUID conversationId, String messageClientId) {
        JsonNode config = policyService.getConfigJson();
        JsonNode chatPolicy = config.path("chatPolicy");
        String text = content == null ? "" : content;
        String convId = conversationId != null ? conversationId.toString() : null;

        if (chatPolicy.path("antiSpamEnabled").asBoolean(true)) {
            int perMinute = chatPolicy.path("messagesPerMinute").asInt(20);
            checkChatRateLimit(senderId, perMinute, convId, messageClientId);
        }

        try {
            checkKeywords(text, config);
        } catch (ValidationException e) {
            throw new ChatValidationException("CHAT_BLOCKED_KEYWORD",
                    "Tin nhắn chứa nội dung không phù hợp nên không thể gửi.", null, convId, messageClientId);
        }

        if (chatPolicy.path("blockMaliciousLinks").asBoolean(true)) {
            try {
                checkBlockedLinks(text, config);
            } catch (ValidationException e) {
                throw new ChatValidationException("CHAT_MALICIOUS_LINK",
                        "Tin nhắn chứa liên kết không an toàn nên đã bị chặn.", null, convId, messageClientId);
            }
        }
    }

    private void checkKeywords(String text, JsonNode config) {
        if (text.isBlank()) {
            return;
        }
        String normalized = text.toLowerCase(Locale.ROOT);
        JsonNode keywords = config.path("keywords");
        if (!keywords.isArray()) {
            return;
        }
        for (JsonNode kw : keywords) {
            String value = kw.path("value").asText("").toLowerCase(Locale.ROOT);
            String category = kw.path("category").asText("");
            if (value.isBlank()) {
                continue;
            }
            if ("blocked_domain".equals(category)) {
                continue;
            }
            if (normalized.contains(value)) {
                throw new ValidationException("Nội dung chứa từ khóa không được phép");
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

    private void checkChatRateLimit(UUID userId, int limitPerMinute, String conversationId, String messageClientId) {
        if (userId == null || limitPerMinute <= 0) {
            return;
        }
        Instant cutoff = Instant.now().minusSeconds(60);
        Deque<Instant> deque = chatTimestamps.computeIfAbsent(userId, k -> new ConcurrentLinkedDeque<>());
        while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) {
            deque.pollFirst();
        }
        if (deque.size() >= limitPerMinute) {
            long retryMs = deque.peekFirst().toEpochMilli() + 60_000L - Instant.now().toEpochMilli();
            int retryAfterSeconds = (int) Math.max(1, (retryMs + 999) / 1000);
            throw new ChatValidationException(
                    "CHAT_RATE_LIMITED",
                    "Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau " + retryAfterSeconds + " giây.",
                    retryAfterSeconds,
                    conversationId,
                    messageClientId
            );
        }
        deque.addLast(Instant.now());
    }
}
