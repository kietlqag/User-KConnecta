package project.kconnecta.user.backend.feature.notification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private UUID id;
    private NotificationType type;
    private NotificationUser user;
    private String text;
    private LocalDateTime timestamp;
    private boolean isUnread;
    private boolean isActioned;
    private UUID relatedId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationUser {
        private UUID id;
        private String name;
        private String avatar;
    }
}
