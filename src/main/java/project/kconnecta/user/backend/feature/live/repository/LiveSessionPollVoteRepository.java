package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionPollVote;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LiveSessionPollVoteRepository extends JpaRepository<LiveSessionPollVote, UUID> {
    Optional<LiveSessionPollVote> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    List<LiveSessionPollVote> findAllBySessionId(UUID sessionId);

    long countBySessionIdAndOptionIndex(UUID sessionId, int optionIndex);

    @Modifying
    @Query("DELETE FROM LiveSessionPollVote v WHERE v.session.id = :sessionId")
    void deleteAllBySessionId(@Param("sessionId") UUID sessionId);
}
