package project.kconnecta.user.backend.feature.post.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.post.entity.CommentViolation;
import project.kconnecta.user.backend.feature.post.repository.CommentViolationRepository;
import project.kconnecta.user.backend.feature.post.service.CommentViolationService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.entity.UserRestriction;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;
import project.kconnecta.user.backend.feature.user.repository.UserRestrictionRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentViolationServiceImpl implements CommentViolationService {

    /** Đủ số vi phạm này (kể từ lần khóa gần nhất) trong cửa sổ thì khóa bình luận. */
    static final int VIOLATION_THRESHOLD = 3;
    /** Cửa sổ đếm vi phạm rolling. */
    static final Duration VIOLATION_WINDOW = Duration.ofDays(30);
    /** Thời lượng khóa bình luận tạm thời. */
    static final Duration BAN_DURATION = Duration.ofHours(24);

    private static final String SOURCE_BLACKLIST = "BLACKLIST";
    private static final String SOURCE_AI_UNSAFE = "AI_UNSAFE";
    private static final String LOCK_TYPE = "COMMENT_LOCK";
    private static final String ACTION_WARNING = "WARNING";
    private static final String ACTION_LOCK_TEMP = "COMMENT_LOCK_TEMP";
    private static final String STATUS_ACTIVE = "ACTIVE";

    private final CommentViolationRepository commentViolationRepository;
    private final UserRestrictionRepository userRestrictionRepository;
    private final UserRepository userRepository;
    private final NotificationEventPublisher notificationEventPublisher;

    @Override
    @Transactional(readOnly = true)
    public boolean isCommentLocked(UUID userId) {
        return userRestrictionRepository.existsActiveCommentLock(userId, LocalDateTime.now());
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordBlacklistViolation(UUID userId, String content, String matchedKeywordId, String matchedKeyword) {
        record(SOURCE_BLACKLIST, userId, null, null, matchedKeywordId, matchedKeyword, content, null);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAiUnsafeViolation(UUID userId, UUID commentId, UUID reportId, String contentSnapshot, String reason) {
        // Chống double-count: cùng 1 comment chỉ ghi 1 dòng AI_UNSAFE. Pre-check xử lý ca thường;
        // unique index uk_comment_violation_ai_comment là chốt chặn DB cho race scheduler-vs-report.
        // (INSERT bị defer tới khi commit transaction REQUIRES_NEW này, nên lỗi unique sẽ nổi ra ở
        //  CHỖ GỌI chứ không ở đây — caller phải bắt, xem PostServiceImpl#recheckReportedComment.)
        if (commentId != null && commentViolationRepository.existsByCommentIdAndSource(commentId, SOURCE_AI_UNSAFE)) {
            return;
        }
        record(SOURCE_AI_UNSAFE, userId, commentId, reportId, null, null, contentSnapshot, reason);
    }

    private void record(String source, UUID userId, UUID commentId, UUID reportId,
                        String matchedKeywordId, String matchedKeyword, String snapshot, String detail) {
        LocalDateTime now = LocalDateTime.now();

        // Mốc đếm: 30 ngày gần nhất, nhưng không vượt qua lần khóa gần nhất (reset sau mỗi lần khóa).
        LocalDateTime windowStart = now.minus(VIOLATION_WINDOW);
        LocalDateTime lastLock = userRestrictionRepository.findLastCommentLockCreatedAt(userId).orElse(null);
        if (lastLock != null && lastLock.isAfter(windowStart)) {
            windowStart = lastLock;
        }

        long ordinal = commentViolationRepository.countByUserIdAndCreatedAtAfter(userId, windowStart) + 1;
        String action = ordinal >= VIOLATION_THRESHOLD ? ACTION_LOCK_TEMP : ACTION_WARNING;

        User userRef = userRepository.getReferenceById(userId);
        CommentViolation violation = commentViolationRepository.save(CommentViolation.builder()
                .user(userRef)
                .source(source)
                .action(action)
                .commentId(commentId)
                .reportId(reportId)
                .matchedKeywordId(matchedKeywordId)
                .matchedKeyword(matchedKeyword)
                .contentSnapshot(snapshot)
                .detail(detail)
                .build());

        log.warn("comment violation: userId={}, source={}, ordinal={}, action={}", userId, source, ordinal, action);

        if (ACTION_LOCK_TEMP.equals(action) && !userRestrictionRepository.existsActiveCommentLock(userId, now)) {
            applyCommentLock(userRef, violation.getId(), now);
        }
    }

    private void applyCommentLock(User userRef, UUID sourceViolationId, LocalDateTime now) {
        // Pre-check existsActiveCommentLock đã chặn ca thường (4,5,... vi phạm sau khi đã khóa);
        // uk_user_restriction_one_active là chốt DB. Vi phạm của 1 user vốn tuần tự nên race
        // (2 vi phạm vượt ngưỡng cùng lúc) gần như không xảy ra.
        userRestrictionRepository.save(UserRestriction.builder()
                .user(userRef)
                .type(LOCK_TYPE)
                .status(STATUS_ACTIVE)
                .reason(VIOLATION_THRESHOLD + " vi phạm bình luận trong 30 ngày")
                .sourceViolationId(sourceViolationId)
                .startsAt(now)
                .expiresAt(now.plus(BAN_DURATION))
                .build());
        notificationEventPublisher.publish(
                null,
                userRef.getId(),
                NotificationType.SYSTEM,
                "Bạn đã bị tạm cấm bình luận 24 giờ do vi phạm tiêu chuẩn cộng đồng nhiều lần.",
                null
        );
    }
}
