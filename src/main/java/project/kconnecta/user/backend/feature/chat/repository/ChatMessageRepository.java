package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessage;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query("""
            SELECT m FROM ChatMessage m
            JOIN FETCH m.sender
            JOIN FETCH m.receiver
            WHERE (m.sender.id = :userId1 AND m.receiver.id = :userId2)
               OR (m.sender.id = :userId2 AND m.receiver.id = :userId1)
            ORDER BY m.createdAt ASC
            """)
    List<ChatMessage> findConversation(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);

    @Query("""
            SELECT m FROM ChatMessage m
            JOIN FETCH m.sender
            JOIN FETCH m.receiver
            WHERE m.id = :messageId
            """)
    Optional<ChatMessage> findByIdWithUsers(@Param("messageId") UUID messageId);

    @Query("""
            SELECT m FROM ChatMessage m
            JOIN FETCH m.sender
            JOIN FETCH m.receiver
            WHERE m.sender.id = :senderId
              AND m.receiver.id = :receiverId
              AND m.seen = false
            ORDER BY m.createdAt ASC
            """)
    List<ChatMessage> findUnseenMessages(@Param("senderId") UUID senderId, @Param("receiverId") UUID receiverId);
}
