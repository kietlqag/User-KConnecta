package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.chat.entity.ChatPinnedMessage;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatPinnedMessageRepository extends JpaRepository<ChatPinnedMessage, UUID> {

    @Query("""
            SELECT pm
            FROM ChatPinnedMessage pm
            JOIN FETCH pm.message m
            JOIN FETCH m.sender
            LEFT JOIN FETCH pm.pinnedBy
            LEFT JOIN FETCH pm.peerUser
            LEFT JOIN FETCH pm.conversation
            WHERE pm.ownerUser.id = :ownerUserId
              AND COALESCE(m.deleted, false) = false
            ORDER BY pm.createdAt DESC
            """)
    List<ChatPinnedMessage> findByOwnerUserId(@Param("ownerUserId") UUID ownerUserId);

    @Query("""
            SELECT pm
            FROM ChatPinnedMessage pm
            WHERE pm.ownerUser.id = :ownerUserId
              AND pm.peerUser.id = :peerUserId
            """)
    Optional<ChatPinnedMessage> findByOwnerAndPeer(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("peerUserId") UUID peerUserId
    );

    @Query("""
            SELECT pm
            FROM ChatPinnedMessage pm
            WHERE pm.ownerUser.id = :ownerUserId
              AND pm.peerUser.id = :peerUserId
              AND pm.message.id = :messageId
            """)
    Optional<ChatPinnedMessage> findByOwnerAndPeerAndMessage(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("peerUserId") UUID peerUserId,
            @Param("messageId") UUID messageId
    );

    @Query("""
            SELECT pm
            FROM ChatPinnedMessage pm
            WHERE pm.ownerUser.id = :ownerUserId
              AND pm.conversation.id = :conversationId
            """)
    Optional<ChatPinnedMessage> findByOwnerAndConversation(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("conversationId") UUID conversationId
    );

    @Query("""
            SELECT pm
            FROM ChatPinnedMessage pm
            WHERE pm.ownerUser.id = :ownerUserId
              AND pm.conversation.id = :conversationId
              AND pm.message.id = :messageId
            """)
    Optional<ChatPinnedMessage> findByOwnerAndConversationAndMessage(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("conversationId") UUID conversationId,
            @Param("messageId") UUID messageId
    );

    @Query("""
            SELECT pm
            FROM ChatPinnedMessage pm
            JOIN FETCH pm.ownerUser
            JOIN FETCH pm.message m
            JOIN FETCH m.sender
            LEFT JOIN FETCH pm.pinnedBy
            LEFT JOIN FETCH pm.peerUser
            LEFT JOIN FETCH pm.conversation
            WHERE m.id = :messageId
            """)
    List<ChatPinnedMessage> findByMessageIdWithTargets(@Param("messageId") UUID messageId);

    @Modifying
    @Query("""
            DELETE FROM ChatPinnedMessage pm
            WHERE pm.message.id = :messageId
            """)
    void deleteByMessageId(@Param("messageId") UUID messageId);
}
