package project.kconnecta.user.backend.feature.group.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.group.entity.GroupMember;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.group WHERE gm.user.id = :userId AND gm.status = project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED")
    List<GroupMember> findAllByUserId(@Param("userId") UUID userId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.group WHERE gm.user.id = :userId AND gm.role = :role AND gm.status = project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED")
    List<GroupMember> findAllByUserIdAndRole(@Param("userId") UUID userId, @Param("role") GroupMemberRole role);

    @Query("SELECT COUNT(gm) FROM GroupMember gm WHERE gm.group.id = :groupId AND gm.status = project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED")
    int countByGroupId(@Param("groupId") UUID groupId);

    @Query("SELECT COUNT(gm) FROM GroupMember gm WHERE gm.group.id = :groupId AND gm.role = :role AND gm.status = project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED")
    long countByGroupIdAndRole(@Param("groupId") UUID groupId, @Param("role") GroupMemberRole role);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.user WHERE gm.group.id = :groupId AND gm.status = project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED")
    List<GroupMember> findAllByGroupId(@Param("groupId") UUID groupId);

    @Query("SELECT gm FROM GroupMember gm WHERE gm.group.id = :groupId AND gm.user.id = :userId")
    java.util.Optional<GroupMember> findByGroupIdAndUserId(@Param("groupId") UUID groupId, @Param("userId") UUID userId);

    @Query("SELECT gm.group.id as groupId, COUNT(gm) as count FROM GroupMember gm WHERE gm.group.id IN :groupIds AND gm.status = project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED GROUP BY gm.group.id")
    List<GroupCountProjection> countByGroupIdIn(@Param("groupIds") List<UUID> groupIds);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.user WHERE gm.group.id = :groupId AND gm.status = project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.PENDING")
    List<GroupMember> findPendingRequestsByGroupId(@Param("groupId") UUID groupId);

    interface GroupCountProjection {
        UUID getGroupId();
        long getCount();
    }
}
