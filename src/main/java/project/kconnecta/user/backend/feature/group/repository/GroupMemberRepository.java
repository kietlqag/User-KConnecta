package project.kconnecta.user.backend.feature.group.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.group.entity.GroupMember;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.group WHERE gm.user.id = :userId")
    List<GroupMember> findAllByUserId(@Param("userId") UUID userId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.group WHERE gm.user.id = :userId AND gm.role = :role")
    List<GroupMember> findAllByUserIdAndRole(@Param("userId") UUID userId, @Param("role") GroupMemberRole role);

    @Query("SELECT COUNT(gm) FROM GroupMember gm WHERE gm.group.id = :groupId")
    int countByGroupId(@Param("groupId") UUID groupId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.user WHERE gm.group.id = :groupId")
    List<GroupMember> findAllByGroupId(@Param("groupId") UUID groupId);

    @Query("SELECT gm FROM GroupMember gm WHERE gm.group.id = :groupId AND gm.user.id = :userId")
    java.util.Optional<GroupMember> findByGroupIdAndUserId(@Param("groupId") UUID groupId, @Param("userId") UUID userId);
}
