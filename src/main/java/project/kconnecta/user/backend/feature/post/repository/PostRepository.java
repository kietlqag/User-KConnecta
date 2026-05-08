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
        // w1=0.4 · độ thân thiết: own post → 1.0, friend → 0.7, stranger → 0.0
        "  0.4 * CASE " +
        "    WHEN :currentUserId IS NULL THEN 0.0 " +
        "    WHEN p.author_id = CAST(:currentUserId AS uuid) THEN 1.0 " +
        "    WHEN EXISTS (" +
        "      SELECT 1 FROM friendships f " +
        "      WHERE f.status = 'ACCEPTED' " +
        "        AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) " +
        "          OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id)) " +
        "    ) THEN 0.7 " +
        "    ELSE 0.0 " +
        "  END + " +
        // w2=0.3 · số tương tác: reactions + comments*2 + shares*3, normalized to [0,1]
        "  0.3 * LEAST((" +
        "    (SELECT count(*) FROM post_reactions pr WHERE pr.post_id = p.id) + " +
        "    (SELECT count(*) FROM post_comments pc WHERE pc.post_id = p.id) * 2.0 + " +
        "    (SELECT count(*) FROM post_shares ps WHERE ps.post_id = p.id) * 3.0 " +
        "  ) / 100.0, 1.0) + " +
        // w3=0.3 · độ mới: exponential decay, half-life ≈ 6 hours
        "  0.3 * (1.0 / (1.0 + (GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(p.published_at, p.created_at)))) / 21600.0)))" +
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

    // PostgreSQL ILIKE for case-insensitive full-text search on post content.
    // Tip: CREATE INDEX idx_posts_content_trgm ON public.posts USING GIN (content gin_trgm_ops);
    @org.springframework.data.jpa.repository.Query(
        value = "SELECT * FROM posts WHERE status = 'PUBLISHED' AND privacy = 'PUBLIC' AND content ILIKE CONCAT('%', :q, '%') ORDER BY published_at DESC NULLS LAST",
        nativeQuery = true
    )
    List<Post> searchByContent(@org.springframework.data.repository.query.Param("q") String q, org.springframework.data.domain.Pageable pageable);

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
