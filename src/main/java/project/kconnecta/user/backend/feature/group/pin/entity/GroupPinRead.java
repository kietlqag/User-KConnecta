package project.kconnecta.user.backend.feature.group.pin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "group_pin_reads",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(columnNames = {"pin_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupPinRead {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "pin_id", nullable = false)
    private UUID pinId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "read_at", nullable = false)
    private LocalDateTime readAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (readAt == null) readAt = LocalDateTime.now();
    }
}
