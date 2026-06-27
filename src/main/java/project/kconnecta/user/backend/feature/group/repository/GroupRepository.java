package project.kconnecta.user.backend.feature.group.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;

import java.util.List;
import java.util.UUID;

// PostgreSQL performance tip: CREATE EXTENSION IF NOT EXISTS pg_trgm;
// CREATE INDEX idx_groups_name_trgm ON public.user_groups USING GIN (name gin_trgm_ops);
@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {

    interface GroupSearchProjection {
        UUID getId();
        String getName();
        String getDescription();
        String getCoverPhotoUrl();
        GroupPrivacy getPrivacy();
    }

    @Query("""
            SELECT g.id AS id, g.name AS name, g.description AS description,
                   g.coverPhotoUrl AS coverPhotoUrl, g.privacy AS privacy
            FROM Group g
            """)
    Slice<GroupSearchProjection> findSearchProjections(Pageable pageable);

    @Query("SELECT g FROM Group g WHERE g.id NOT IN (SELECT gm.group.id FROM GroupMember gm WHERE gm.user.id = :userId)")
    List<Group> findGroupsNotJoinedByUser(@Param("userId") UUID userId);

    @Query(value = "SELECT * FROM public.user_groups g WHERE unaccent(LOWER(g.name)) LIKE unaccent(LOWER(CONCAT('%', :q, '%')))", nativeQuery = true)
    List<Group> searchByName(@Param("q") String q, Pageable pageable);
}
