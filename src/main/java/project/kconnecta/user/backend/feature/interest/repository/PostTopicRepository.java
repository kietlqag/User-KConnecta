package project.kconnecta.user.backend.feature.interest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.interest.entity.PostTopic;

import java.util.List;
import java.util.UUID;

public interface PostTopicRepository extends JpaRepository<PostTopic, UUID> {

    List<PostTopic> findByPostId(UUID postId);

    long countByPostId(UUID postId);

    @Modifying
    @Query("DELETE FROM PostTopic pt WHERE pt.post.id = :postId")
    void deleteByPostId(@Param("postId") UUID postId);

    @Query("SELECT DISTINCT pt.post.id FROM PostTopic pt")
    List<UUID> findAllPostIdsWithTopics();
}
