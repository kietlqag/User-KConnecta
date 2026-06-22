package project.kconnecta.user.backend.feature.album.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.album.entity.AlbumShare;

import java.util.UUID;

@Repository
public interface AlbumShareRepository extends JpaRepository<AlbumShare, UUID> {
}
