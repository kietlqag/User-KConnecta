package project.kconnecta.user.backend.feature.post.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.kconnecta.user.backend.feature.policy.service.AiModerationPolicyReader;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.activity.entity.enums.ActivityLogType;
import project.kconnecta.user.backend.feature.activity.service.ActivityLogService;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.policy.service.PolicyContentValidator;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.entity.CommentStatus;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.PostComment;
import project.kconnecta.user.backend.feature.post.service.CommentViolationService;
import project.kconnecta.user.backend.feature.post.repository.PostCommentLikeRepository;
import project.kconnecta.user.backend.feature.post.repository.PostCommentRepository;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.post.repository.PostShareRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the "comment on a post" flow: {@link PostServiceImpl#addComment}.
 * Mirrors the Mockito + AssertJ style used by CallRecordingServiceImplTest.
 */
@ExtendWith(MockitoExtension.class)
class PostServiceImplCommentTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PostCommentRepository postCommentRepository;
    @Mock
    private PostCommentLikeRepository postCommentLikeRepository;
    @Mock
    private PostShareRepository postShareRepository;
    @Mock
    private PolicyContentValidator policyContentValidator;
    @Mock
    private ActivityLogService activityLogService;
    @Mock
    private NotificationEventPublisher notificationEventPublisher;
    @Mock
    private AiModerationPolicyReader aiModerationPolicyReader;
    @Mock
    private CommentViolationService commentViolationService;

    @InjectMocks
    private PostServiceImpl service;

    @BeforeEach
    void enableAiModeration() {
        // AI on by default so the keyword `isSuspect` gate is exercised; lenient because
        // some tests throw before reaching it.
        lenient().when(aiModerationPolicyReader.isEnabled()).thenReturn(true);
        lenient().when(postCommentRepository.countByParentCommentId(any())).thenReturn(0L);
        lenient().when(postCommentLikeRepository.countByCommentId(any())).thenReturn(0L);
        lenient().when(postCommentLikeRepository.existsByCommentIdAndUserId(any(), any())).thenReturn(false);
    }

    // --- helpers -----------------------------------------------------------

    private User user(UUID id, String username) {
        return User.builder().id(id).username(username).fullName(username + " Name").build();
    }

    private Post post(UUID id, User author) {
        return Post.builder().id(id).author(author).build();
    }

    private CreateCommentRequest request(UUID userId, String content, UUID parentCommentId) {
        CreateCommentRequest req = new CreateCommentRequest();
        req.setUserId(userId);
        req.setContent(content);
        req.setParentCommentId(parentCommentId);
        return req;
    }

    private UpdateCommentRequest updateRequest(String content) {
        UpdateCommentRequest req = new UpdateCommentRequest();
        req.setContent(content);
        return req;
    }

    private PostComment existingComment(UUID commentId, UUID userId, String content, CommentStatus status) {
        User author = user(userId, "commenter");
        Post post = post(UUID.randomUUID(), user(UUID.randomUUID(), "postAuthor"));
        return PostComment.builder()
                .id(commentId)
                .post(post)
                .user(author)
                .content(content)
                .status(status)
                .build();
    }

    /** Make save() echo back the entity with a generated id, like the DB would. */
    private void stubSaveAssigningId() {
        when(postCommentRepository.save(any(PostComment.class))).thenAnswer(inv -> {
            PostComment c = inv.getArgument(0);
            if (c.getId() == null) {
                c.setId(UUID.randomUUID());
            }
            return c;
        });
    }

    // --- tests -------------------------------------------------------------

    @Test
    void addComment_cleanTopLevelComment_savesApprovedAndPublishesNotification() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();

        User author = user(authorId, "author");
        User commenter = user(commenterId, "commenter");
        Post post = post(postId, author);

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(userRepository.findById(commenterId)).thenReturn(Optional.of(commenter));
        when(policyContentValidator.isSuspect("Nice post!")).thenReturn(false);
        stubSaveAssigningId();

        PostCommentResponse response = service.addComment(postId, request(commenterId, "Nice post!", null));

        assertThat(response.getId()).isNotNull();
        assertThat(response.getPostId()).isEqualTo(postId);
        assertThat(response.getUserId()).isEqualTo(commenterId);
        assertThat(response.getContent()).isEqualTo("Nice post!");
        assertThat(response.getParentCommentId()).isNull();
        // Author views their own comment -> moderation status exposed.
        assertThat(response.getModerationStatus()).isEqualTo(CommentStatus.APPROVED.name());

        ArgumentCaptor<PostComment> captor = ArgumentCaptor.forClass(PostComment.class);
        verify(postCommentRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(CommentStatus.APPROVED);
        assertThat(captor.getValue().getParentComment()).isNull();

        verify(activityLogService).log(eq(commenterId), eq("commenter"), eq(ActivityLogType.COMMENT_ADDED), anyString());
        verify(notificationEventPublisher).publish(eq(commenterId), eq(authorId), eq(NotificationType.COMMENT), anyString(), eq(postId));
    }

    @Test
    void addComment_suspectContent_savesPendingAndSkipsNotification() {
        UUID postId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();

        User author = user(UUID.randomUUID(), "author");
        User commenter = user(commenterId, "commenter");
        Post post = post(postId, author);

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(userRepository.findById(commenterId)).thenReturn(Optional.of(commenter));
        when(policyContentValidator.isSuspect("suspicious text")).thenReturn(true);
        stubSaveAssigningId();

        PostCommentResponse response = service.addComment(postId, request(commenterId, "suspicious text", null));

        ArgumentCaptor<PostComment> captor = ArgumentCaptor.forClass(PostComment.class);
        verify(postCommentRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(CommentStatus.PENDING);

        // Author still sees their own pending comment (not masked) with PENDING status.
        assertThat(response.getContent()).isEqualTo("suspicious text");
        assertThat(response.getModerationStatus()).isEqualTo(CommentStatus.PENDING.name());

        // Notification is deferred until the moderation job approves it.
        verify(notificationEventPublisher, never()).publish(any(), any(), any(), anyString(), any());
    }

    @Test
    void addComment_trimsContentBeforeSaving() {
        UUID postId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();

        Post post = post(postId, user(UUID.randomUUID(), "author"));

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(userRepository.findById(commenterId)).thenReturn(Optional.of(user(commenterId, "commenter")));
        stubSaveAssigningId();

        service.addComment(postId, request(commenterId, "   padded comment   ", null));

        ArgumentCaptor<PostComment> captor = ArgumentCaptor.forClass(PostComment.class);
        verify(postCommentRepository).save(captor.capture());
        assertThat(captor.getValue().getContent()).isEqualTo("padded comment");
    }

    @Test
    void addComment_validReplyToCommentOnSamePost_setsParentCommentId() {
        UUID postId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();

        Post post = post(postId, user(UUID.randomUUID(), "author"));
        PostComment parent = PostComment.builder()
                .id(parentId)
                .post(post)
                .user(user(UUID.randomUUID(), "parentAuthor"))
                .content("parent")
                .status(CommentStatus.APPROVED)
                .build();

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(userRepository.findById(commenterId)).thenReturn(Optional.of(user(commenterId, "commenter")));
        when(postCommentRepository.findById(parentId)).thenReturn(Optional.of(parent));
        stubSaveAssigningId();

        PostCommentResponse response = service.addComment(postId, request(commenterId, "a reply", parentId));

        assertThat(response.getParentCommentId()).isEqualTo(parentId);

        ArgumentCaptor<PostComment> captor = ArgumentCaptor.forClass(PostComment.class);
        verify(postCommentRepository).save(captor.capture());
        assertThat(captor.getValue().getParentComment()).isEqualTo(parent);
    }

    @Test
    void addComment_replyToParentFromDifferentPost_throwsValidation() {
        UUID postId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();

        Post post = post(postId, user(UUID.randomUUID(), "author"));
        Post otherPost = post(UUID.randomUUID(), user(UUID.randomUUID(), "other"));
        PostComment parentOnOtherPost = PostComment.builder()
                .id(parentId)
                .post(otherPost)
                .user(user(UUID.randomUUID(), "parentAuthor"))
                .content("parent")
                .status(CommentStatus.APPROVED)
                .build();

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(userRepository.findById(commenterId)).thenReturn(Optional.of(user(commenterId, "commenter")));
        when(postCommentRepository.findById(parentId)).thenReturn(Optional.of(parentOnOtherPost));

        assertThatThrownBy(() -> service.addComment(postId, request(commenterId, "a reply", parentId)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Parent comment does not belong to this post");

        verify(postCommentRepository, never()).save(any());
    }

    @Test
    void addComment_postNotFound_throwsNotFound() {
        UUID postId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();

        when(postRepository.findById(postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addComment(postId, request(commenterId, "hi", null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Post not found");

        verify(postCommentRepository, never()).save(any());
    }

    @Test
    void addComment_userNotFound_throwsNotFound() {
        UUID postId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();

        Post post = post(postId, user(UUID.randomUUID(), "author"));
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(userRepository.findById(commenterId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addComment(postId, request(commenterId, "hi", null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Comment user not found");

        verify(postCommentRepository, never()).save(any());
    }

    @Test
    void addComment_parentCommentNotFound_throwsNotFound() {
        UUID postId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();

        Post post = post(postId, user(UUID.randomUUID(), "author"));
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(userRepository.findById(commenterId)).thenReturn(Optional.of(user(commenterId, "commenter")));
        when(postCommentRepository.findById(parentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addComment(postId, request(commenterId, "a reply", parentId)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Parent comment not found");

        verify(postCommentRepository, never()).save(any());
    }

    @Test
    void addComment_policyViolation_propagatesAndDoesNotSave() {
        UUID postId = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();

        Post post = post(postId, user(UUID.randomUUID(), "author"));
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(userRepository.findById(commenterId)).thenReturn(Optional.of(user(commenterId, "commenter")));
        // Banned-content guard rejects before persistence.
        org.mockito.Mockito.doThrow(new ValidationException("Bình luận chứa nội dung không hợp lệ"))
                .when(policyContentValidator).validateComment("banned content");

        assertThatThrownBy(() -> service.addComment(postId, request(commenterId, "banned content", null)))
                .isInstanceOf(ValidationException.class);

        verify(postCommentRepository, never()).save(any());
    }

    @Test
    void updateComment_bannedUser_throwsValidation() {
        UUID commentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        User author = user(userId, "commenter");
        PostComment comment = existingComment(commentId, userId, "old content", CommentStatus.APPROVED);
        comment.setUser(author);

        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentViolationService.isCommentLocked(userId)).thenReturn(true);

        assertThatThrownBy(() -> service.updateComment(commentId, userId, updateRequest("new content")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("tạm cấm bình luận");

        verify(postCommentRepository, never()).save(any());
    }

    @Test
    void updateComment_unchangedContent_skipsValidationAndSave() {
        UUID commentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PostComment comment = existingComment(commentId, userId, "same content", CommentStatus.APPROVED);

        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        PostCommentResponse response = service.updateComment(commentId, userId, updateRequest("same content"));

        assertThat(response.getContent()).isEqualTo("same content");
        verify(policyContentValidator, never()).validateComment(anyString());
        verify(postCommentRepository, never()).save(any());
    }

    @Test
    void updateComment_suspectContent_resetsModerationAndSetsPending() {
        UUID commentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PostComment comment = existingComment(commentId, userId, "clean content", CommentStatus.APPROVED);
        comment.setModerationAttempts(2);
        comment.setLastModeratedAt(LocalDateTime.now().minusDays(1));

        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(policyContentValidator.isSuspect("suspicious edit")).thenReturn(true);
        when(postCommentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));

        PostCommentResponse response = service.updateComment(commentId, userId, updateRequest("suspicious edit"));

        assertThat(response.getModerationStatus()).isEqualTo(CommentStatus.PENDING.name());

        ArgumentCaptor<PostComment> captor = ArgumentCaptor.forClass(PostComment.class);
        verify(postCommentRepository).save(captor.capture());
        PostComment saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(CommentStatus.PENDING);
        assertThat(saved.getContent()).isEqualTo("suspicious edit");
        assertThat(saved.getModerationAttempts()).isZero();
        assertThat(saved.getLastModeratedAt()).isNull();
    }

    @Test
    void updateComment_policyViolation_recordsViolationAndDoesNotSave() {
        UUID commentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PostComment comment = existingComment(commentId, userId, "clean content", CommentStatus.APPROVED);

        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        org.mockito.Mockito.doThrow(new ValidationException("Nội dung chứa từ khóa không được phép"))
                .when(policyContentValidator).validateComment("banned edit");
        when(policyContentValidator.findCommentViolationKeyword("banned edit"))
                .thenReturn(Optional.of(new PolicyContentValidator.MatchedKeyword("kw-1", "banned", "blacklist")));

        assertThatThrownBy(() -> service.updateComment(commentId, userId, updateRequest("banned edit")))
                .isInstanceOf(ValidationException.class);

        verify(commentViolationService).recordBlacklistViolation(userId, "banned edit", "kw-1", "banned");
        verify(postCommentRepository, never()).save(any());
    }

    @Test
    void updateComment_notOwner_throwsForbidden() {
        UUID commentId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        PostComment comment = existingComment(commentId, ownerId, "content", CommentStatus.APPROVED);

        when(postCommentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.updateComment(commentId, otherId, updateRequest("new content")))
                .isInstanceOf(ForbiddenException.class);

        verify(postCommentRepository, never()).save(any());
    }
}
