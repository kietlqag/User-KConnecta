package project.kconnecta.user.backend.feature.user.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// PostgreSQL performance tip: CREATE EXTENSION IF NOT EXISTS pg_trgm;
// CREATE INDEX idx_users_full_name_trgm ON public.users USING GIN (full_name gin_trgm_ops);

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    boolean existsByUsername(String username);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"account"})
    @org.springframework.lang.NonNull
    java.util.Optional<User> findById(@org.springframework.lang.NonNull UUID id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"account"})
    Optional<User> findByUsername(String username);
    Optional<User> findByAccountEmail(String email);
    Optional<User> findByAccountId(UUID accountId);

    @Query("SELECT u FROM User u WHERE u.id NOT IN :excludedIds")
    List<User> findSuggestionsExcluding(@Param("excludedIds") Collection<UUID> excludedIds, Pageable pageable);

    @Query("SELECT u FROM User u WHERE LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<User> searchByFullName(@Param("q") String q, Pageable pageable);
}
