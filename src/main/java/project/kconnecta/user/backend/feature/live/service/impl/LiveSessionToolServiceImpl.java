package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveFeaturedLinkRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveHostNoticeRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveSessionPinnedCommentRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.VoteLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionToolStateResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionPollVote;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionToolState;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionPollVoteRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionToolStateRepository;
import project.kconnecta.user.backend.feature.live.service.LiveAccessService;
import project.kconnecta.user.backend.feature.live.service.LiveSessionRealtimePublisher;
import project.kconnecta.user.backend.feature.live.service.LiveSessionToolService;
import project.kconnecta.user.backend.feature.post.repository.PostCommentRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LiveSessionToolServiceImpl implements LiveSessionToolService {

    private final LiveSessionRepository liveSessionRepository;
    private final LiveSessionToolStateRepository liveSessionToolStateRepository;
    private final LiveSessionPollVoteRepository liveSessionPollVoteRepository;
    private final PostCommentRepository postCommentRepository;
    private final LiveSessionRealtimePublisher realtimePublisher;
    private final LiveAccessService liveAccessService;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public LiveSessionToolStateResponse get(UUID sessionId, UUID viewerUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, viewerUserId);
        return toResponse(findOrNew(session), viewerUserId);
    }

    @Override
    public LiveSessionToolStateResponse upsertPoll(UUID sessionId, UUID hostUserId, UpsertLivePollRequest request) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        LiveSessionToolState state = findOrNew(session);
        String oldQuestion = state.getPollQuestion();
        String oldOptions = state.getPollOptions();
        List<String> options = sanitizeOptions(request.getOptions());
        String question = clean(request.getQuestion());
        if (request.isEnabled() && (question == null || options.size() < 2)) {
            throw new ValidationException("Poll requires a question and at least 2 options");
        }
        String newOptionsStored = String.join("\n", options);
        boolean pollContentChanged = !Objects.equals(oldQuestion, question)
                || !Objects.equals(oldOptions, newOptionsStored);
        if (pollContentChanged) {
            liveSessionPollVoteRepository.deleteAllBySessionId(session.getId());
        }
        state.setPollEnabled(request.isEnabled());
        state.setPollQuestion(question);
        state.setPollOptions(newOptionsStored);
        LiveSessionToolStateResponse response = toResponse(liveSessionToolStateRepository.save(state), hostUserId);
        realtimePublisher.publishToolsUpdated(response);
        return response;
    }

    @Override
    public LiveSessionToolStateResponse votePoll(UUID sessionId, UUID userId, VoteLivePollRequest request) {
        liveAccessService.requireAuthenticated(userId);
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        LiveSessionToolState state = findOrNew(session);
        if (!state.isPollEnabled()) {
            throw new ValidationException("Poll is not enabled for this session");
        }
        List<String> options = parseOptions(state.getPollOptions());
        int optionIndex = request.getOptionIndex();
        if (optionIndex < 0 || optionIndex >= options.size()) {
            throw new ValidationException("Invalid poll option");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        LiveSessionPollVote vote = liveSessionPollVoteRepository.findBySessionIdAndUserId(sessionId, userId)
                .orElseGet(() -> LiveSessionPollVote.builder().session(session).user(user).build());
        vote.setOptionIndex(optionIndex);
        liveSessionPollVoteRepository.save(vote);
        LiveSessionToolStateResponse response = toResponse(state, userId);
        realtimePublisher.publishToolsUpdated(response);
        return response;
    }

    @Override
    public LiveSessionToolStateResponse upsertFeaturedLink(UUID sessionId, UUID hostUserId, UpsertLiveFeaturedLinkRequest request) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        LiveSessionToolState state = findOrNew(session);
        String title = clean(request.getTitle());
        String url = clean(request.getUrl());
        if ((title == null) != (url == null)) {
            throw new ValidationException("Featured link requires both title and url");
        }
        if (url != null && !(url.startsWith("http://") || url.startsWith("https://"))) {
            throw new ValidationException("Featured link url must start with http:// or https://");
        }
        state.setFeaturedLinkTitle(title);
        state.setFeaturedLinkUrl(url);
        LiveSessionToolStateResponse response = toResponse(liveSessionToolStateRepository.save(state), hostUserId);
        realtimePublisher.publishToolsUpdated(response);
        return response;
    }

    @Override
    public LiveSessionToolStateResponse upsertHostNotice(UUID sessionId, UUID hostUserId, UpsertLiveHostNoticeRequest request) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        LiveSessionToolState state = findOrNew(session);
        state.setHostNotice(clean(request.getNotice()));
        LiveSessionToolStateResponse response = toResponse(liveSessionToolStateRepository.save(state), hostUserId);
        realtimePublisher.publishToolsUpdated(response);
        return response;
    }

    @Override
    public LiveSessionToolStateResponse upsertPinnedComment(UUID sessionId, UUID hostUserId, UpsertLiveSessionPinnedCommentRequest request) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        UUID commentId = request.getCommentId();
        if (commentId != null) {
            if (session.getPostId() == null) {
                throw new ValidationException("This live session is not linked to a post");
            }
            var comment = postCommentRepository.findById(commentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + commentId));
            if (!comment.getPost().getId().equals(session.getPostId())) {
                throw new ValidationException("Comment does not belong to this live post");
            }
        }
        LiveSessionToolState state = findOrNew(session);
        state.setPinnedCommentId(commentId);
        LiveSessionToolStateResponse response = toResponse(liveSessionToolStateRepository.save(state), hostUserId);
        realtimePublisher.publishToolsUpdated(response);
        return response;
    }

    private LiveSession findSession(UUID sessionId) {
        return liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Live session not found: " + sessionId));
    }

    private LiveSessionToolState findOrNew(LiveSession session) {
        return liveSessionToolStateRepository.findBySessionId(session.getId())
                .orElseGet(() -> LiveSessionToolState.builder().session(session).build());
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<String> sanitizeOptions(List<String> options) {
        if (options == null) {
            return List.of();
        }
        return options.stream()
                .map(this::clean)
                .filter(option -> option != null)
                .distinct()
                .limit(6)
                .toList();
    }

    private List<String> parseOptions(String options) {
        if (options == null || options.isBlank()) {
            return List.of();
        }
        return Arrays.stream(options.split("\\R"))
                .map(this::clean)
                .filter(option -> option != null)
                .toList();
    }

    private LiveSessionToolStateResponse toResponse(LiveSessionToolState state, UUID viewerUserId) {
        List<String> options = parseOptions(state.getPollOptions());
        List<Long> counts = new ArrayList<>();
        Integer myPollOptionIndex = null;
        if (state.getPollQuestion() != null && !options.isEmpty()) {
            UUID sessionId = state.getSession().getId();
            for (int index = 0; index < options.size(); index++) {
                counts.add(liveSessionPollVoteRepository.countBySessionIdAndOptionIndex(sessionId, index));
            }
            if (viewerUserId != null) {
                myPollOptionIndex = liveSessionPollVoteRepository.findBySessionIdAndUserId(sessionId, viewerUserId)
                        .map(LiveSessionPollVote::getOptionIndex)
                        .orElse(null);
            }
        }
        return LiveSessionToolStateResponse.builder()
                .sessionId(state.getSession().getId())
                .pollEnabled(state.isPollEnabled())
                .pollQuestion(state.getPollQuestion())
                .pollOptions(options)
                .pollOptionCounts(counts.isEmpty() ? null : counts)
                .myPollOptionIndex(myPollOptionIndex)
                .featuredLinkTitle(state.getFeaturedLinkTitle())
                .featuredLinkUrl(state.getFeaturedLinkUrl())
                .hostNotice(state.getHostNotice())
                .pinnedCommentId(state.getPinnedCommentId())
                .updatedAt(state.getUpdatedAt())
                .build();
    }
}
