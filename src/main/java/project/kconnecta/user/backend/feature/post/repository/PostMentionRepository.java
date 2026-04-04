package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostMention;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostMentionRepository extends JpaRepository<PostMention, UUID> {
    List<PostMention> findAllByPostId(UUID postId);
}
