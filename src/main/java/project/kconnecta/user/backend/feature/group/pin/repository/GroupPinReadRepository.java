package project.kconnecta.user.backend.feature.group.pin.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.group.pin.entity.GroupPinRead;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface GroupPinReadRepository extends JpaRepository<GroupPinRead, UUID> {

    boolean existsByPinIdAndUserId(UUID pinId, UUID userId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT r.pinId FROM GroupPinRead r WHERE r.userId = :userId AND r.pinId IN :pinIds")
    List<UUID> findReadPinIds(@org.springframework.data.repository.query.Param("userId") UUID userId,
                              @org.springframework.data.repository.query.Param("pinIds") Collection<UUID> pinIds);
}
