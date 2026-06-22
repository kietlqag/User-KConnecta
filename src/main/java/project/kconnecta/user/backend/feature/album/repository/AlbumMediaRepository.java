package project.kconnecta.user.backend.feature.album.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.album.entity.AlbumMedia;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumMediaRepository extends JpaRepository<AlbumMedia, UUID> {

    @Query("SELECT m FROM AlbumMedia m WHERE m.album.id = :albumId ORDER BY m.sortOrder ASC, m.createdAt ASC")
    List<AlbumMedia> findAllByAlbumIdOrderBySortOrder(@Param("albumId") UUID albumId);

    @Query("SELECT m FROM AlbumMedia m WHERE m.id = :mediaId AND m.album.id = :albumId")
    Optional<AlbumMedia> findByIdAndAlbumId(@Param("mediaId") UUID mediaId, @Param("albumId") UUID albumId);

    int countByAlbumId(UUID albumId);

    @Query("SELECT COALESCE(MAX(m.sortOrder), -1) FROM AlbumMedia m WHERE m.album.id = :albumId")
    int findMaxSortOrder(@Param("albumId") UUID albumId);
}
