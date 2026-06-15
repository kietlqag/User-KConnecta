package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.BadRequestException;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.LiveKitTokenRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.CreateLiveSessionRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveReactionRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveKitTokenResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.GoLiveResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionReactionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionStatsResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionReaction;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionViewer;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveRecordingStatus;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveReactionType;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionReactionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionViewerRepository;
import project.kconnecta.user.backend.feature.live.service.LiveAccessService;
import project.kconnecta.user.backend.feature.live.service.LiveEventSubscriptionService;
import project.kconnecta.user.backend.feature.live.service.LiveKitTokenService;
import project.kconnecta.user.backend.feature.live.service.LiveSessionRealtimePublisher;
import project.kconnecta.user.backend.feature.live.service.LiveSessionService;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class LiveSessionServiceImpl implements LiveSessionService {

    private static final long VIEWER_HEARTBEAT_TIMEOUT_SECONDS = 45;
    private static final long MAX_RECORDING_SIZE_BYTES = 100L * 1024L * 1024L;
    private static final DateTimeFormatter SCHEDULED_AT_DISPLAY_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final LiveSessionRepository liveSessionRepository;
    private final LiveSessionViewerRepository liveSessionViewerRepository;
    private final LiveSessionReactionRepository liveSessionReactionRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CloudinaryService cloudinaryService;
    private final LiveSessionRealtimePublisher realtimePublisher;
    private final LiveAccessService liveAccessService;
    private final LiveKitTokenService liveKitTokenService;
    private final LiveEventSubscriptionService liveEventSubscriptionService;

    @Override
    public LiveSessionResponse createSession(CreateLiveSessionRequest request, UUID hostUserId) {
        liveAccessService.requireAuthenticated(hostUserId);
        if (!request.getHostUserId().equals(hostUserId)) {
            throw new ForbiddenException("Cannot create a live session for another user");
        }

        User host = userRepository.findById(hostUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + hostUserId));

        validateScheduleRule(request.getStartMode(), request.getScheduledAt());

        LiveSessionStatus initialStatus = request.getStartMode() == LiveStartMode.SCHEDULED
                ? LiveSessionStatus.SCHEDULED
                : LiveSessionStatus.DRAFT;

        String roomName = "live_" + UUID.randomUUID().toString().replace("-", "");

        LiveSession session = LiveSession.builder()
                .host(host)
                .groupId(request.getGroupId())
                .pageId(request.getPageId())
                .title(request.getTitle().trim())
                .description(request.getDescription() == null ? null : request.getDescription().trim())
                .privacy(request.getPrivacy())
                .startMode(request.getStartMode())
                .scheduledAt(request.getStartMode() == LiveStartMode.SCHEDULED ? request.getScheduledAt() : null)
                .status(initialStatus)
                .streamKey(roomName)
                .roomName(roomName)
                .playbackUrl(request.getPlaybackUrl())
                .thumbnailUrl(request.getThumbnailUrl())
                .recordingStatus(LiveRecordingStatus.NONE)
                .viewerCount(0)
                .peakViewerCount(0)
                .totalReactionCount(0)
                .build();

        return toResponse(liveSessionRepository.save(session));
    }

    @Override
    public GoLiveResponse goLive(UUID sessionId, UUID hostUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);

        if (session.getStatus() == LiveSessionStatus.ENDED || session.getStatus() == LiveSessionStatus.CANCELED) {
            throw new ValidationException("Cannot start a finished live session");
        }

        if (session.getStatus() == LiveSessionStatus.SCHEDULED
                && session.getScheduledAt() != null
                && session.getScheduledAt().isAfter(LocalDateTime.now())) {
            throw new ValidationException(
                    "Chưa đến giờ phát. Vui lòng chờ đến "
                            + session.getScheduledAt().format(SCHEDULED_AT_DISPLAY_FORMAT)
            );
        }

        publishLinkedPostIfNeeded(session);

        session.setStatus(LiveSessionStatus.LIVE);
        session.setRecordingStatus(LiveRecordingStatus.RECORDING);
        session.setRecordingError(null);
        if (session.getStartedAt() == null) {
            session.setStartedAt(LocalDateTime.now());
        }

        LiveSessionResponse response = toResponse(liveSessionRepository.save(session), hostUserId);
        realtimePublisher.publishSessionEvent("LIVE_STARTED", response);
        liveEventSubscriptionService.notifyLiveStarted(session);

        LiveKitTokenRequest tokenRequest = new LiveKitTokenRequest();
        tokenRequest.setUserId(hostUserId);
        tokenRequest.setSessionId(sessionId);
        tokenRequest.setRole(LiveKitTokenRequest.LiveKitParticipantRole.HOST);
        LiveKitTokenResponse hostToken = liveKitTokenService.createToken(tokenRequest);

        return GoLiveResponse.builder()
                .session(response)
                .livekitUrl(hostToken.getLivekitUrl())
                .hostToken(hostToken.getToken())
                .build();
    }

    @Override
    public LiveSessionResponse endLive(UUID sessionId, UUID requesterUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, requesterUserId);

        if (session.getStatus() == LiveSessionStatus.ENDED) {
            LiveSessionResponse response = toResponse(session);
            realtimePublisher.publishSessionEvent("LIVE_ENDED", response);
            return response;
        }

        session.setStatus(LiveSessionStatus.ENDED);
        session.setEndedAt(LocalDateTime.now());
        session.setViewerCount(0);
        liveSessionViewerRepository.deleteAllBySessionId(sessionId);
        if (isBlank(session.getPlaybackUrl()) && session.getRecordingStatus() != LiveRecordingStatus.READY) {
            session.setRecordingStatus(LiveRecordingStatus.PROCESSING);
        }

        LiveSessionResponse response = toResponse(liveSessionRepository.save(session));
        realtimePublisher.publishSessionEvent("LIVE_ENDED", response);
        return response;
    }

    @Override
    public LiveSessionResponse saveRecording(UUID sessionId, UUID hostUserId, MultipartFile file, Integer durationSec) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        validateRecordingFile(file);

        String playbackUrl = cloudinaryService.uploadLiveRecording(file, sessionId.toString());
        session.setPlaybackUrl(playbackUrl);
        session.setRecordingStatus(LiveRecordingStatus.READY);
        session.setRecordingDurationSec(durationSec == null ? null : Math.max(0, durationSec));
        session.setRecordingMimeType(file.getContentType());
        session.setRecordingFileSizeBytes(file.getSize());
        session.setRecordingError(null);
        boolean endedByRecording = false;
        if (session.getStatus() != LiveSessionStatus.ENDED && session.getStatus() != LiveSessionStatus.CANCELED) {
            session.setStatus(LiveSessionStatus.ENDED);
            session.setEndedAt(LocalDateTime.now());
            session.setViewerCount(0);
            liveSessionViewerRepository.deleteAllBySessionId(sessionId);
            endedByRecording = true;
        }

        LiveSessionResponse response = toResponse(liveSessionRepository.save(session));
        realtimePublisher.publishSessionEvent(endedByRecording ? "LIVE_ENDED" : "SESSION_UPDATED", response);
        return response;
    }

    @Override
    public LiveSessionResponse markRecordingFailed(UUID sessionId, UUID hostUserId, String error) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        if (session.getRecordingStatus() != LiveRecordingStatus.READY) {
            session.setRecordingStatus(LiveRecordingStatus.FAILED);
            session.setRecordingError(trimToLength(error, 500));
        }
        LiveSessionResponse response = toResponse(liveSessionRepository.save(session));
        realtimePublisher.publishSessionEvent("SESSION_UPDATED", response);
        return response;
    }

    @Override
    public LiveSessionResponse join(UUID sessionId, UUID userId) {
        LiveSession session = findLiveSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        if (session.getHost().getId().equals(userId)) {
            return toResponse(session);
        }

        User user = findUser(userId);
        cleanupStaleViewers(session);

        LiveSessionViewer viewer = liveSessionViewerRepository.findBySessionIdAndUserId(sessionId, user.getId())
                .orElseGet(() -> LiveSessionViewer.builder().session(session).user(user).build());
        viewer.setLastSeenAt(LocalDateTime.now());
        liveSessionViewerRepository.save(viewer);
        refreshViewerCount(session);

        LiveSessionResponse response = toResponse(session);
        realtimePublisher.publishSessionEvent("VIEWER_COUNT_UPDATED", response);
        return response;
    }

    @Override
    public LiveSessionResponse heartbeat(UUID sessionId, UUID userId) {
        LiveSession session = findLiveSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        if (session.getHost().getId().equals(userId)) {
            return toResponse(session);
        }

        User user = findUser(userId);
        cleanupStaleViewers(session);

        LiveSessionViewer viewer = liveSessionViewerRepository.findBySessionIdAndUserId(sessionId, user.getId())
                .orElseGet(() -> LiveSessionViewer.builder().session(session).user(user).build());
        viewer.setLastSeenAt(LocalDateTime.now());
        liveSessionViewerRepository.save(viewer);
        refreshViewerCount(session);

        return toResponse(session);
    }

    @Override
    public LiveSessionResponse leave(UUID sessionId, UUID userId) {
        LiveSession session = findSession(sessionId);

        liveSessionViewerRepository.findBySessionIdAndUserId(sessionId, userId)
                .ifPresent(liveSessionViewerRepository::delete);
        if (session.getStatus() == LiveSessionStatus.LIVE) {
            refreshViewerCount(session);
            LiveSessionResponse response = toResponse(session);
            realtimePublisher.publishSessionEvent("VIEWER_COUNT_UPDATED", response);
            return response;
        }
        return toResponse(session);
    }

    @Override
    public LiveSessionResponse react(UUID sessionId, UUID userId, UpsertLiveReactionRequest request) {
        LiveSession session = findLiveSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        User user = findUser(userId);

        var existingOpt = liveSessionReactionRepository.findBySessionIdAndUserId(sessionId, user.getId());

        if (request.getReactionType() == null) {
            existingOpt.ifPresent(liveSessionReactionRepository::delete);
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
        LiveSessionResponse response = toResponse(session);
        realtimePublisher.publishReactionUpdated(response, user.getId(), request.getReactionType());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionReactionResponse getReaction(UUID sessionId, UUID userId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        LiveReactionType reactionType = liveSessionReactionRepository.findBySessionIdAndUserId(sessionId, userId)
                .map(LiveSessionReaction::getReactionType)
                .orElse(null);
        return LiveSessionReactionResponse.builder()
                .sessionId(sessionId)
                .userId(userId)
                .reactionType(reactionType)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionResponse getById(UUID sessionId, UUID viewerUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, viewerUserId);
        return toResponse(session, viewerUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionResponse getByPostId(UUID postId, UUID viewerUserId) {
        LiveSession session = liveSessionRepository.findByPostId(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Live session not found for post: " + postId));
        liveAccessService.requireCanView(session, viewerUserId);
        return toResponse(session, viewerUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LiveSessionResponse> listActive(UUID viewerUserId) {
        return liveSessionRepository.findAllByStatusOrderByCreatedAtDesc(LiveSessionStatus.LIVE)
                .stream()
                .filter(session -> liveAccessService.canView(session, viewerUserId))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LiveSessionResponse> listByHost(UUID hostUserId, UUID requesterUserId) {
        liveAccessService.requireAuthenticated(requesterUserId);
        if (!hostUserId.equals(requesterUserId)) {
            throw new ForbiddenException("Cannot list live sessions for another user");
        }
        return liveSessionRepository.findAllByHostIdOrderByCreatedAtDesc(hostUserId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionStatsResponse getStats(UUID sessionId, UUID viewerUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, viewerUserId);
        if (session.getStatus() == LiveSessionStatus.LIVE) {
            cleanupStaleViewers(session);
            refreshViewerCount(session);
        }
        return LiveSessionStatsResponse.builder()
                .sessionId(session.getId())
                .viewerCount(session.getViewerCount())
                .peakViewerCount(session.getPeakViewerCount())
                .totalReactionCount(session.getTotalReactionCount())
                .build();
    }

    private void publishLinkedPostIfNeeded(LiveSession session) {
        if (session.getPostId() == null) {
            return;
        }
        postRepository.findById(session.getPostId()).ifPresent(post -> {
            if (post.getStatus() == PostStatus.SCHEDULED) {
                LocalDateTime now = LocalDateTime.now();
                post.setStatus(PostStatus.PUBLISHED);
                post.setPublishedAt(now);
                postRepository.save(post);
            }
        });
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

    @Override
    public int activateDueScheduledSessions() {
        LocalDateTime now = LocalDateTime.now();
        List<LiveSession> dueSessions = liveSessionRepository
                .findAllByStatusAndScheduledAtLessThanEqual(LiveSessionStatus.SCHEDULED, now);
        int activated = 0;
        for (LiveSession session : dueSessions) {
            try {
                goLive(session.getId(), session.getHost().getId());
                activated++;
            } catch (Exception ex) {
                log.warn("Failed to auto go-live for session {}: {}", session.getId(), ex.getMessage());
            }
        }
        return activated;
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

    private void validateRecordingFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Recording file is required");
        }
        if (file.getSize() > MAX_RECORDING_SIZE_BYTES) {
            throw new BadRequestException("Recording file is too large");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("video/")) {
            throw new BadRequestException("Unsupported recording content type");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimToLength(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private void cleanupStaleViewers(LiveSession session) {
        liveSessionViewerRepository.deleteStaleBySessionId(
                session.getId(),
                LocalDateTime.now().minusSeconds(VIEWER_HEARTBEAT_TIMEOUT_SECONDS)
        );
    }

    private void refreshViewerCount(LiveSession session) {
        int viewers = session.getStatus() == LiveSessionStatus.LIVE
                ? liveSessionViewerRepository.countBySessionId(session.getId())
                : 0;
        session.setViewerCount(viewers);
        if (viewers > session.getPeakViewerCount()) {
            session.setPeakViewerCount(viewers);
        }
        liveSessionRepository.save(session);
    }

    private LiveSessionResponse toResponse(LiveSession session) {
        return toResponse(session, null);
    }

    private LiveSessionResponse toResponse(LiveSession session, UUID viewerUserId) {
        LiveSessionResponse.LiveSessionResponseBuilder builder = LiveSessionResponse.builder()
                .id(session.getId())
                .hostUserId(session.getHost().getId())
                .groupId(session.getGroupId())
                .pageId(session.getPageId())
                .postId(session.getPostId())
                .title(session.getTitle())
                .description(session.getDescription())
                .privacy(session.getPrivacy())
                .startMode(session.getStartMode())
                .scheduledAt(session.getScheduledAt())
                .status(session.getStatus())
                .streamKey(session.getStreamKey())
                .roomName(session.getRoomName())
                .playbackUrl(session.getPlaybackUrl())
                .thumbnailUrl(session.getThumbnailUrl())
                .recordingStatus(session.getRecordingStatus())
                .recordingDurationSec(session.getRecordingDurationSec())
                .recordingMimeType(session.getRecordingMimeType())
                .recordingFileSizeBytes(session.getRecordingFileSizeBytes())
                .recordingError(session.getRecordingError())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .viewerCount(session.getViewerCount())
                .peakViewerCount(session.getPeakViewerCount())
                .totalReactionCount(session.getTotalReactionCount())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt());

        if (session.getStatus() == LiveSessionStatus.SCHEDULED) {
            builder.subscriptionCount(liveEventSubscriptionService.countBySessionId(session.getId()));
            if (viewerUserId != null) {
                builder.subscribedByCurrentUser(liveEventSubscriptionService.isSubscribed(session.getId(), viewerUserId));
            }
        }

        return builder.build();
    }
}
