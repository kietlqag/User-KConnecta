package project.kconnecta.user.backend.feature.post.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.ai.GeminiModerationService;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.policy.service.AiModerationPolicyReader;
import project.kconnecta.user.backend.feature.post.dto.request.ReportCommentRequest;
import project.kconnecta.user.backend.feature.post.entity.AiModerationStatus;
import project.kconnecta.user.backend.feature.post.entity.CommentReport;
import project.kconnecta.user.backend.feature.post.entity.CommentStatus;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.PostComment;
import project.kconnecta.user.backend.feature.post.entity.enums.CommentReportStatus;
import project.kconnecta.user.backend.feature.post.repository.CommentReportRepository;
import project.kconnecta.user.backend.feature.post.repository.PostCommentRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceImplCommentReportTest {

    @Mock private PostCommentRepository postCommentRepository;
    @Mock private UserRepository userRepository;
    @Mock private CommentReportRepository commentReportRepository;
    @Mock private project.kconnecta.user.backend.feature.post.service.CommentViolationService commentViolationService;
    @Mock private GeminiModerationService geminiModerationService;
    @Mock private NotificationEventPublisher notificationEventPublisher;
    @Mock private AiModerationPolicyReader aiModerationPolicyReader;

    @InjectMocks private PostServiceImpl service;

    private final UUID commentId = UUID.randomUUID();
    private final UUID authorId = UUID.randomUUID();
    private final UUID reporterId = UUID.randomUUID();

    @BeforeEach
    void enableAi() {
        lenient().when(aiModerationPolicyReader.isEnabled()).thenReturn(true);
        lenient().when(commentReportRepository.save(any(CommentReport.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(postCommentRepository.save(any(PostComment.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private User user(UUID id) {
        return User.builder().id(id).username("u" + id).fullName("U").build();
    }

    private PostComment comment(AiModerationStatus aiStatus, LocalDateTime lastModeratedAt) {
        return PostComment.builder()
                .id(commentId)
                .post(Post.builder().id(UUID.randomUUID()).author(user(authorId)).build())
                .user(user(authorId))
                .content("some content")
                .status(CommentStatus.APPROVED)
                .aiModerationStatus(aiStatus)
                .lastModeratedAt(lastModeratedAt)
                .build();
    }

    private ReportCommentRequest request() {
        ReportCommentRequest r = new ReportCommentRequest();
        r.setReporterId(reporterId);
        return r;
    }

    @Test
    void cannotReportOwnComment() {
        PostComment c = comment(AiModerationStatus.NOT_CHECKED, null);
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(authorId)).thenReturn(Optional.of(user(authorId)));
        ReportCommentRequest req = request();
        req.setReporterId(authorId);

        assertThatThrownBy(() -> service.reportComment(commentId, req))
                .isInstanceOf(ValidationException.class);
        verify(commentReportRepository, never()).save(any());
    }

    @Test
    void cannotReportTwice() {
        PostComment c = comment(AiModerationStatus.NOT_CHECKED, null);
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user(reporterId)));
        when(commentReportRepository.existsByCommentIdAndReporterId(commentId, reporterId)).thenReturn(true);

        assertThatThrownBy(() -> service.reportComment(commentId, request()))
                .isInstanceOf(ValidationException.class);
        verify(commentReportRepository, never()).save(any());
    }

    @Test
    void notCheckedComment_triggersAi_safe_dismissesReports() {
        PostComment c = comment(AiModerationStatus.NOT_CHECKED, null);
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user(reporterId)));
        when(commentReportRepository.existsByCommentIdAndReporterId(commentId, reporterId)).thenReturn(false);
        when(commentReportRepository.countDistinctReportersByCommentId(commentId)).thenReturn(1L);
        when(geminiModerationService.moderate("some content"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(true, "")));

        service.reportComment(commentId, request());

        verify(geminiModerationService).moderate("some content");
        org.assertj.core.api.Assertions.assertThat(c.getAiModerationStatus()).isEqualTo(AiModerationStatus.SAFE);
        org.assertj.core.api.Assertions.assertThat(c.getStatus()).isEqualTo(CommentStatus.APPROVED);
        verify(commentReportRepository).updateStatusByCommentIdAndStatus(
                commentId, CommentReportStatus.PENDING, CommentReportStatus.DISMISSED);
    }

    @Test
    void pendingNotCheckedComment_triggersAi_safe_promotesToApproved() {
        PostComment c = comment(AiModerationStatus.NOT_CHECKED, null);
        c.setStatus(CommentStatus.PENDING);
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user(reporterId)));
        when(commentReportRepository.existsByCommentIdAndReporterId(commentId, reporterId)).thenReturn(false);
        when(commentReportRepository.countDistinctReportersByCommentId(commentId)).thenReturn(1L);
        when(geminiModerationService.moderate("some content"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(true, "")));

        service.reportComment(commentId, request());

        org.assertj.core.api.Assertions.assertThat(c.getStatus()).isEqualTo(CommentStatus.APPROVED);
        org.assertj.core.api.Assertions.assertThat(c.getAiModerationStatus()).isEqualTo(AiModerationStatus.SAFE);
    }

    @Test
    void notCheckedComment_triggersAi_unsafe_hidesAndNotifies() {
        PostComment c = comment(AiModerationStatus.NOT_CHECKED, null);
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user(reporterId)));
        when(commentReportRepository.existsByCommentIdAndReporterId(commentId, reporterId)).thenReturn(false);
        when(commentReportRepository.countDistinctReportersByCommentId(commentId)).thenReturn(1L);
        when(geminiModerationService.moderate("some content"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(false, "spam")));

        service.reportComment(commentId, request());

        org.assertj.core.api.Assertions.assertThat(c.getStatus()).isEqualTo(CommentStatus.REJECTED);
        org.assertj.core.api.Assertions.assertThat(c.getAiModerationStatus()).isEqualTo(AiModerationStatus.UNSAFE);
        verify(commentReportRepository).updateStatusByCommentIdAndStatus(
                commentId, CommentReportStatus.PENDING, CommentReportStatus.ACTIONED);
        verify(notificationEventPublisher).publish(eq(null), eq(authorId), eq(NotificationType.SYSTEM), anyString(), eq(commentId));
    }

    @Test
    void recentlyCheckedAndBelowThreshold_doesNotCallAi() {
        PostComment c = comment(AiModerationStatus.SAFE, LocalDateTime.now().minusHours(1));
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user(reporterId)));
        when(commentReportRepository.existsByCommentIdAndReporterId(commentId, reporterId)).thenReturn(false);
        when(commentReportRepository.countDistinctReportersByCommentId(commentId)).thenReturn(1L);

        service.reportComment(commentId, request());

        verify(geminiModerationService, never()).moderate(anyString());
        verify(commentReportRepository).save(any(CommentReport.class));
    }

    @Test
    void threeDistinctReporters_forcesAiEvenIfRecent() {
        PostComment c = comment(AiModerationStatus.SAFE, LocalDateTime.now().minusHours(1));
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user(reporterId)));
        when(commentReportRepository.existsByCommentIdAndReporterId(commentId, reporterId)).thenReturn(false);
        when(commentReportRepository.countDistinctReportersByCommentId(commentId)).thenReturn(3L);
        when(geminiModerationService.moderate("some content"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(true, "")));

        service.reportComment(commentId, request());

        verify(geminiModerationService, times(1)).moderate("some content");
    }

    @Test
    void aiFailure_escalatesToAdminPending_reportsStayPending() {
        PostComment c = comment(AiModerationStatus.NOT_CHECKED, null);
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user(reporterId)));
        when(commentReportRepository.existsByCommentIdAndReporterId(commentId, reporterId)).thenReturn(false);
        when(commentReportRepository.countDistinctReportersByCommentId(commentId)).thenReturn(1L);
        when(geminiModerationService.moderate("some content")).thenReturn(Optional.empty());

        service.reportComment(commentId, request());

        // AI bí → đẩy vào hàng đợi admin duyệt (PENDING), không tự duyệt/từ chối report.
        org.assertj.core.api.Assertions.assertThat(c.getStatus()).isEqualTo(CommentStatus.PENDING);
        org.assertj.core.api.Assertions.assertThat(c.getAiModerationStatus()).isEqualTo(AiModerationStatus.FAILED);
        verify(commentReportRepository, never()).updateStatusByCommentIdAndStatus(any(), any(), any());
    }

    @Test
    void aiUnsafeAfterReport_recordsViolation() {
        PostComment c = comment(AiModerationStatus.NOT_CHECKED, null);
        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user(reporterId)));
        when(commentReportRepository.existsByCommentIdAndReporterId(commentId, reporterId)).thenReturn(false);
        when(commentReportRepository.countDistinctReportersByCommentId(commentId)).thenReturn(1L);
        when(geminiModerationService.moderate("some content"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(false, "spam")));

        service.reportComment(commentId, request());

        // PostServiceImpl chỉ ủy thác; logic đếm/khóa nằm ở CommentViolationServiceImplTest.
        verify(commentViolationService).recordAiUnsafeViolation(authorId, commentId, null, "some content", "spam");
    }
}
