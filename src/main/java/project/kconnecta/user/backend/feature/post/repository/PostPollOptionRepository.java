package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import project.kconnecta.user.backend.feature.post.entity.PostPollOption;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PostPollOptionRepository extends JpaRepository<PostPollOption, UUID> {
    List<PostPollOption> findAllByPollIdOrderBySortOrderAsc(UUID pollId);

    List<PostPollOption> findAllByPollIdIn(Collection<UUID> pollIds);
}
