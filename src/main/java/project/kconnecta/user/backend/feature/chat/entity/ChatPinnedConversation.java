package project.kconnecta.user.backend.feature.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "chat_pinned_conversations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_chat_pin_owner_peer", columnNames = {"owner_user_id", "peer_user_id"}),
                @UniqueConstraint(name = "uk_chat_pin_owner_conversation", columnNames = {"owner_user_id", "conversation_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatPinnedConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User ownerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "peer_user_id")
    private User peerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private ChatConversation conversation;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

