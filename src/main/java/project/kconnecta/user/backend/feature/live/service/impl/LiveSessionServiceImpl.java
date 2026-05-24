package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.session.CreateLiveSessionRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.LiveViewerRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveReactionRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionStatsResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionReaction;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionViewer;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionReactionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionViewerRepository;
import project.kconnecta.user.backend.feature.live.service.LiveSessionService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LiveSessionServiceImpl implements LiveSessionService {

    private final LiveSessionRepository liveSessionRepository;
    private final LiveSessionViewerRepository liveSessionViewerRepository;
    private final LiveSessionReactionRepository liveSessionReactionRepository;
    private final UserRepository userRepository;

    @Override
    public LiveSessionResponse createSession(CreateLiveSessionRequest request) {
        User host = userRepository.findById(request.getHostUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getHostUserId()));

        validateScheduleRule(request.getStartMode(), request.getScheduledAt());

        LiveSessionStatus initialStatus = request.getStartMode() == LiveStartMode.SCHEDULED
                ? LiveSessionStatus.SCHEDULED
                : LiveSessionStatus.DRAFT;

        LiveSession session = LiveSession.builder()
                .host(host)
                .groupId(request.getGroupId())
                .title(request.getTitle().trim())
                .description(request.getDescription() == null ? null : request.getDescription().trim())
                .privacy(request.getPrivacy())
                .startMode(request.getStartMode())
                .scheduledAt(request.getStartMode() == LiveStartMode.SCHEDULED ? request.getScheduledAt() : null)
                .status(initialStatus)
                .streamKey("live_" + UUID.randomUUID().toString().replace("-", ""))
                .playbackUrl(request.getPlaybackUrl())
                .thumbnailUrl(request.getThumbnailUrl())
                .viewerCount(0)
                .peakViewerCount(0)
                .totalReactionCount(0)
                .build();

        return toResponse(liveSessionRepository.save(session));
    }

    @Override
    public LiveSessionResponse goLive(UUID sessionId) {
        LiveSession session = findSession(sessionId);

        if (session.getStatus() == LiveSessionStatus.ENDED || session.getStatus() == LiveSessionStatus.CANCELED) {
            throw new ValidationException("Cannot start a finished live session");
        }

        session.setStatus(LiveSessionStatus.LIVE);
        if (session.getStartedAt() == null) {
            session.setStartedAt(LocalDateTime.now());
        }

        return toResponse(liveSessionRepository.save(session));
    }

    @Override
    public LiveSessionResponse endLive(UUID sessionId) {
        LiveSession session = findSession(sessionId);

        if (session.getStatus() == LiveSessionStatus.ENDED) {
            return toResponse(session);
        }

        session.setStatus(LiveSessionStatus.ENDED);
        session.setEndedAt(LocalDateTime.now());
        session.setViewerCount(0);

        return toResponse(liveSessionRepository.save(session));
    }

    @Override
    public LiveSessionResponse join(UUID sessionId, LiveViewerRequest request) {
        LiveSession session = findLiveSession(sessionId);
        User user = findUser(request.getUserId());

        boolean existed = liveSessionViewerRepository.findBySessionIdAndUserId(sessionId, user.getId()).isPresent();
        if (!existed) {
            liveSessionViewerRepository.save(LiveSessionViewer.builder().session(session).user(user).build());
            int viewers = session.getViewerCount() + 1;
            session.setViewerCount(viewers);
            if (viewers > session.getPeakViewerCount()) {
                session.setPeakViewerCount(viewers);
            }
            liveSessionRepository.save(session);
        }

        return toResponse(session);
    }

    @Override
    public LiveSessionResponse leave(UUID sessionId, LiveViewerRequest request) {
        LiveSession session = findSession(sessionId);

        liveSessionViewerRepository.findBySessionIdAndUserId(sessionId, request.getUserId())
                .ifPresent(viewer -> {
                    liveSessionViewerRepository.delete(viewer);
                    session.setViewerCount(Math.max(0, session.getViewerCount() - 1));
                    liveSessionRepository.save(session);
                });

        return toResponse(session);
    }

    @Override
    public LiveSessionResponse react(UUID sessionId, UpsertLiveReactionRequest request) {
        LiveSession session = findLiveSession(sessionId);
        User user = findUser(request.getUserId());

        var existingOpt = liveSessionReactionRepository.findBySessionIdAndUserId(sessionId, user.getId());

        if (request.getReactionType() == null) {
            existingOpt.ifPresent(reaction -> liveSessionReactionRepository.delete(reaction));
        } else if (existingOpt.isPresent()) {
            LiveSessionReaction existing = existingOpt.get();
            existing.setReactionType(request.getReactionType());
            liveSessionReactionRepository.save(existing);
        } else {
            liveSessionReactionRepository.save(LiveSessionReaction.builder()
                    .session(session)
                    .user(user)
                    .reactionType(request.getReactionType())
                    .build());
        }

        session.setTotalReactionCount(liveSessionReactionRepository.countBySessionId(sessionId));
        liveSessionRepository.save(session);
        return toResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionResponse getById(UUID sessionId) {
        return toResponse(findSession(sessionId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<LiveSessionResponse> listActive() {
        return liveSessionRepository.findAllByStatusOrderByCreatedAtDesc(LiveSessionStatus.LIVE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LiveSessionResponse> listByHost(UUID hostUserId) {
        return liveSessionRepository.findAllByHostIdOrderByCreatedAtDesc(hostUserId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionStatsResponse getStats(UUID sessionId) {
        LiveSession session = findSession(sessionId);
        return LiveSessionStatsResponse.builder()
                .sessionId(session.getId())
                .viewerCount(session.getViewerCount())
                .peakViewerCount(session.getPeakViewerCount())
                .totalReactionCount(session.getTotalReactionCount())
                .build();
    }

    private void validateScheduleRule(LiveStartMode startMode, LocalDateTime scheduledAt) {
        if (startMode == LiveStartMode.SCHEDULED) {
            if (scheduledAt == null) {
                throw new ValidationException("scheduledAt is required when startMode is SCHEDULED");
            }
            if (!scheduledAt.isAfter(LocalDateTime.now())) {
                throw new ValidationException("scheduledAt must be in the future");
            }
        }
    }

    private LiveSession findSession(UUID sessionId) {
        return liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Live session not found: " + sessionId));
    }

    private LiveSession findLiveSession(UUID sessionId) {
        LiveSession session = findSession(sessionId);
        if (session.getStatus() != LiveSessionStatus.LIVE) {
            throw new ValidationException("This live session is not LIVE");
        }
        return session;
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private LiveSessionResponse toResponse(LiveSession session) {
        return LiveSessionResponse.builder()
                .id(session.getId())
                .hostUserId(session.getHost().getId())
                .groupId(session.getGroupId())
                .postId(session.getPostId())
                .title(session.getTitle())
                .description(session.getDescription())
                .privacy(session.getPrivacy())
                .startMode(session.getStartMode())
                .scheduledAt(session.getScheduledAt())
                .status(session.getStatus())
                .streamKey(session.getStreamKey())
                .playbackUrl(session.getPlaybackUrl())
                .thumbnailUrl(session.getThumbnailUrl())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .viewerCount(session.getViewerCount())
                .peakViewerCount(session.getPeakViewerCount())
                .totalReactionCount(session.getTotalReactionCount())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }
}
