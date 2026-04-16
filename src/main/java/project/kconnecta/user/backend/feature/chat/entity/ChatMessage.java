package project.kconnecta.user.backend.feature.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "chat_messages",
        indexes = {
                @Index(name = "idx_chat_messages_sender_receiver_created_at", columnList = "sender_id, receiver_id, created_at"),
                @Index(name = "idx_chat_messages_receiver_sender_created_at", columnList = "receiver_id, sender_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean delivered = false;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean seen = false;

    @Column(name = "seen_at")
    private LocalDateTime seenAt;
}
