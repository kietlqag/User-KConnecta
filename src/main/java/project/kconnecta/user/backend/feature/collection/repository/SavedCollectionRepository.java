package project.kconnecta.user.backend.feature.collection.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.collection.entity.SavedCollection;

import java.util.List;
import java.util.UUID;

@Repository
public interface SavedCollectionRepository extends JpaRepository<SavedCollection, UUID> {

    List<SavedCollection> findByUserIdOrderByCreatedAtDesc(UUID userId);

    boolean existsByUserIdAndName(UUID userId, String name);

    @Query("""
            SELECT COUNT(c) > 0 FROM SavedCollection c
            WHERE c.user.id = :userId AND LOWER(TRIM(c.name)) = LOWER(TRIM(:name))
            """)
    boolean existsByUserIdAndNameIgnoreCase(@Param("userId") UUID userId, @Param("name") String name);
}
