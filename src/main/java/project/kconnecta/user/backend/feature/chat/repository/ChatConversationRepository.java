package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversation;

import java.util.Optional;
import java.util.UUID;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {

    @Query("""
            SELECT c FROM ChatConversation c
            WHERE c.id = :conversationId
            """)
    Optional<ChatConversation> findByIdPlain(@Param("conversationId") UUID conversationId);

    Optional<ChatConversation> findByJoinLinkToken(String joinLinkToken);
}

