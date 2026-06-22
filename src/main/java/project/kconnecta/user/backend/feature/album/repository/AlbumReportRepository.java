package project.kconnecta.user.backend.feature.album.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.album.entity.AlbumReport;

import java.util.UUID;

@Repository
public interface AlbumReportRepository extends JpaRepository<AlbumReport, UUID> {

    boolean existsByAlbumIdAndReporterId(UUID albumId, UUID reporterId);
}
