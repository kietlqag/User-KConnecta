package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.Post;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
    // Explicit JOIN FETCH instead of @EntityGraph to avoid the known Spring Data JPA
    // issue where @EntityGraph + @Query can cause the JPQL WHERE clause to be
    // partially ignored or generate conflicting implicit/explicit joins.
    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author WHERE p.group IS NULL ORDER BY p.createdAt DESC"
    )
    List<Post> findHomeFeedPostsOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN FETCH p.group WHERE p.author.id = :authorId ORDER BY p.createdAt DESC"
    )
    List<Post> findByAuthorId(@org.springframework.data.repository.query.Param("authorId") UUID authorId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p JOIN FETCH p.author JOIN FETCH p.group WHERE p.group IS NOT NULL AND p.group.id = :groupId ORDER BY p.createdAt DESC"
    )
    List<Post> findByGroupId(@org.springframework.data.repository.query.Param("groupId") UUID groupId);
}
