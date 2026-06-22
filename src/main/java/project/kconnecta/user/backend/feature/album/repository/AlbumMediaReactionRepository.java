package project.kconnecta.user.backend.feature.album.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.album.entity.AlbumMediaReaction;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumMediaReactionRepository extends JpaRepository<AlbumMediaReaction, UUID> {

    Optional<AlbumMediaReaction> findByMediaIdAndUserId(UUID mediaId, UUID userId);

    long countByMediaId(UUID mediaId);
}
