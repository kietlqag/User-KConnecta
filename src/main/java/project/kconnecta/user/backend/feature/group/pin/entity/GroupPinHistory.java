package project.kconnecta.user.backend.feature.group.pin.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinHistoryAction;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_pin_history", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupPinHistory {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PinHistoryAction action;

    @Column(name = "actor_id")
    private UUID actorId; // null = SYSTEM

    @Column(length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
