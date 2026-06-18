package project.kconnecta.user.backend.feature.post.service.impl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.ai.GeminiModerationService;
import project.kconnecta.user.backend.feature.policy.service.AiModerationPolicyReader;
import project.kconnecta.user.backend.feature.policy.service.PolicyContentValidator;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.repository.PostCommentRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
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
    private PostCommentRepository postCommentRepository;
    @Mock
    private PolicyContentValidator policyContentValidator;
    @Mock
    private GeminiModerationService geminiModerationService;
    @Mock
    private AiModerationPolicyReader aiModerationPolicyReader;

    @InjectMocks
    private PostServiceImpl service;

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
        when(geminiModerationService.moderate("bad content"))
                .thenReturn(Optional.of(new GeminiModerationService.ModerationResult(false, "toxic")));

        assertThatThrownBy(() -> service.createPost(createRequest(authorId, "bad content")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("vi phạm");

        verify(geminiModerationService).moderate("bad content");
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
}
