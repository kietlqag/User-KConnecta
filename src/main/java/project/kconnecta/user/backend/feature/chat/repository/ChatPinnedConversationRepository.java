package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.chat.entity.ChatPinnedConversation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatPinnedConversationRepository extends JpaRepository<ChatPinnedConversation, UUID> {

    @Query("""
            SELECT p
            FROM ChatPinnedConversation p
            LEFT JOIN FETCH p.peerUser
            LEFT JOIN FETCH p.conversation
            WHERE p.ownerUser.id = :ownerUserId
            ORDER BY p.createdAt ASC
            """)
    List<ChatPinnedConversation> findByOwnerUserId(@Param("ownerUserId") UUID ownerUserId);

    @Query("""
            SELECT p
            FROM ChatPinnedConversation p
            WHERE p.ownerUser.id = :ownerUserId
              AND p.peerUser.id = :peerUserId
            """)
    Optional<ChatPinnedConversation> findByOwnerAndPeer(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("peerUserId") UUID peerUserId
    );

    @Query("""
            SELECT p
            FROM ChatPinnedConversation p
            WHERE p.ownerUser.id = :ownerUserId
              AND p.conversation.id = :conversationId
            """)
    Optional<ChatPinnedConversation> findByOwnerAndConversation(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("conversationId") UUID conversationId
    );
}

