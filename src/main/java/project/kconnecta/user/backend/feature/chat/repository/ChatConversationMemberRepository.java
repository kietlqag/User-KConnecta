package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversationMember;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatConversationMemberRepository extends JpaRepository<ChatConversationMember, UUID> {

    @Query("""
            SELECT COUNT(cm.id) > 0
            FROM ChatConversationMember cm
            WHERE cm.conversation.id = :conversationId
              AND cm.user.id = :userId
              AND cm.memberStatus = project.kconnecta.user.backend.feature.chat.entity.enums.ChatMemberStatus.APPROVED
            """)
    boolean existsApprovedByConversationIdAndUserId(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    @Query("""
            SELECT COUNT(cm.id) > 0
            FROM ChatConversationMember cm
            WHERE cm.conversation.id = :conversationId
              AND cm.user.id = :userId
            """)
    boolean existsByConversationIdAndUserId(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    @Query("""
            SELECT cm FROM ChatConversationMember cm
            JOIN FETCH cm.user u
            WHERE cm.conversation.id = :conversationId
            ORDER BY cm.joinedAt ASC
            """)
    List<ChatConversationMember> findMembersByConversationId(@Param("conversationId") UUID conversationId);

    @Query("""
            SELECT cm FROM ChatConversationMember cm
            JOIN FETCH cm.user u
            JOIN FETCH cm.conversation c
            WHERE cm.conversation.id = :conversationId
              AND cm.user.id = :userId
            """)
    Optional<ChatConversationMember> findByConversationIdAndUserId(
            @Param("conversationId") UUID conversationId,
            @Param("userId") UUID userId
    );

    @Query("""
            SELECT cm FROM ChatConversationMember cm
            JOIN FETCH cm.conversation c
            WHERE cm.user.id = :userId
              AND cm.memberStatus = project.kconnecta.user.backend.feature.chat.entity.enums.ChatMemberStatus.APPROVED
            ORDER BY c.createdAt DESC
            """)
    List<ChatConversationMember> findApprovedByUserIdWithConversation(@Param("userId") UUID userId);

    @Query("""
            SELECT COUNT(cm.id)
            FROM ChatConversationMember cm
            WHERE cm.conversation.id = :conversationId
              AND cm.user.id <> :excludeUserId
              AND cm.memberStatus = project.kconnecta.user.backend.feature.chat.entity.enums.ChatMemberStatus.APPROVED
            """)
    long countApprovedMembersExcluding(@Param("conversationId") UUID conversationId, @Param("excludeUserId") UUID excludeUserId);
}
