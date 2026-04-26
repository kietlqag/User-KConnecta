package project.kconnecta.user.backend.feature.group.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.group.entity.Group;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {
    @Query("SELECT g FROM Group g WHERE g.id NOT IN (SELECT gm.group.id FROM GroupMember gm WHERE gm.user.id = :userId)")
    List<Group> findGroupsNotJoinedByUser(@Param("userId") UUID userId);
}
