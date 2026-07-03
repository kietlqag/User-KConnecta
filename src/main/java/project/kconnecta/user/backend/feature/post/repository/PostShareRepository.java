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

    long countByParentShareId(UUID parentShareId);

    List<PostShare> findByParentShare_Id(UUID parentShareId);

    @org.springframework.data.jpa.repository.Query("select s.parentShare.id as parentShareId, count(s) as count from PostShare s where s.parentShare.id in :parentShareIds group by s.parentShare.id")
    List<ParentShareCountProjection> countByParentShareIdIn(@org.springframework.data.repository.query.Param("parentShareIds") java.util.List<UUID> parentShareIds);

    interface ParentShareCountProjection {
        UUID getParentShareId();
        long getCount();
    }

    @org.springframework.data.jpa.repository.Query("select s.post.id as postId, count(s) as count from PostShare s where s.post.id in :postIds group by s.post.id")
    List<CountProjection> countByPostIdIn(@org.springframework.data.repository.query.Param("postIds") java.util.List<UUID> postIds);

    interface CountProjection {
        UUID getPostId();
        long getCount();
    }

    @org.springframework.data.jpa.repository.Query(
        "SELECT s.post.id FROM PostShare s WHERE s.user.id = :userId AND s.post.id IN :postIds"
    )
    java.util.Set<UUID> findSharedPostIdsByUserIdAndPostIdIn(
        @org.springframework.data.repository.query.Param("userId") UUID userId,
        @org.springframework.data.repository.query.Param("postIds") java.util.List<UUID> postIds
    );

    // All shares by a user, with post+author+sharer eagerly loaded to avoid N+1
    @org.springframework.data.jpa.repository.Query(
        "SELECT ps FROM PostShare ps " +
        "JOIN FETCH ps.post p JOIN FETCH p.author LEFT JOIN FETCH p.group JOIN FETCH ps.user " +
        "WHERE ps.user.id = :userId ORDER BY ps.createdAt DESC"
    )
    java.util.List<PostShare> findSharesWithPostByUserId(
        @org.springframework.data.repository.query.Param("userId") UUID userId
    );

    // Recent shares from a set of users — used to inject friend shares into the newsfeed.
    // Exclude shares of posts inside a private group so private-group content never
    // surfaces on the home feed (it stays inside the group).
    @org.springframework.data.jpa.repository.Query(
        "SELECT ps FROM PostShare ps " +
        "JOIN FETCH ps.post p JOIN FETCH p.author LEFT JOIN FETCH p.group g JOIN FETCH ps.user " +
        "WHERE ps.user.id IN :userIds AND ps.createdAt >= :since " +
        "AND (g IS NULL OR g.privacy = project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy.PUBLIC) " +
        "ORDER BY ps.createdAt DESC"
    )
    java.util.List<PostShare> findRecentSharesByUserIds(
        @org.springframework.data.repository.query.Param("userIds") java.util.List<UUID> userIds,
        @org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since,
        org.springframework.data.domain.Pageable pageable
    );
}
