package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import project.kconnecta.user.backend.feature.post.entity.PostPollVote;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostPollVoteRepository extends JpaRepository<PostPollVote, UUID> {
    List<PostPollVote> findAllByPollIdAndUserId(UUID pollId, UUID userId);

    List<PostPollVote> findAllByPollIdInAndUserId(Collection<UUID> pollIds, UUID userId);

    interface OptionVoteCountProjection {
        UUID getOptionId();
        Long getCount();
    }

    @Query("""
            SELECT v.option.id AS optionId, COUNT(v) AS count
            FROM PostPollVote v
            WHERE v.poll.id = :pollId
            GROUP BY v.option.id
            """)
    List<OptionVoteCountProjection> countVotesByPollId(UUID pollId);

    @Query("""
            SELECT v.option.id AS optionId, COUNT(v) AS count
            FROM PostPollVote v
            WHERE v.poll.id IN :pollIds
            GROUP BY v.option.id
            """)
    List<OptionVoteCountProjection> countVotesByPollIdIn(Collection<UUID> pollIds);

    @Modifying
    @Query("DELETE FROM PostPollVote v WHERE v.poll.id = :pollId AND v.user.id = :userId")
    void deleteAllByPollIdAndUserId(UUID pollId, UUID userId);

    Optional<PostPollVote> findByPollIdAndUserIdAndOptionId(UUID pollId, UUID userId, UUID optionId);
}
