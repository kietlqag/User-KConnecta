package project.kconnecta.user.backend.feature.album.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.album.entity.AlbumComment;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlbumCommentRepository extends JpaRepository<AlbumComment, UUID> {

    @Query("""
            SELECT c FROM AlbumComment c
            JOIN FETCH c.user
            WHERE c.album.id = :albumId AND c.parentId IS NULL
            ORDER BY c.createdAt DESC
            """)
    List<AlbumComment> findTopLevelByAlbumId(@Param("albumId") UUID albumId);

    long countByAlbumId(UUID albumId);
}
