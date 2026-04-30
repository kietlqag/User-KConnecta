package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
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
            LEFT JOIN FETCH pm.peerUser
            LEFT JOIN FETCH pm.conversation
            WHERE pm.ownerUser.id = :ownerUserId
            ORDER BY pm.createdAt ASC
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
              AND pm.conversation.id = :conversationId
            """)
    Optional<ChatPinnedMessage> findByOwnerAndConversation(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("conversationId") UUID conversationId
    );
}

