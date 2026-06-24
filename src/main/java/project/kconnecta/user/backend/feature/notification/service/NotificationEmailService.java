package project.kconnecta.user.backend.feature.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.common.util.MailService;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationEmailService {

    private final MailService mailService;
    private final SettingsService settingsService;
    private final UserRepository userRepository;

    @Value("classpath:templates/notification-email.html")
    private Resource notificationEmailTemplateResource;

    @Async("notificationExecutor")
    public void sendNotificationEmail(UUID recipientId, NotificationType type, String content, String senderName) {
        if (!settingsService.isNotifyEmailEnabled(recipientId)) {
            return;
        }

        User recipient = userRepository.findById(recipientId).orElse(null);
        if (recipient == null || recipient.getAccount() == null) {
            return;
        }

        String email = recipient.getAccount().getEmail();
        if (email == null || email.isBlank()) {
            return;
        }

        String recipientName = recipient.getFullName() != null ? recipient.getFullName() : recipient.getUsername();
        String subject = buildSubject(type);
        String body = buildBody(recipientName, type, content, senderName);

        try {
            mailService.sendMail(email, subject, body);
        } catch (Exception ex) {
            log.warn("Failed to send notification email to {} for type {}: {}", email, type, ex.getMessage());
        }
    }

    private String buildSubject(NotificationType type) {
        return switch (type) {
            case LIKE -> "KConnecta - Có người thích bài viết của bạn";
            case COMMENT -> "KConnecta - Có bình luận mới";
            case SHARE -> "KConnecta - Bài viết được chia sẻ";
            case FRIEND_REQUEST -> "KConnecta - Lời mời kết bạn mới";
            case FRIEND_ACCEPTED -> "KConnecta - Lời mời kết bạn được chấp nhận";
            case GROUP_ACTIVITY -> "KConnecta - Hoạt động nhóm mới";
            case GROUP_INVITE -> "KConnecta - Lời mời tham gia nhóm";
            case GROUP_JOIN_REQUEST -> "KConnecta - Yêu cầu tham gia nhóm";
            case GROUP_POST_PINNED -> "KConnecta - Bài viết được ghim trong nhóm";
            case MENTION -> "KConnecta - Bạn được nhắc đến";
            case BIRTHDAY -> "KConnecta - Sinh nhật bạn bè";
            case EVENT -> "KConnecta - Sự kiện mới";
            case MEMORY -> "KConnecta - Kỷ niệm mới";
            case SYSTEM -> "KConnecta - Thông báo hệ thống";
            default -> "KConnecta - Thông báo mới";
        };
    }

    private String buildBody(String recipientName, NotificationType type, String content, String senderName) {
        String template = loadTemplate();
        String headline = buildHeadline(type, senderName);
        String safeContent = content != null && !content.isBlank() ? content : headline;
        return template
                .replace("{{recipientName}}", escapeHtml(recipientName))
                .replace("{{headline}}", escapeHtml(headline))
                .replace("{{content}}", escapeHtml(safeContent))
                .replace("{{typeLabel}}", escapeHtml(type.name()));
    }

    private String buildHeadline(NotificationType type, String senderName) {
        String who = senderName != null && !senderName.isBlank() ? senderName : "Ai đó";
        return switch (type) {
            case LIKE -> who + " đã thích bài viết của bạn";
            case COMMENT -> who + " đã bình luận bài viết của bạn";
            case SHARE -> who + " đã chia sẻ bài viết của bạn";
            case FRIEND_REQUEST -> who + " đã gửi lời mời kết bạn";
            case FRIEND_ACCEPTED -> who + " đã chấp nhận lời mời kết bạn";
            case GROUP_ACTIVITY -> "Có hoạt động mới trong nhóm";
            case GROUP_INVITE -> who + " đã mời bạn tham gia nhóm";
            case GROUP_JOIN_REQUEST -> who + " muốn tham gia nhóm";
            case GROUP_POST_PINNED -> "Bài viết được ghim trong nhóm";
            case MENTION -> who + " đã nhắc đến bạn";
            case BIRTHDAY -> "Hôm nay là sinh nhật của " + who;
            case EVENT -> "Có sự kiện mới trên KConnecta";
            case MEMORY -> "Bạn có kỷ niệm mới";
            case SYSTEM -> "Thông báo từ KConnecta";
            default -> "Bạn có thông báo mới";
        };
    }

    private String loadTemplate() {
        try {
            return new String(notificationEmailTemplateResource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            log.error("Failed to load notification email template", ex);
            return """
                    <p>Xin chào {{recipientName}},</p>
                    <p><strong>{{headline}}</strong></p>
                    <p>{{content}}</p>
                    <p>Truy cập KConnecta để xem chi tiết.</p>
                    """;
        }
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
