package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;
import project.kconnecta.user.backend.feature.post.entity.PostReaction;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostReactionRepository extends JpaRepository<PostReaction, UUID> {
    interface ReactionCountProjection {
        ReactionType getReactionType();
        long getCount();
    }

    Optional<PostReaction> findByPostIdAndUserId(UUID postId, UUID userId);

    @Query("select r from PostReaction r where r.share.id = :shareId and r.user.id = :userId")
    Optional<PostReaction> findByShareIdAndUserId(@Param("shareId") UUID shareId, @Param("userId") UUID userId);

    void deleteByPostIdAndUserId(UUID postId, UUID userId);

    @Modifying
    @Query("delete from PostReaction r where r.share.id = :shareId and r.user.id = :userId")
    void deleteByShareIdAndUserId(@Param("shareId") UUID shareId, @Param("userId") UUID userId);

    @Query("select count(r) from PostReaction r where r.post.id = :postId and r.share is null")
    long countByPostId(@Param("postId") UUID postId);

    @Query("select count(r) from PostReaction r where r.share.id = :shareId")
    long countByShareId(@Param("shareId") UUID shareId);

    @Query("select r from PostReaction r where r.post.id = :postId and r.share is null order by r.createdAt desc")
    List<PostReaction> findAllByPostIdOrderByCreatedAtDesc(@Param("postId") UUID postId);

    @Query("select r from PostReaction r where r.share.id = :shareId order by r.createdAt desc")
    List<PostReaction> findAllByShareIdOrderByCreatedAtDesc(@Param("shareId") UUID shareId);

    @Query("""
            select r.reactionType as reactionType, count(r) as count
            from PostReaction r
            where r.post.id = :postId and r.share is null
            group by r.reactionType
            """)
    List<ReactionCountProjection> findReactionCountsByPostId(@Param("postId") UUID postId);

    @Query("""
            select r.reactionType as reactionType, count(r) as count
            from PostReaction r
            where r.share.id = :shareId
            group by r.reactionType
            """)
    List<ReactionCountProjection> findReactionCountsByShareId(@Param("shareId") UUID shareId);

    @Query("""
            select r.post.id as postId, r.reactionType as reactionType, count(r) as count
            from PostReaction r
            where r.post.id in :postIds and r.share is null
            group by r.post.id, r.reactionType
            """)
    List<PostReactionCountProjection> findReactionCountsByPostIds(@Param("postIds") List<UUID> postIds);

    @Query("""
            select r.share.id as shareId, r.reactionType as reactionType, count(r) as count
            from PostReaction r
            where r.share.id in :shareIds
            group by r.share.id, r.reactionType
            """)
    List<ShareReactionCountProjection> findReactionCountsByShareIds(@Param("shareIds") List<UUID> shareIds);

    interface PostReactionCountProjection {
        UUID getPostId();
        ReactionType getReactionType();
        long getCount();
    }

    interface ShareReactionCountProjection {
        UUID getShareId();
        ReactionType getReactionType();
        long getCount();
    }

    @Query("select r from PostReaction r where r.user.id = :userId and r.post.id in :postIds and r.share is null")
    List<PostReaction> findAllByUserIdAndPostIdIn(@Param("userId") UUID userId, @Param("postIds") List<UUID> postIds);

    @Query("select r from PostReaction r where r.user.id = :userId and r.share.id in :shareIds")
    List<PostReaction> findAllByUserIdAndShareIdIn(@Param("userId") UUID userId, @Param("shareIds") List<UUID> shareIds);
}
