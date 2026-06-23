package project.kconnecta.user.backend.feature.album.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.album.entity.Album;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumRepository extends JpaRepository<Album, UUID> {

    @Query("""
            SELECT a FROM Album a
            JOIN FETCH a.owner
            WHERE a.id = :id AND a.status <> project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus.DELETED
            """)
    Optional<Album> findActiveById(@Param("id") UUID id);

    @Query("""
            SELECT a FROM Album a
            JOIN FETCH a.owner
            WHERE a.owner.id = :ownerId AND a.status = :status
            ORDER BY a.updatedAt DESC
            """)
    Page<Album> findByOwnerIdAndStatus(@Param("ownerId") UUID ownerId, @Param("status") AlbumStatus status, Pageable pageable);

    @Query("""
            SELECT a FROM Album a
            JOIN FETCH a.owner
            WHERE a.owner.id = :ownerId AND a.status = project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus.ACTIVE
            ORDER BY a.updatedAt DESC
            """)
    List<Album> findSidebarByOwnerId(@Param("ownerId") UUID ownerId, Pageable pageable);

    @Query("""
            SELECT a FROM Album a
            JOIN FETCH a.owner
            WHERE a.owner.id = :ownerId
              AND a.status = project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus.ACTIVE
              AND a.privacy = project.kconnecta.user.backend.feature.album.entity.enums.AlbumPrivacy.PUBLIC
            ORDER BY a.updatedAt DESC
            """)
    Page<Album> findPublicByOwnerId(@Param("ownerId") UUID ownerId, Pageable pageable);

    @Query("""
            SELECT a FROM Album a
            JOIN FETCH a.owner
            WHERE a.owner.id = :ownerId
              AND a.status = project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus.ACTIVE
              AND a.group IS NULL
            ORDER BY a.updatedAt DESC
            """)
    org.springframework.data.domain.Page<Album> findPersonalByOwnerId(
            @Param("ownerId") UUID ownerId,
            Pageable pageable);

    @Query("""
            SELECT a FROM Album a
            JOIN FETCH a.owner
            WHERE a.group.id = :groupId
              AND a.status = project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus.ACTIVE
            ORDER BY a.updatedAt DESC
            """)
    Page<Album> findByGroupId(@Param("groupId") UUID groupId, Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Album a
            SET a.updatedAt = :updatedAt
            WHERE a.id = :albumId AND a.owner.id = :ownerId
            """)
    void updateUpdatedAt(
            @Param("albumId") UUID albumId,
            @Param("ownerId") UUID ownerId,
            @Param("updatedAt") java.time.LocalDateTime updatedAt);
}
