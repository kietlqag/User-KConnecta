package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostSaved;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface PostSavedRepository extends JpaRepository<PostSaved, UUID> {

    Optional<PostSaved> findByPostIdAndUserId(UUID postId, UUID userId);

    boolean existsByPostIdAndUserId(UUID postId, UUID userId);

    void deleteByPostIdAndUserId(UUID postId, UUID userId);

    @Query("select s.post.id from PostSaved s where s.user.id = :userId order by s.createdAt desc")
    List<UUID> findPostIdsByUserId(@Param("userId") UUID userId);

    @Query("select s.post.id from PostSaved s where s.user.id = :userId and s.post.id in :postIds")
    Set<UUID> findSavedPostIdsByUserIdAndPostIdIn(@Param("userId") UUID userId, @Param("postIds") List<UUID> postIds);
}
