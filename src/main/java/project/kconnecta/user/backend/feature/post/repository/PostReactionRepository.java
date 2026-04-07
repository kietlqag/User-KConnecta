package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostReaction;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostReactionRepository extends JpaRepository<PostReaction, UUID> {
    Optional<PostReaction> findByPostIdAndUserId(UUID postId, UUID userId);
    long countByPostId(UUID postId);
    List<PostReaction> findAllByPostIdOrderByCreatedAtDesc(UUID postId);
}
