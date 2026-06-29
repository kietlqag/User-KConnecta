package project.kconnecta.user.backend.feature.post.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.ai.GeminiModerationService;
import project.kconnecta.user.backend.feature.interest.service.PostTopicService;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.policy.service.AiModerationPolicyReader;
import project.kconnecta.user.backend.feature.policy.service.PolicyContentValidator;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import project.kconnecta.user.backend.feature.post.entity.AiModerationStatus;
import project.kconnecta.user.backend.feature.post.entity.CommentStatus;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.PostComment;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdatePostRequest;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.repository.PostCommentRepository;
import project.kconnecta.user.backend.feature.post.repository.PostReactionRepository;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.post.repository.PostSavedRepository;
import project.kconnecta.user.backend.feature.post.repository.PostShareRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifies the {@code aiModeration.enabled} gate around the Gemini moderation calls in
 * {@link PostServiceImpl}. Mirrors the Mockito + AssertJ style of {@code PostServiceImplCommentTest}.
 */
@ExtendWith(MockitoExtension.class)
class PostServiceImplModerationGateTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PostRepository postRepository;
    @Mock
    private PostCommentRepository postCommentRepository;
    @Mock
    private PostReactionRepository postReactionRepository;
    @Mock
    private PostShareRepository postShareRepository;
    @Mock
    private PostSavedRepository postSavedRepository;
    @Mock
    private PolicyContentValidator policyContentValidator;
    @Mock
    private GeminiModerationService geminiModerationService;
    @Mock
    private AiModerationPolicyReader aiModerationPolicyReader;
    @Mock
    private NotificationEventPublisher notificationEventPublisher;
    @Mock
    private SettingsService settingsService;
    @Mock
    private PostTopicService postTopicService;

    @InjectMocks
    private PostServiceImpl service;

    @BeforeEach
    void stubPostResponseDeps() {
        lenient().when(postReactionRepository.findReactionCountsByPostId(any())).thenReturn(List.of());
        lenient().when(postReactionRepository.findByPostIdAndUserId(any(), any())).thenReturn(Optional.empty());
        lenient().when(postCommentRepository.countByPostId(any())).thenReturn(0L);
        lenient().when(postShareRepository.countByPostId(any())).thenReturn(0L);
        lenient().when(postSavedRepository.existsByPostIdAndUserId(any(), any())).thenReturn(false);
        lenient().when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        // privacy mặc định khi request không set — để createPost chạy tới các bước sau khối kiểm duyệt.
        lenient().when(settingsService.getDefaultPostPrivacy(any())).thenReturn(PostPrivacy.PUBLIC);
    }

    private Post publishedPost(UUID postId, UUID authorId, String content) {
        return Post.builder()
                .id(postId)
                .author(User.builder().id(authorId).username("author").build())
                .content(content)
                .status(PostStatus.PUBLISHED)
                .privacy(PostPrivacy.PUBLIC)
                .build();
    }

    private CreatePostRequest createRequest(UUID authorId, String content) {
        CreatePostRequest req = new CreatePostRequest();
        req.setAuthorId(authorId);
        req.setContent(content);
        return req;
    }

    @Test
    void createPost_whenAiEnabledAndContentUnsafe_invokesGeminiAndRejects() {
        UUID authorId = UUID.randomUUID();
        when(userRepository.findById(authorId))
                .thenReturn(Optional.of(User.builder().id(authorId).username("author").build()));
        when(aiModerationPolicyReader.isEnabled()).thenReturn(true);
        // Không còn cổng isSuspect — AI duyệt mọi bài có text.
        when(geminiModerationService.moderate("bad content"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(false, "toxic")));

        assertThatThrownBy(() -> service.createPost(createRequest(authorId, "bad content")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("vi phạm");

        verify(geminiModerationService).moderate("bad content");
    }

    @Test
    void createPost_whenAiEnabledAndContentNonBlank_invokesGemini() {
        UUID authorId = UUID.randomUUID();
        when(userRepository.findById(authorId))
                .thenReturn(Optional.of(User.builder().id(authorId).username("author").build()));
        when(aiModerationPolicyReader.isEnabled()).thenReturn(true);

        // AI giờ duyệt MỌI bài có text (không còn cổng isSuspect). Ép lỗi validate *sau* khối
        // kiểm duyệt (group + page cùng set) để dừng sớm nhưng vẫn chứng minh Gemini được gọi.
        CreatePostRequest req = createRequest(authorId, "nice post");
        req.setGroupId(UUID.randomUUID());
        req.setPageId(UUID.randomUUID());

        assertThatThrownBy(() -> service.createPost(req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("both a group and a page");

        verify(geminiModerationService).moderate("nice post");
    }

    @Test
    void createPost_whenAiDisabled_skipsGemini() {
        UUID authorId = UUID.randomUUID();
        when(userRepository.findById(authorId))
                .thenReturn(Optional.of(User.builder().id(authorId).username("author").build()));
        when(aiModerationPolicyReader.isEnabled()).thenReturn(false);

        // Force a benign validation failure *after* the moderation gate (group + page both set),
        // so we stop before the heavy happy-path while proving Gemini was never consulted.
        CreatePostRequest req = createRequest(authorId, "bad content");
        req.setGroupId(UUID.randomUUID());
        req.setPageId(UUID.randomUUID());

        assertThatThrownBy(() -> service.createPost(req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("both a group and a page");

        verify(geminiModerationService, never()).moderate(anyString());
    }

    @Test
    void moderatePendingComments_whenAiDisabled_returnsZeroAndSkipsGemini() {
        when(aiModerationPolicyReader.isEnabled()).thenReturn(false);

        int resolved = service.moderatePendingComments();

        assertThat(resolved).isZero();
        verify(geminiModerationService, never()).moderate(anyString());
    }

    @Test
    void moderatePendingComments_alreadySafe_skipsGeminiAndPromotes() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        PostComment pendingSafe = PostComment.builder()
                .id(commentId)
                .post(Post.builder().id(UUID.randomUUID()).author(User.builder().id(authorId).username("a").build()).build())
                .user(User.builder().id(authorId).username("author").build())
                .content("already checked")
                .status(CommentStatus.PENDING)
                .aiModerationStatus(AiModerationStatus.SAFE)
                .build();

        when(aiModerationPolicyReader.isEnabled()).thenReturn(true);
        when(postCommentRepository.findByStatusAndModerationAttemptsLessThanOrderByCreatedAtAsc(
                eq(CommentStatus.PENDING), anyInt(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(pendingSafe)));
        when(postCommentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));

        int resolved = service.moderatePendingComments();

        assertThat(resolved).isEqualTo(1);
        assertThat(pendingSafe.getStatus()).isEqualTo(CommentStatus.APPROVED);
        verify(geminiModerationService, never()).moderate(anyString());
    }

    @Test
    void updatePost_unchangedContent_skipsGemini() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Post post = publishedPost(postId, authorId, "hello world");
        UpdatePostRequest req = new UpdatePostRequest();
        req.setContent("hello world");
        // Dừng sớm sau khối kiểm duyệt (excludedUserIds không còn hỗ trợ) để khỏi chạm happy-path nặng.
        req.setExcludedUserIds(List.of(UUID.randomUUID()));

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> service.updatePost(postId, authorId, req))
                .isInstanceOf(ValidationException.class);

        verify(geminiModerationService, never()).moderate(anyString());
    }

    @Test
    void updatePost_contentChange_invokesGeminiAndRejectsWhenUnsafe() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Post post = publishedPost(postId, authorId, "old text");
        UpdatePostRequest req = new UpdatePostRequest();
        req.setContent("new bad text");

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(aiModerationPolicyReader.isEnabled()).thenReturn(true);
        // Không còn cổng isSuspect — mọi thay đổi nội dung đều được AI duyệt; unsafe → chặn ngay.
        when(geminiModerationService.moderate("new bad text"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(false, "toxic")));

        assertThatThrownBy(() -> service.updatePost(postId, authorId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("vi phạm");

        verify(geminiModerationService).moderate("new bad text");
    }

    @Test
    void updatePost_contentChange_invokesGeminiAndProceedsWhenSafe() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Post post = publishedPost(postId, authorId, "old text");
        UpdatePostRequest req = new UpdatePostRequest();
        req.setContent("new clean text");
        // Safe → vượt qua khối kiểm duyệt; dừng sớm sau đó bằng excludedUserIds.
        req.setExcludedUserIds(List.of(UUID.randomUUID()));

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(aiModerationPolicyReader.isEnabled()).thenReturn(true);
        when(geminiModerationService.moderate("new clean text"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(true, "")));

        assertThatThrownBy(() -> service.updatePost(postId, authorId, req))
                .isInstanceOf(ValidationException.class);

        verify(geminiModerationService).moderate("new clean text");
    }

    @Test
    void updatePost_mediaOnlyChange_skipsGemini() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Post post = publishedPost(postId, authorId, "unchanged text");
        UpdatePostRequest req = new UpdatePostRequest();
        req.setMedia(List.of());
        req.setExcludedUserIds(List.of(UUID.randomUUID())); // dừng sớm sau khối kiểm duyệt

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> service.updatePost(postId, authorId, req))
                .isInstanceOf(ValidationException.class);

        verify(geminiModerationService, never()).moderate(anyString());
    }
}
