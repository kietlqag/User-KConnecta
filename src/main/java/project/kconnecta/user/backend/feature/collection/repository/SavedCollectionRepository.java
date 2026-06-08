package project.kconnecta.user.backend.feature.collection.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.collection.entity.SavedCollection;

import java.util.List;
import java.util.UUID;

@Repository
public interface SavedCollectionRepository extends JpaRepository<SavedCollection, UUID> {

    List<SavedCollection> findByUserIdOrderByCreatedAtDesc(UUID userId);

    boolean existsByUserIdAndName(UUID userId, String name);
}
