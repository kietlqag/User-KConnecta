package project.kconnecta.user.backend.feature.post.service.impl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.post.entity.CommentViolation;
import project.kconnecta.user.backend.feature.post.repository.CommentViolationRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.entity.UserRestriction;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;
import project.kconnecta.user.backend.feature.user.repository.UserRestrictionRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Logic đếm vi phạm (cửa sổ 30 ngày, reset sau khóa) và áp dụng khóa comment.
 * Đây là nơi kiểm thử thật các acceptance criteria; PostServiceImpl chỉ ủy thác.
 */
@ExtendWith(MockitoExtension.class)
class CommentViolationServiceImplTest {

    @Mock private CommentViolationRepository commentViolationRepository;
    @Mock private UserRestrictionRepository userRestrictionRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationEventPublisher notificationEventPublisher;

    @InjectMocks private CommentViolationServiceImpl service;

    private final UUID userId = UUID.randomUUID();

    private void stubUserAndSave() {
        lenient().when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        lenient().when(commentViolationRepository.save(any(CommentViolation.class))).thenAnswer(inv -> {
            CommentViolation v = inv.getArgument(0);
            if (v.getId() == null) {
                v.setId(UUID.randomUUID());
            }
            return v;
        });
        lenient().when(userRestrictionRepository.findLastCommentLockCreatedAt(userId)).thenReturn(Optional.empty());
    }

    @Test
    void firstBlacklistViolation_savesOneWarningRow_noLock() {
        stubUserAndSave();
        when(commentViolationRepository.countByUserIdAndCreatedAtAfter(eq(userId), any())).thenReturn(0L);

        service.recordBlacklistViolation(userId, "spam content", "kw-1", "spam");

        ArgumentCaptor<CommentViolation> captor = ArgumentCaptor.forClass(CommentViolation.class);
        verify(commentViolationRepository).save(captor.capture());
        CommentViolation v = captor.getValue();
        assertThat(v.getSource()).isEqualTo("BLACKLIST");
        assertThat(v.getAction()).isEqualTo("WARNING");
        assertThat(v.getMatchedKeywordId()).isEqualTo("kw-1");
        assertThat(v.getMatchedKeyword()).isEqualTo("spam");
        assertThat(v.getContentSnapshot()).isEqualTo("spam content");
        assertThat(v.getCommentId()).isNull();
        verify(userRestrictionRepository, never()).save(any());
    }

    @Test
    void thirdViolationInWindow_createsActiveCommentLockAndNotifies() {
        stubUserAndSave();
        // prior = 2 -> dòng này là vi phạm thứ 3.
        when(commentViolationRepository.countByUserIdAndCreatedAtAfter(eq(userId), any())).thenReturn(2L);
        when(userRestrictionRepository.existsActiveCommentLock(eq(userId), any())).thenReturn(false);

        service.recordAiUnsafeViolation(userId, UUID.randomUUID(), null, "snapshot", "toxic");

        ArgumentCaptor<CommentViolation> vCaptor = ArgumentCaptor.forClass(CommentViolation.class);
        verify(commentViolationRepository).save(vCaptor.capture());
        assertThat(vCaptor.getValue().getAction()).isEqualTo("COMMENT_LOCK_TEMP");

        ArgumentCaptor<UserRestriction> rCaptor = ArgumentCaptor.forClass(UserRestriction.class);
        verify(userRestrictionRepository).save(rCaptor.capture());
        UserRestriction r = rCaptor.getValue();
        assertThat(r.getType()).isEqualTo("COMMENT_LOCK");
        assertThat(r.getStatus()).isEqualTo("ACTIVE");
        assertThat(r.getExpiresAt()).isNotNull();
        verify(notificationEventPublisher).publish(any(), eq(userId), any(), anyString(), any());
    }

    @Test
    void thirdViolation_butAlreadyLocked_doesNotCreateSecondLock() {
        stubUserAndSave();
        when(commentViolationRepository.countByUserIdAndCreatedAtAfter(eq(userId), any())).thenReturn(2L);
        when(userRestrictionRepository.existsActiveCommentLock(eq(userId), any())).thenReturn(true);

        service.recordAiUnsafeViolation(userId, UUID.randomUUID(), null, "snapshot", "toxic");

        verify(commentViolationRepository).save(any()); // vẫn ghi dòng vi phạm
        verify(userRestrictionRepository, never()).save(any()); // nhưng không khóa lại
    }

    @Test
    void aiUnsafe_duplicateForSameComment_isSkipped() {
        UUID commentId = UUID.randomUUID();
        when(commentViolationRepository.existsByCommentIdAndSource(commentId, "AI_UNSAFE")).thenReturn(true);

        service.recordAiUnsafeViolation(userId, commentId, null, "snapshot", "toxic");

        verify(commentViolationRepository, never()).save(any());
        verify(userRestrictionRepository, never()).save(any());
    }

    @Test
    void countWindow_resetsToLastLock_whenLockIsWithin30Days() {
        lenient().when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        lenient().when(commentViolationRepository.save(any(CommentViolation.class))).thenAnswer(inv -> inv.getArgument(0));
        LocalDateTime lastLock = LocalDateTime.now().minusHours(2);
        when(userRestrictionRepository.findLastCommentLockCreatedAt(userId)).thenReturn(Optional.of(lastLock));
        when(commentViolationRepository.countByUserIdAndCreatedAtAfter(eq(userId), any())).thenReturn(0L);

        service.recordBlacklistViolation(userId, "x", null, null);

        ArgumentCaptor<LocalDateTime> threshold = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(commentViolationRepository).countByUserIdAndCreatedAtAfter(eq(userId), threshold.capture());
        // Mốc đếm phải là thời điểm khóa gần nhất (reset), không lùi về 30 ngày.
        assertThat(threshold.getValue()).isEqualTo(lastLock);
    }

    @Test
    void countWindow_uses30Days_whenNoPriorLock() {
        stubUserAndSave();
        when(commentViolationRepository.countByUserIdAndCreatedAtAfter(eq(userId), any())).thenReturn(0L);

        service.recordBlacklistViolation(userId, "x", null, null);

        ArgumentCaptor<LocalDateTime> threshold = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(commentViolationRepository).countByUserIdAndCreatedAtAfter(eq(userId), threshold.capture());
        assertThat(threshold.getValue())
                .isBetween(LocalDateTime.now().minusDays(30).minusSeconds(10),
                        LocalDateTime.now().minusDays(30).plusSeconds(10));
    }
}
