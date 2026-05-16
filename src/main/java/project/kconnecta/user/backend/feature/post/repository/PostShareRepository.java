package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostShare;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostShareRepository extends JpaRepository<PostShare, UUID> {
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);

    long countByPostId(UUID postId);

    @org.springframework.data.jpa.repository.Query("select s.post.id as postId, count(s) as count from PostShare s where s.post.id in :postIds group by s.post.id")
    List<CountProjection> countByPostIdIn(@org.springframework.data.repository.query.Param("postIds") java.util.List<UUID> postIds);

    interface CountProjection {
        UUID getPostId();
        long getCount();
    }
}
