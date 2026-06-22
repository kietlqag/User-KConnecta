package project.kconnecta.user.backend.feature.album.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.album.entity.AlbumMediaComment;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlbumMediaCommentRepository extends JpaRepository<AlbumMediaComment, UUID> {

    @Query("""
            SELECT c FROM AlbumMediaComment c
            JOIN FETCH c.user
            WHERE c.media.id = :mediaId AND c.parentId IS NULL
            ORDER BY c.createdAt DESC
            """)
    List<AlbumMediaComment> findTopLevelByMediaId(@Param("mediaId") UUID mediaId);
}
