package project.kconnecta.user.backend.feature.collection.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.collection.entity.SavedCollectionItem;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavedCollectionItemRepository extends JpaRepository<SavedCollectionItem, UUID> {

    boolean existsByCollectionIdAndPostId(UUID collectionId, UUID postId);

    Optional<SavedCollectionItem> findByCollectionIdAndPostId(UUID collectionId, UUID postId);

    void deleteByCollectionIdAndPostId(UUID collectionId, UUID postId);

    long countByCollectionId(UUID collectionId);

    @Query("select i.collection.id from SavedCollectionItem i where i.collection.user.id = :userId and i.post.id = :postId")
    List<UUID> findCollectionIdsByUserIdAndPostId(@Param("userId") UUID userId, @Param("postId") UUID postId);

    @Query("select i.post.id from SavedCollectionItem i where i.collection.id = :collectionId order by i.createdAt desc")
    List<UUID> findPostIdsByCollectionIdOrderByCreatedAtDesc(@Param("collectionId") UUID collectionId);
}
