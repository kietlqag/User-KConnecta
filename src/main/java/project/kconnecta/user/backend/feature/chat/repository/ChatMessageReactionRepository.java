package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessageReaction;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageReactionRepository extends JpaRepository<ChatMessageReaction, UUID> {
    Optional<ChatMessageReaction> findByMessageIdAndUserId(UUID messageId, UUID userId);

    @Query("""
            SELECT r.message.id, r.emoji
            FROM ChatMessageReaction r
            WHERE r.message.id IN :messageIds
            """)
    List<Object[]> findReactionsByMessageIds(@Param("messageIds") Collection<UUID> messageIds);

    List<ChatMessageReaction> findByMessageId(UUID messageId);

    void deleteByMessageIdAndUserId(UUID messageId, UUID userId);

    void deleteByMessageId(UUID messageId);
}
