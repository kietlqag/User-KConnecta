package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.post.entity.PostPoll;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostPollRepository extends JpaRepository<PostPoll, UUID> {
    Optional<PostPoll> findByPostId(UUID postId);

    List<PostPoll> findAllByPostIdIn(Collection<UUID> postIds);
}
