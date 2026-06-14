package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.BadRequestException;
import project.kconnecta.user.backend.exception.ForbiddenException;
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
import project.kconnecta.user.backend.feature.live.entity.enums.LiveRecordingStatus;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionReactionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionViewerRepository;
import project.kconnecta.user.backend.feature.live.service.LiveSessionRealtimePublisher;
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

    private static final long VIEWER_HEARTBEAT_TIMEOUT_SECONDS = 45;
    private static final long MAX_RECORDING_SIZE_BYTES = 100L * 1024L * 1024L;

    private final LiveSessionRepository liveSessionRepository;
    private final LiveSessionViewerRepository liveSessionViewerRepository;
    private final LiveSessionReactionRepository liveSessionReactionRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final LiveSessionRealtimePublisher realtimePublisher;

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
                .roomName("live_" + UUID.randomUUID().toString().replace("-", ""))
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
    public LiveSessionResponse goLive(UUID sessionId) {
        LiveSession session = findSession(sessionId);

        if (session.getStatus() == LiveSessionStatus.ENDED || session.getStatus() == LiveSessionStatus.CANCELED) {
            throw new ValidationException("Cannot start a finished live session");
        }

        session.setStatus(LiveSessionStatus.LIVE);
        session.setRecordingStatus(LiveRecordingStatus.RECORDING);
        session.setRecordingError(null);
        if (session.getStartedAt() == null) {
            session.setStartedAt(LocalDateTime.now());
        }

        LiveSessionResponse response = toResponse(liveSessionRepository.save(session));
        realtimePublisher.publishSessionEvent("LIVE_STARTED", response);
        return response;
    }

    @Override
    public LiveSessionResponse endLive(UUID sessionId, UUID requesterUserId) {
        LiveSession session = findSession(sessionId);
        validateHost(session, requesterUserId);

        if (session.getStatus() == LiveSessionStatus.ENDED) {
            LiveSessionResponse response = toResponse(session);
            realtimePublisher.publishSessionEvent("LIVE_ENDED", response);
            return response;
        }

        session.setStatus(LiveSessionStatus.ENDED);
        session.setEndedAt(LocalDateTime.now());
        session.setViewerCount(0);
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
        validateHost(session, hostUserId);
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
            endedByRecording = true;
        }

        LiveSessionResponse response = toResponse(liveSessionRepository.save(session));
        realtimePublisher.publishSessionEvent(endedByRecording ? "LIVE_ENDED" : "SESSION_UPDATED", response);
        return response;
    }

    @Override
    public LiveSessionResponse markRecordingFailed(UUID sessionId, UUID hostUserId, String error) {
        LiveSession session = findSession(sessionId);
        validateHost(session, hostUserId);
        if (session.getRecordingStatus() != LiveRecordingStatus.READY) {
            session.setRecordingStatus(LiveRecordingStatus.FAILED);
            session.setRecordingError(trimToLength(error, 500));
        }
        LiveSessionResponse response = toResponse(liveSessionRepository.save(session));
        realtimePublisher.publishSessionEvent("SESSION_UPDATED", response);
        return response;
    }

    @Override
    public LiveSessionResponse join(UUID sessionId, LiveViewerRequest request) {
        LiveSession session = findLiveSession(sessionId);
        User user = findUser(request.getUserId());
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
    public LiveSessionResponse heartbeat(UUID sessionId, LiveViewerRequest request) {
        LiveSession session = findLiveSession(sessionId);
        User user = findUser(request.getUserId());
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
    public LiveSessionResponse leave(UUID sessionId, LiveViewerRequest request) {
        LiveSession session = findSession(sessionId);

        liveSessionViewerRepository.findBySessionIdAndUserId(sessionId, request.getUserId())
                .ifPresent(viewer -> {
                    liveSessionViewerRepository.delete(viewer);
                });
        refreshViewerCount(session);

        LiveSessionResponse response = toResponse(session);
        realtimePublisher.publishSessionEvent("VIEWER_COUNT_UPDATED", response);
        return response;
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
        LiveSessionResponse response = toResponse(session);
        realtimePublisher.publishSessionEvent("REACTION_UPDATED", response);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionResponse getById(UUID sessionId) {
        return toResponse(findSession(sessionId));
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionResponse getByPostId(UUID postId) {
        return liveSessionRepository.findByPostId(postId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Live session not found for post: " + postId));
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
    public LiveSessionStatsResponse getStats(UUID sessionId) {
        LiveSession session = findSession(sessionId);
        if (session.getStatus() == LiveSessionStatus.LIVE) {
            cleanupStaleViewers(session);
            refreshViewerCount(session);
            realtimePublisher.publishSessionEvent("VIEWER_COUNT_UPDATED", toResponse(session));
        }
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

    private void validateHost(LiveSession session, UUID requesterUserId) {
        if (requesterUserId == null) {
            return;
        }
        if (!session.getHost().getId().equals(requesterUserId)) {
            throw new ForbiddenException("Only the host can update this live session");
        }
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
                .updatedAt(session.getUpdatedAt())
                .build();
    }
}
