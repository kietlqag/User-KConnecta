package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query("""
            SELECT m FROM ChatMessage m
            JOIN FETCH m.sender
            JOIN FETCH m.receiver
            WHERE (
                    (m.sender.id = :userId1 AND m.receiver.id = :userId2)
                 OR (m.sender.id = :userId2 AND m.receiver.id = :userId1)
            )
              AND m.conversation IS NULL
            ORDER BY m.createdAt ASC
            """)
    List<ChatMessage> findConversation(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);

    @Query("""
            SELECT new project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse(
                m.id,
                s.id,
                s.username,
                r.id,
                null,
                m.content,
                m.createdAt,
                m.delivered,
                m.seen,
                m.seenAt,
                m.deleted,
                m.deletedAt,
                null
            )
            FROM ChatMessage m
            JOIN m.sender s
            JOIN m.receiver r
            WHERE (
                    (s.id = :userId1 AND r.id = :userId2)
                 OR (s.id = :userId2 AND r.id = :userId1)
            )
              AND m.conversation IS NULL
              AND m.createdAt < COALESCE(:beforeCreatedAt, CURRENT_TIMESTAMP)
            ORDER BY m.createdAt DESC
            """)
    List<ChatMessageResponse> findConversationChunk(
            @Param("userId1") UUID userId1,
            @Param("userId2") UUID userId2,
            @Param("beforeCreatedAt") LocalDateTime beforeCreatedAt,
            Pageable pageable
    );

    @Query("""
            SELECT m FROM ChatMessage m
            JOIN FETCH m.sender
            LEFT JOIN FETCH m.receiver
            LEFT JOIN FETCH m.conversation
            WHERE m.id = :messageId
            """)
    Optional<ChatMessage> findByIdWithUsers(@Param("messageId") UUID messageId);

    @Query("""
            SELECT new project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse(
                m.id,
                s.id,
                s.username,
                null,
                c.id,
                m.content,
                m.createdAt,
                m.delivered,
                m.seen,
                m.seenAt,
                m.deleted,
                m.deletedAt,
                null
            )
            FROM ChatMessage m
            JOIN m.sender s
            JOIN m.conversation c
            WHERE c.id = :conversationId
              AND m.createdAt < COALESCE(:beforeCreatedAt, CURRENT_TIMESTAMP)
            ORDER BY m.createdAt DESC
            """)
    List<ChatMessageResponse> findConversationChunkByConversationId(
            @Param("conversationId") UUID conversationId,
            @Param("beforeCreatedAt") LocalDateTime beforeCreatedAt,
            Pageable pageable
    );

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
