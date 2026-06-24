package project.kconnecta.user.backend.feature.birthday.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "birthday_notification_logs",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_birthday_notification_daily",
                columnNames = {"recipient_id", "birthday_user_id", "notification_date"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BirthdayNotificationLog {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Column(name = "birthday_user_id", nullable = false)
    private UUID birthdayUserId;

    @Column(name = "notification_date", nullable = false)
    private LocalDate notificationDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
