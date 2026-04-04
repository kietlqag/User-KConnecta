package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostShare;

import java.util.UUID;

@Repository
public interface PostShareRepository extends JpaRepository<PostShare, UUID> {
    long countByPostId(UUID postId);
}
