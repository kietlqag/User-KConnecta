package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.Post;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {

    @Query("SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group " +
           "WHERE p.status = 'PUBLISHED' AND p.privacy = 'PUBLIC'")
    List<Post> findAllPublishedPublicWithAuthorAndGroup();

    @Query("SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group " +
           "WHERE p.id IN :ids")
    List<Post> findAllByIdIn(@Param("ids") List<UUID> ids);
    interface CheckInSuggestionProjection {
        String getLocationText();
        Long getUsageCount();
    }

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT p.location_text AS locationText, COUNT(*) AS usageCount " +
                "FROM posts p " +
                "WHERE p.location_text IS NOT NULL " +
                "  AND btrim(p.location_text) <> '' " +
                "  AND p.status = 'PUBLISHED' " +
                "  AND ( " +
                "       (:currentUserId IS NULL AND p.privacy = 'PUBLIC') " +
                "       OR (:currentUserId IS NOT NULL AND (p.privacy = 'PUBLIC' OR p.author_id = CAST(:currentUserId AS uuid))) " +
                "  ) " +
                "GROUP BY p.location_text " +
                "ORDER BY " +
                "  MAX(CASE WHEN :ward IS NOT NULL AND p.location_text ILIKE CONCAT('%', :ward, '%') THEN 1 ELSE 0 END) DESC, " +
                "  MAX(CASE WHEN :province IS NOT NULL AND p.location_text ILIKE CONCAT('%', :province, '%') THEN 1 ELSE 0 END) DESC, " +
                "  COUNT(*) DESC, " +
                "  MAX(COALESCE(p.published_at, p.created_at)) DESC",
        nativeQuery = true
    )
    List<CheckInSuggestionProjection> findCheckInSuggestions(
        @org.springframework.data.repository.query.Param("currentUserId") UUID currentUserId,
        @org.springframework.data.repository.query.Param("province") String province,
        @org.springframework.data.repository.query.Param("ward") String ward
    );

    // Explicit JOIN FETCH instead of @EntityGraph to avoid the known Spring Data JPA
    // issue where @EntityGraph + @Query can cause the JPQL WHERE clause to be
    // partially ignored or generate conflicting implicit/explicit joins.
    @org.springframework.data.jpa.repository.Query(value =
        "SELECT p.* FROM posts p " +
        "LEFT JOIN user_groups g ON p.group_id = g.id " +
        "LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_reactions GROUP BY post_id) pr_agg ON pr_agg.post_id = p.id " +
        "LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id) pc_agg ON pc_agg.post_id = p.id " +
        "LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_shares  GROUP BY post_id) ps_agg ON ps_agg.post_id = p.id " +
        // Count how many times currentUser has reacted to each author's posts → proxy for "close friend"
        "LEFT JOIN (" +
        "  SELECT p2.author_id, COUNT(*) AS cnt FROM post_reactions pr2 " +
        "  JOIN posts p2 ON pr2.post_id = p2.id " +
        "  WHERE (:currentUserId IS NOT NULL AND pr2.user_id = CAST(:currentUserId AS uuid)) " +
        "  GROUP BY p2.author_id" +
        ") ui ON ui.author_id = p.author_id " +
        "WHERE p.status = 'PUBLISHED' " +
        "  AND (p.group_id IS NULL " +
        "   OR g.privacy = 'PUBLIC' " +
        "   OR p.privacy = 'PUBLIC' " +
        "   OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "   OR (:currentUserId IS NOT NULL AND p.group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = :currentUserId))) " +
        "  AND (" +
        "    p.privacy = 'PUBLIC' " +
        "    OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "    OR (" +
        "      :currentUserId IS NOT NULL " +
        "      AND p.privacy IN ('FRIENDS', 'FRIENDS_EXCEPT') " +
        "      AND EXISTS (" +
        "        SELECT 1 FROM friendships f " +
        "        WHERE f.status = 'ACCEPTED' " +
        "          AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) " +
        "            OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id)) " +
        "      ) " +
        "      AND NOT (" +
        "        p.privacy = 'FRIENDS_EXCEPT' " +
        "        AND EXISTS (" +
        "          SELECT 1 FROM post_audience_exclusions pae " +
        "          WHERE pae.post_id = p.id " +
        "            AND pae.excluded_user_id = CAST(:currentUserId AS uuid) " +
        "        ) " +
        "      ) " +
        "    ) " +
        "    OR (" +
        "      :currentUserId IS NOT NULL " +
        "      AND p.privacy = 'SPECIFIC_FRIENDS' " +
        "      AND EXISTS (" +
        "        SELECT 1 FROM post_audience_allowances paa " +
        "        WHERE paa.post_id = p.id " +
        "          AND paa.allowed_user_id = CAST(:currentUserId AS uuid) " +
        "      ) " +
        "    ) " +
        "  ) " +
        "ORDER BY (" +
        // w1=0.20 · affinity: 4 levels — self / close-friend (≥5 interactions) / friend / stranger
        "  0.20 * CASE " +
        "    WHEN :currentUserId IS NULL THEN 0.5 " +
        "    WHEN p.author_id = CAST(:currentUserId AS uuid) THEN 1.0 " +
        "    WHEN COALESCE(ui.cnt, 0) >= 5 THEN 0.9 " +
        "    WHEN EXISTS (" +
        "      SELECT 1 FROM friendships f " +
        "      WHERE f.status = 'ACCEPTED' " +
        "        AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) " +
        "          OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id)) " +
        "    ) THEN 0.7 " +
        "    ELSE 0.5 " +
        "  END + " +
        // Recency uses NOW() snapped to a 10-minute bucket (to_timestamp(floor(epoch/600)*600))
        // so the ranking is STABLE across page fetches within a scroll session. Without this,
        // NOW() advances between page 0 and page 1, scores drift, offset pages overlap/skip, and
        // the same post can appear on two pages → duplicate React keys → feed scroll jumps.
        // w2=0.40 · time-weighted engagement: decay by sqrt(1 + age_weeks) so old viral posts don't dominate
        "  0.40 * LEAST(" +
        "    (COALESCE(pr_agg.cnt, 0) + COALESCE(pc_agg.cnt, 0) * 2.0 + COALESCE(ps_agg.cnt, 0) * 3.0) " +
        "    / (100.0 * SQRT(1.0 + GREATEST(0, EXTRACT(EPOCH FROM (to_timestamp(floor(extract(epoch from now()) / 600.0) * 600) - COALESCE(p.published_at, p.created_at)))) / 604800.0)), " +
        "    1.0) + " +
        // w3=0.40 · recency: exponential decay, half-life ≈ 6 hours
        "  0.40 * (1.0 / (1.0 + (GREATEST(0, EXTRACT(EPOCH FROM (to_timestamp(floor(extract(epoch from now()) / 600.0) * 600) - COALESCE(p.published_at, p.created_at)))) / 21600.0)))" +
        ") DESC, p.created_at DESC",
        countQuery =
        "SELECT count(*) FROM posts p " +
        "LEFT JOIN user_groups g ON p.group_id = g.id " +
        "WHERE p.status = 'PUBLISHED' " +
        "  AND (p.group_id IS NULL OR g.privacy = 'PUBLIC' OR p.privacy = 'PUBLIC' OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) OR (:currentUserId IS NOT NULL AND p.group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = :currentUserId))) " +
        "  AND (" +
        "    p.privacy = 'PUBLIC' " +
        "    OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "    OR (" +
        "      :currentUserId IS NOT NULL " +
        "      AND p.privacy IN ('FRIENDS', 'FRIENDS_EXCEPT') " +
        "      AND EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'ACCEPTED' AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id))) " +
        "      AND NOT (p.privacy = 'FRIENDS_EXCEPT' AND EXISTS (SELECT 1 FROM post_audience_exclusions pae WHERE pae.post_id = p.id AND pae.excluded_user_id = CAST(:currentUserId AS uuid))) " +
        "    ) " +
        "    OR (:currentUserId IS NOT NULL AND p.privacy = 'SPECIFIC_FRIENDS' AND EXISTS (SELECT 1 FROM post_audience_allowances paa WHERE paa.post_id = p.id AND paa.allowed_user_id = CAST(:currentUserId AS uuid))) " +
        "  )",
        nativeQuery = true
    )
    org.springframework.data.domain.Page<Post> findHomeFeedPostsWithScoring(
        @org.springframework.data.repository.query.Param("currentUserId") UUID currentUserId, 
        org.springframework.data.domain.Pageable pageable
    );

    @org.springframework.data.jpa.repository.Query(value =
        "SELECT p.* FROM posts p " +
        "LEFT JOIN user_groups g ON p.group_id = g.id " +
        "WHERE p.status = 'PUBLISHED' " +
        "  AND (" +
        "    EXISTS (SELECT 1 FROM post_media pm WHERE pm.post_id = p.id AND pm.media_type = 'VIDEO') " +
        "    OR (p.image_url IS NOT NULL AND (" +
        "      p.image_url ILIKE '%/video/%' " +
        "      OR p.image_url ~* '\\.(mp4|mov|webm|m4v|ogg)(\\?.*)?$'" +
        "    ))" +
        "  ) " +
        "  AND (p.group_id IS NULL " +
        "   OR g.privacy = 'PUBLIC' " +
        "   OR p.privacy = 'PUBLIC' " +
        "   OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "   OR (:currentUserId IS NOT NULL AND p.group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = :currentUserId))) " +
        "  AND (" +
        "    p.privacy = 'PUBLIC' " +
        "    OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "    OR (" +
        "      :currentUserId IS NOT NULL " +
        "      AND p.privacy IN ('FRIENDS', 'FRIENDS_EXCEPT') " +
        "      AND EXISTS (" +
        "        SELECT 1 FROM friendships f " +
        "        WHERE f.status = 'ACCEPTED' " +
        "          AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) " +
        "            OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id)) " +
        "      ) " +
        "      AND NOT (" +
        "        p.privacy = 'FRIENDS_EXCEPT' " +
        "        AND EXISTS (" +
        "          SELECT 1 FROM post_audience_exclusions pae " +
        "          WHERE pae.post_id = p.id " +
        "            AND pae.excluded_user_id = CAST(:currentUserId AS uuid) " +
        "        ) " +
        "      ) " +
        "    ) " +
        "    OR (" +
        "      :currentUserId IS NOT NULL " +
        "      AND p.privacy = 'SPECIFIC_FRIENDS' " +
        "      AND EXISTS (" +
        "        SELECT 1 FROM post_audience_allowances paa " +
        "        WHERE paa.post_id = p.id " +
        "          AND paa.allowed_user_id = CAST(:currentUserId AS uuid) " +
        "      ) " +
        "    ) " +
        "  ) " +
        "ORDER BY COALESCE(p.published_at, p.created_at) DESC",
        countQuery =
        "SELECT count(*) FROM posts p " +
        "LEFT JOIN user_groups g ON p.group_id = g.id " +
        "WHERE p.status = 'PUBLISHED' " +
        "  AND (" +
        "    EXISTS (SELECT 1 FROM post_media pm WHERE pm.post_id = p.id AND pm.media_type = 'VIDEO') " +
        "    OR (p.image_url IS NOT NULL AND (" +
        "      p.image_url ILIKE '%/video/%' " +
        "      OR p.image_url ~* '\\.(mp4|mov|webm|m4v|ogg)(\\?.*)?$'" +
        "    ))" +
        "  ) " +
        "  AND (p.group_id IS NULL OR g.privacy = 'PUBLIC' OR p.privacy = 'PUBLIC' OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) OR (:currentUserId IS NOT NULL AND p.group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = :currentUserId))) " +
        "  AND (" +
        "    p.privacy = 'PUBLIC' " +
        "    OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "    OR (" +
        "      :currentUserId IS NOT NULL " +
        "      AND p.privacy IN ('FRIENDS', 'FRIENDS_EXCEPT') " +
        "      AND EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'ACCEPTED' AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id))) " +
        "      AND NOT (p.privacy = 'FRIENDS_EXCEPT' AND EXISTS (SELECT 1 FROM post_audience_exclusions pae WHERE pae.post_id = p.id AND pae.excluded_user_id = CAST(:currentUserId AS uuid))) " +
        "    ) " +
        "    OR (:currentUserId IS NOT NULL AND p.privacy = 'SPECIFIC_FRIENDS' AND EXISTS (SELECT 1 FROM post_audience_allowances paa WHERE paa.post_id = p.id AND paa.allowed_user_id = CAST(:currentUserId AS uuid))) " +
        "  )",
        nativeQuery = true
    )
    org.springframework.data.domain.Page<Post> findWatchFeedPosts(
        @org.springframework.data.repository.query.Param("currentUserId") UUID currentUserId,
        org.springframework.data.domain.Pageable pageable
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group " +
        "WHERE p.status = 'PUBLISHED' " +
        "AND (p.group IS NULL OR p.group.privacy = project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy.PUBLIC) " +
        "ORDER BY p.createdAt DESC"
    )
    List<Post> findHomeFeedPostsOrderByCreatedAtDesc();

    // PostgreSQL ILIKE for case-insensitive full-text search on post content.
    // Tip: CREATE INDEX idx_posts_content_trgm ON public.posts USING GIN (content gin_trgm_ops);
    @org.springframework.data.jpa.repository.Query(
        value = "SELECT * FROM posts WHERE status = 'PUBLISHED' AND privacy = 'PUBLIC' AND unaccent(content) ILIKE unaccent(CONCAT('%', :q, '%')) ORDER BY published_at DESC NULLS LAST",
        nativeQuery = true
    )
    List<Post> searchByContent(@org.springframework.data.repository.query.Param("q") String q, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group " +
        "WHERE p.author.id = :authorId AND p.status = 'PUBLISHED' ORDER BY p.createdAt DESC"
    )
    List<Post> findByAuthorId(@org.springframework.data.repository.query.Param("authorId") UUID authorId);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group WHERE p.author.id = :authorId AND p.status = 'PUBLISHED' ORDER BY p.createdAt DESC",
        countQuery = "SELECT COUNT(p) FROM Post p WHERE p.author.id = :authorId AND p.status = 'PUBLISHED'"
    )
    org.springframework.data.domain.Page<Post> findByAuthorIdPageable(
        @org.springframework.data.repository.query.Param("authorId") UUID authorId,
        org.springframework.data.domain.Pageable pageable
    );

    @Query("""
        SELECT DISTINCT p FROM Post p
        JOIN FETCH p.author
        LEFT JOIN FETCH p.group
        LEFT JOIN FETCH p.page
        WHERE p.author.id = :authorId
          AND p.status = project.kconnecta.user.backend.feature.post.entity.enums.PostStatus.PUBLISHED
          AND (
            p.privacy = project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy.PUBLIC
            OR (:currentUserId IS NOT NULL AND p.author.id = :currentUserId)
            OR (
              :currentUserId IS NOT NULL
              AND p.privacy IN (
                project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy.FRIENDS,
                project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy.FRIENDS_EXCEPT
              )
              AND EXISTS (
                SELECT 1 FROM Friendship f
                WHERE f.status = project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus.ACCEPTED
                  AND (
                    (f.requester.id = :currentUserId AND f.addressee.id = p.author.id)
                    OR (f.addressee.id = :currentUserId AND f.requester.id = p.author.id)
                  )
              )
              AND NOT (
                p.privacy = project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy.FRIENDS_EXCEPT
                AND EXISTS (
                  SELECT 1 FROM PostAudienceExclusion pae
                  WHERE pae.post = p AND pae.excludedUser.id = :currentUserId
                )
              )
            )
            OR (
              :currentUserId IS NOT NULL
              AND p.privacy = project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy.SPECIFIC_FRIENDS
              AND EXISTS (
                SELECT 1 FROM PostAudienceAllowance paa
                WHERE paa.post = p AND paa.allowedUser.id = :currentUserId
              )
            )
          )
        ORDER BY p.createdAt DESC
        """)
    List<Post> findByAuthorIdWithPrivacyFetched(
        @Param("authorId") UUID authorId,
        @Param("currentUserId") UUID currentUserId
    );

    @org.springframework.data.jpa.repository.Query(
        value =
        "SELECT p.* FROM posts p " +
        "WHERE p.author_id = CAST(:authorId AS uuid) " +
        "  AND p.status = 'PUBLISHED' " +
        "  AND (" +
        "    p.privacy = 'PUBLIC' " +
        "    OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "    OR (" +
        "      :currentUserId IS NOT NULL " +
        "      AND p.privacy IN ('FRIENDS', 'FRIENDS_EXCEPT') " +
        "      AND EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'ACCEPTED' AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id))) " +
        "      AND NOT (p.privacy = 'FRIENDS_EXCEPT' AND EXISTS (SELECT 1 FROM post_audience_exclusions pae WHERE pae.post_id = p.id AND pae.excluded_user_id = CAST(:currentUserId AS uuid))) " +
        "    ) " +
        "    OR (:currentUserId IS NOT NULL AND p.privacy = 'SPECIFIC_FRIENDS' AND EXISTS (SELECT 1 FROM post_audience_allowances paa WHERE paa.post_id = p.id AND paa.allowed_user_id = CAST(:currentUserId AS uuid))) " +
        "  ) " +
        "ORDER BY p.created_at DESC",
        countQuery =
        "SELECT COUNT(*) FROM posts p " +
        "WHERE p.author_id = CAST(:authorId AS uuid) " +
        "  AND p.status = 'PUBLISHED' " +
        "  AND (" +
        "    p.privacy = 'PUBLIC' " +
        "    OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "    OR (:currentUserId IS NOT NULL AND p.privacy IN ('FRIENDS', 'FRIENDS_EXCEPT') AND EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'ACCEPTED' AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id))) AND NOT (p.privacy = 'FRIENDS_EXCEPT' AND EXISTS (SELECT 1 FROM post_audience_exclusions pae WHERE pae.post_id = p.id AND pae.excluded_user_id = CAST(:currentUserId AS uuid)))) " +
        "    OR (:currentUserId IS NOT NULL AND p.privacy = 'SPECIFIC_FRIENDS' AND EXISTS (SELECT 1 FROM post_audience_allowances paa WHERE paa.post_id = p.id AND paa.allowed_user_id = CAST(:currentUserId AS uuid))) " +
        "  )",
        nativeQuery = true
    )
    org.springframework.data.domain.Page<Post> findByAuthorIdWithPrivacy(
        @org.springframework.data.repository.query.Param("authorId") UUID authorId,
        @org.springframework.data.repository.query.Param("currentUserId") UUID currentUserId,
        org.springframework.data.domain.Pageable pageable
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author JOIN FETCH p.group " +
        "WHERE p.group IS NOT NULL AND p.group.id = :groupId AND p.status = 'PUBLISHED' " +
        "ORDER BY p.publishedAt DESC, p.createdAt DESC"
    )
    List<Post> findByGroupId(@org.springframework.data.repository.query.Param("groupId") UUID groupId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author JOIN FETCH p.group g " +
        "WHERE p.status = 'PUBLISHED' " +
        "AND g.id IN (SELECT gm.group.id FROM GroupMember gm WHERE gm.user.id = :userId AND gm.status = project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED) " +
        "ORDER BY p.publishedAt DESC, p.createdAt DESC"
    )
    List<Post> findGroupFeedPostsByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group " +
        "WHERE p.status = 'SCHEDULED' AND p.scheduledAt IS NOT NULL AND p.scheduledAt <= :now"
    )
    List<Post> findDueScheduledPosts(@Param("now") LocalDateTime now);

    @org.springframework.data.jpa.repository.Query(
        value =
        "SELECT EXISTS (" +
        "  SELECT 1 FROM posts p " +
        "  LEFT JOIN user_groups g ON p.group_id = g.id " +
        "  WHERE p.id = CAST(:postId AS uuid) " +
        "    AND p.status = 'PUBLISHED' " +
        "    AND (p.group_id IS NULL OR g.privacy = 'PUBLIC' OR p.privacy = 'PUBLIC' OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) OR (:currentUserId IS NOT NULL AND p.group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = CAST(:currentUserId AS uuid)))) " +
        "    AND (" +
        "      p.privacy = 'PUBLIC' " +
        "      OR (:currentUserId IS NOT NULL AND p.author_id = CAST(:currentUserId AS uuid)) " +
        "      OR (:currentUserId IS NOT NULL AND p.privacy IN ('FRIENDS', 'FRIENDS_EXCEPT') AND EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'ACCEPTED' AND ((f.requester_id = CAST(:currentUserId AS uuid) AND f.addressee_id = p.author_id) OR (f.addressee_id = CAST(:currentUserId AS uuid) AND f.requester_id = p.author_id))) AND NOT (p.privacy = 'FRIENDS_EXCEPT' AND EXISTS (SELECT 1 FROM post_audience_exclusions pae WHERE pae.post_id = p.id AND pae.excluded_user_id = CAST(:currentUserId AS uuid)))) " +
        "      OR (:currentUserId IS NOT NULL AND p.privacy = 'SPECIFIC_FRIENDS' AND EXISTS (SELECT 1 FROM post_audience_allowances paa WHERE paa.post_id = p.id AND paa.allowed_user_id = CAST(:currentUserId AS uuid))) " +
        "    )" +
        ")",
        nativeQuery = true
    )
    boolean isVisibleToUser(
        @org.springframework.data.repository.query.Param("postId") UUID postId,
        @org.springframework.data.repository.query.Param("currentUserId") UUID currentUserId
    );
}
