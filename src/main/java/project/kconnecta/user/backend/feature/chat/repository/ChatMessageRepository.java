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

    interface PrivateSummaryRow {
        UUID getPeerUserId();
        String getLastMessageContent();
        UUID getLastMessageSenderId();
        LocalDateTime getLastMessageCreatedAt();
    }

    interface GroupSummaryRow {
        UUID getConversationId();
        String getLastMessageContent();
        UUID getLastMessageSenderId();
        LocalDateTime getLastMessageCreatedAt();
    }

    interface PrivateUnreadCountRow {
        UUID getPeerUserId();
        Integer getUnreadCount();
    }

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

    @Query("""
            SELECT m FROM ChatMessage m
            WHERE (
                    (m.sender.id = :userId1 AND m.receiver.id = :userId2)
                 OR (m.sender.id = :userId2 AND m.receiver.id = :userId1)
            )
              AND m.conversation IS NULL
              AND m.createdAt < COALESCE(:beforeCreatedAt, CURRENT_TIMESTAMP)
            ORDER BY m.createdAt DESC
            """)
    List<ChatMessage> findPrivateChunkForAssets(
            @Param("userId1") UUID userId1,
            @Param("userId2") UUID userId2,
            @Param("beforeCreatedAt") LocalDateTime beforeCreatedAt,
            Pageable pageable
    );

    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.conversation.id = :conversationId
              AND m.createdAt < COALESCE(:beforeCreatedAt, CURRENT_TIMESTAMP)
            ORDER BY m.createdAt DESC
            """)
    List<ChatMessage> findGroupChunkForAssets(
            @Param("conversationId") UUID conversationId,
            @Param("beforeCreatedAt") LocalDateTime beforeCreatedAt,
            Pageable pageable
    );

    @Query(value = """
            SELECT DISTINCT ON (peer_user_id)
                   peer_user_id AS peerUserId,
                   last_message_content AS lastMessageContent,
                   last_message_sender_id AS lastMessageSenderId,
                   last_message_created_at AS lastMessageCreatedAt
            FROM (
                SELECT
                    CASE
                        WHEN m.sender_id = :currentUserId THEN m.receiver_id
                        ELSE m.sender_id
                    END AS peer_user_id,
                    m.content AS last_message_content,
                    m.sender_id AS last_message_sender_id,
                    m.created_at AS last_message_created_at
                FROM chat_messages m
                WHERE m.conversation_id IS NULL
                  AND (m.sender_id = :currentUserId OR m.receiver_id = :currentUserId)
                  AND (
                    CASE
                        WHEN m.sender_id = :currentUserId THEN m.receiver_id
                        ELSE m.sender_id
                    END
                  ) IN (:peerUserIds)
            ) x
            ORDER BY peer_user_id, last_message_created_at DESC
            """, nativeQuery = true)
    List<PrivateSummaryRow> findLatestPrivateSummaries(
            @Param("currentUserId") UUID currentUserId,
            @Param("peerUserIds") List<UUID> peerUserIds
    );

    @Query(value = """
            SELECT DISTINCT ON (m.conversation_id)
                   m.conversation_id AS conversationId,
                   m.content AS lastMessageContent,
                   m.sender_id AS lastMessageSenderId,
                   m.created_at AS lastMessageCreatedAt
            FROM chat_messages m
            WHERE m.conversation_id IN (:conversationIds)
              AND m.content NOT LIKE '__CHAT_ACTION__:%'
            ORDER BY m.conversation_id, m.created_at DESC
            """, nativeQuery = true)
    List<GroupSummaryRow> findLatestGroupSummaries(
            @Param("conversationIds") List<UUID> conversationIds
    );

    @Query(value = """
            SELECT
                m.sender_id AS peerUserId,
                COUNT(*) AS unreadCount
            FROM chat_messages m
            WHERE m.conversation_id IS NULL
              AND m.receiver_id = :currentUserId
              AND m.seen = false
              AND m.sender_id IN (:peerUserIds)
            GROUP BY m.sender_id
            """, nativeQuery = true)
    List<PrivateUnreadCountRow> countUnreadPrivateByPeer(
            @Param("currentUserId") UUID currentUserId,
            @Param("peerUserIds") List<UUID> peerUserIds
    );

    @Query(value = """
            SELECT COUNT(*)
            FROM chat_messages m
            WHERE m.conversation_id IS NULL
              AND m.receiver_id = :currentUserId
              AND m.seen = false
            """, nativeQuery = true)
    long countTotalPrivateUnread(@Param("currentUserId") UUID currentUserId);
}
