package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveFeaturedLinkRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveHostNoticeRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionToolStateResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionToolState;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionToolStateRepository;
import project.kconnecta.user.backend.feature.live.service.LiveSessionRealtimePublisher;
import project.kconnecta.user.backend.feature.live.service.LiveSessionToolService;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LiveSessionToolServiceImpl implements LiveSessionToolService {

    private final LiveSessionRepository liveSessionRepository;
    private final LiveSessionToolStateRepository liveSessionToolStateRepository;
    private final LiveSessionRealtimePublisher realtimePublisher;

    @Override
    @Transactional(readOnly = true)
    public LiveSessionToolStateResponse get(UUID sessionId) {
        LiveSession session = findSession(sessionId);
        return toResponse(findOrNew(session));
    }

    @Override
    public LiveSessionToolStateResponse upsertPoll(UUID sessionId, UpsertLivePollRequest request) {
        LiveSessionToolState state = findOrNew(findSession(sessionId));
        List<String> options = sanitizeOptions(request.getOptions());
        String question = clean(request.getQuestion());
        if (request.isEnabled() && (question == null || options.size() < 2)) {
            throw new ValidationException("Poll requires a question and at least 2 options");
        }
        state.setPollEnabled(request.isEnabled());
        state.setPollQuestion(question);
        state.setPollOptions(String.join("\n", options));
        LiveSessionToolStateResponse response = toResponse(liveSessionToolStateRepository.save(state));
        realtimePublisher.publishToolsUpdated(response);
        return response;
    }

    @Override
    public LiveSessionToolStateResponse upsertFeaturedLink(UUID sessionId, UpsertLiveFeaturedLinkRequest request) {
        LiveSessionToolState state = findOrNew(findSession(sessionId));
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
        LiveSessionToolStateResponse response = toResponse(liveSessionToolStateRepository.save(state));
        realtimePublisher.publishToolsUpdated(response);
        return response;
    }

    @Override
    public LiveSessionToolStateResponse upsertHostNotice(UUID sessionId, UpsertLiveHostNoticeRequest request) {
        LiveSessionToolState state = findOrNew(findSession(sessionId));
        state.setHostNotice(clean(request.getNotice()));
        LiveSessionToolStateResponse response = toResponse(liveSessionToolStateRepository.save(state));
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

    private LiveSessionToolStateResponse toResponse(LiveSessionToolState state) {
        return LiveSessionToolStateResponse.builder()
                .sessionId(state.getSession().getId())
                .pollEnabled(state.isPollEnabled())
                .pollQuestion(state.getPollQuestion())
                .pollOptions(parseOptions(state.getPollOptions()))
                .featuredLinkTitle(state.getFeaturedLinkTitle())
                .featuredLinkUrl(state.getFeaturedLinkUrl())
                .hostNotice(state.getHostNotice())
                .updatedAt(state.getUpdatedAt())
                .build();
    }
}
