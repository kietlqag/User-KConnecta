package project.kconnecta.user.backend.feature.friend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.friend.entity.Friendship;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

    @Query("SELECT f FROM Friendship f WHERE (f.requester.id = :userId OR f.addressee.id = :userId) AND f.status = :status")
    List<Friendship> findAllByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") FriendshipStatus status);

    @Query("SELECT f FROM Friendship f WHERE f.addressee.id = :addresseeId AND f.status = :status")
    List<Friendship> findAllByAddresseeIdAndStatus(@Param("addresseeId") UUID addresseeId, @Param("status") FriendshipStatus status);

    @Query("SELECT f.addressee.id FROM Friendship f WHERE f.requester.id = :userId")
    List<UUID> findAddresseeIdsByRequesterId(@Param("userId") UUID userId);

    @Query("SELECT f.requester.id FROM Friendship f WHERE f.addressee.id = :userId")
    List<UUID> findRequesterIdsByAddresseeId(@Param("userId") UUID userId);

    Optional<Friendship> findByRequesterIdAndAddresseeId(UUID requesterId, UUID addresseeId);

    @Query("SELECT f FROM Friendship f WHERE (f.requester.id = :u1 AND f.addressee.id = :u2) OR (f.requester.id = :u2 AND f.addressee.id = :u1)")
    Optional<Friendship> findBetweenUsers(@Param("u1") UUID u1, @Param("u2") UUID u2);

    @Query("""
            SELECT CASE
                     WHEN f.requester.id = :userId THEN f.addressee.id
                     ELSE f.requester.id
                   END
            FROM Friendship f
            WHERE (f.requester.id = :userId OR f.addressee.id = :userId)
              AND f.status = :status
            """)
    List<UUID> findFriendIdsByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") FriendshipStatus status);
}
