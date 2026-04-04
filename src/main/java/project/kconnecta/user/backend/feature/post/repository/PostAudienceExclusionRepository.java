package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostAudienceExclusion;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostAudienceExclusionRepository extends JpaRepository<PostAudienceExclusion, UUID> {
    List<PostAudienceExclusion> findAllByPostId(UUID postId);
}
