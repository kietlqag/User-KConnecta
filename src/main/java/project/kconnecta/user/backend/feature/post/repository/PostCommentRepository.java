package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostComment;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {
    long countByPostId(UUID postId);
    List<PostComment> findAllByPostIdOrderByCreatedAtAsc(UUID postId);

    @org.springframework.data.jpa.repository.Query("select c.post.id as postId, count(c) as count from PostComment c where c.post.id in :postIds group by c.post.id")
    List<CountProjection> countByPostIdIn(@org.springframework.data.repository.query.Param("postIds") List<UUID> postIds);

    interface CountProjection {
        UUID getPostId();
        long getCount();
    }
}
