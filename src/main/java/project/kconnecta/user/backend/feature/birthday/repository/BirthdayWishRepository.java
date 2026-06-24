package project.kconnecta.user.backend.feature.birthday.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.birthday.entity.BirthdayWish;

import java.util.List;
import java.util.UUID;

@Repository
public interface BirthdayWishRepository extends JpaRepository<BirthdayWish, UUID> {

    @Query("""
            SELECT w FROM BirthdayWish w
            JOIN FETCH w.sender
            JOIN FETCH w.recipient
            WHERE w.recipient.id = :userId
            ORDER BY w.createdAt DESC
            """)
    List<BirthdayWish> findReceivedByUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
            SELECT w FROM BirthdayWish w
            JOIN FETCH w.sender
            JOIN FETCH w.recipient
            WHERE w.sender.id = :userId
            ORDER BY w.createdAt DESC
            """)
    List<BirthdayWish> findSentByUserId(@Param("userId") UUID userId, Pageable pageable);
}
