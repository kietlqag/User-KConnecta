package project.kconnecta.user.backend.feature.birthday.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.birthday.entity.BirthdayNotificationLog;

import java.time.LocalDate;
import java.util.UUID;

@Repository
public interface BirthdayNotificationLogRepository extends JpaRepository<BirthdayNotificationLog, UUID> {

    boolean existsByRecipientIdAndBirthdayUserIdAndNotificationDate(
            UUID recipientId,
            UUID birthdayUserId,
            LocalDate notificationDate
    );
}
