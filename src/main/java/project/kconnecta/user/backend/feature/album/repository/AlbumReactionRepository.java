package project.kconnecta.user.backend.feature.album.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.album.entity.AlbumReaction;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumReactionRepository extends JpaRepository<AlbumReaction, UUID> {

    Optional<AlbumReaction> findByAlbumIdAndUserId(UUID albumId, UUID userId);

    long countByAlbumId(UUID albumId);
}
