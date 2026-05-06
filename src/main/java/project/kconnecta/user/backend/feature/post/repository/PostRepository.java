package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.Post;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
    // Explicit JOIN FETCH instead of @EntityGraph to avoid the known Spring Data JPA
    // issue where @EntityGraph + @Query can cause the JPQL WHERE clause to be
    // partially ignored or generate conflicting implicit/explicit joins.
    @org.springframework.data.jpa.repository.Query(value = 
        "SELECT p.* FROM posts p " +
        "LEFT JOIN user_groups g ON p.group_id = g.id " +
        "WHERE p.group_id IS NULL " +
        "   OR g.privacy = 'PUBLIC' " +
        "   OR (:currentUserId IS NOT NULL AND p.group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = :currentUserId)) " +
        "ORDER BY (" +
        "  0.6 * (1.0 / (1.0 + (GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(p.published_at, p.created_at)))) / 21600.0))) + " +
        "  0.4 * LEAST((" +
        "    (SELECT count(*) FROM post_reactions pr WHERE pr.post_id = p.id) + " +
        "    (SELECT count(*) FROM post_comments pc WHERE pc.post_id = p.id) * 2.0 + " +
        "    (SELECT count(*) FROM post_shares ps WHERE ps.post_id = p.id) * 2.0" +
        "  ) / 80.0, 1.0)" +
        ") DESC, p.created_at DESC",
        countQuery = "SELECT count(*) FROM posts p LEFT JOIN user_groups g ON p.group_id = g.id WHERE p.group_id IS NULL OR g.privacy = 'PUBLIC' OR (:currentUserId IS NOT NULL AND p.group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = :currentUserId))",
        nativeQuery = true
    )
    org.springframework.data.domain.Page<Post> findHomeFeedPostsWithScoring(
        @org.springframework.data.repository.query.Param("currentUserId") UUID currentUserId, 
        org.springframework.data.domain.Pageable pageable
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group WHERE p.group IS NULL OR p.group.privacy = project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy.PUBLIC ORDER BY p.createdAt DESC"
    )
    List<Post> findHomeFeedPostsOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group WHERE p.author.id = :authorId ORDER BY p.createdAt DESC"
    )
    List<Post> findByAuthorId(@org.springframework.data.repository.query.Param("authorId") UUID authorId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author JOIN FETCH p.group WHERE p.group IS NOT NULL AND p.group.id = :groupId ORDER BY p.createdAt DESC"
    )
    List<Post> findByGroupId(@org.springframework.data.repository.query.Param("groupId") UUID groupId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author JOIN FETCH p.group g " +
        "WHERE g.id IN (SELECT gm.group.id FROM GroupMember gm WHERE gm.user.id = :userId) " +
        "ORDER BY p.createdAt DESC"
    )
    List<Post> findGroupFeedPostsByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
