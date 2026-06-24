package project.kconnecta.user.backend.feature.user.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
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

    interface UserSearchProjection {
        UUID getId();
        String getFullName();
        String getUsername();
        String getAvatarUrl();
        String getBio();
    }

    boolean existsByUsername(String username);

    @EntityGraph(attributePaths = {"account"})
    @NonNull
    Optional<User> findById(@NonNull UUID id);

    @EntityGraph(attributePaths = {"account"})
    @Override
    @NonNull
    List<User> findAllById(@NonNull Iterable<UUID> ids);

    @EntityGraph(attributePaths = {"account"})
    Optional<User> findByUsername(String username);

    @EntityGraph(attributePaths = {"account"})
    Optional<User> findByAccountEmail(String email);

    @EntityGraph(attributePaths = {"account"})
    Optional<User> findByAccountId(UUID accountId);

    @Query("""
            SELECT u.id AS id, u.fullName AS fullName, u.username AS username,
                   u.avatarUrl AS avatarUrl, u.bio AS bio
            FROM User u
            """)
    List<UserSearchProjection> findAllSearchProjections();

    @Query("SELECT u FROM User u WHERE u.id NOT IN :excludedIds")
    List<User> findSuggestionsExcluding(@Param("excludedIds") Collection<UUID> excludedIds, Pageable pageable);

    @Query(value = "SELECT * FROM public.users u WHERE unaccent(LOWER(u.full_name)) LIKE unaccent(LOWER(CONCAT('%', :q, '%')))", nativeQuery = true)
    List<User> searchByFullName(@Param("q") String q, Pageable pageable);

    @Query(value = """
            SELECT * FROM public.users u
            WHERE u.date_of_birth IS NOT NULL
              AND EXTRACT(MONTH FROM u.date_of_birth) = :month
              AND EXTRACT(DAY FROM u.date_of_birth) = :day
            """, nativeQuery = true)
    List<User> findUsersWithBirthdayOn(@Param("month") int month, @Param("day") int day);
}
