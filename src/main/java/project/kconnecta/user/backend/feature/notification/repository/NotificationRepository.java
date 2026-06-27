package project.kconnecta.user.backend.feature.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.notification.entity.Notification;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    
    @Query("SELECT n FROM Notification n LEFT JOIN FETCH n.sender WHERE n.recipient.id = :recipientId ORDER BY n.createdAt DESC")
    List<Notification> findAllByRecipientIdOrderByCreatedAtDesc(@Param("recipientId") UUID recipientId);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipient.id = :recipientId AND n.isRead = false")
    int countUnreadByRecipientId(@Param("recipientId") UUID recipientId);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO notifications (id, recipient_id, sender_id, type, content, related_id, is_read, is_actioned, created_at, updated_at) " +
                   "SELECT gen_random_uuid(), u.id, NULL, :type, :content, NULL, false, false, NOW(), NOW() FROM users u",
           nativeQuery = true)
    int broadcastToAll(@Param("content") String content, @Param("type") String type);
}
