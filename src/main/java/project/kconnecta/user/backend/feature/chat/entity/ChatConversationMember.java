package project.kconnecta.user.backend.feature.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.chat.entity.enums.ChatMemberStatus;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "chat_conversation_members",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_chat_conversation_members_conversation_user", columnNames = {"conversation_id", "user_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatConversationMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private ChatConversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "nickname", length = 120)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_status", nullable = false, length = 20)
    private ChatMemberStatus memberStatus;

    @PrePersist
    void prePersist() {
        if (memberStatus == null) {
            memberStatus = ChatMemberStatus.APPROVED;
        }
    }
}
