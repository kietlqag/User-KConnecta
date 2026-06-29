package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.LiveKitTokenRequest;
import project.kconnecta.user.backend.feature.live.dto.request.StartLiveRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveKitTokenResponse;
import project.kconnecta.user.backend.feature.live.dto.response.StartLiveResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveRecordingStatus;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.live.service.LiveKitTokenService;
import project.kconnecta.user.backend.feature.live.service.LiveSessionRealtimePublisher;
import project.kconnecta.user.backend.feature.live.service.LiveStartService;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.service.PostService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LiveStartServiceImpl implements LiveStartService {

    private final PostService postService;
    private final UserRepository userRepository;
    private final LiveSessionRepository liveSessionRepository;
    private final LiveKitTokenService liveKitTokenService;
    private final LiveSessionRealtimePublisher realtimePublisher;

    @Override
    public StartLiveResponse startLive(StartLiveRequest request) {
        if (request.getStartMode() == LiveStartMode.SCHEDULED && request.getScheduledAt() == null) {
            throw new ValidationException("scheduledAt is required when startMode is SCHEDULED");
        }

        CreatePostRequest createPostRequest = new CreatePostRequest();
        createPostRequest.setAuthorId(request.getUserId());
        createPostRequest.setGroupId(request.getGroupId());
        createPostRequest.setPageId(request.getPageId());
        createPostRequest.setContent(buildContent(request.getTitle(), request.getDescription()));
        createPostRequest.setPrivacy(request.getPrivacy());
        // Announcement post is visible immediately; only the live session waits for scheduledAt.
        createPostRequest.setStatus(PostStatus.PUBLISHED);
        createPostRequest.setScheduledAt(null);
        createPostRequest.setLocationText(request.getLocationText());
        createPostRequest.setBackgroundStyle("LIVE_POST");
        createPostRequest.setExcludedUserIds(request.getExcludedUserIds());
        createPostRequest.setTaggedUserIds(request.getTaggedUserIds());
        createPostRequest.setPromoted(Boolean.FALSE);

        PostResponse post = postService.createPost(createPostRequest);
        User host = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ValidationException("User not found: " + request.getUserId()));

        LiveSessionStatus status = request.getStartMode() == LiveStartMode.SCHEDULED
                ? LiveSessionStatus.SCHEDULED
                : LiveSessionStatus.LIVE;
        LocalDateTime now = LocalDateTime.now();
        String roomName = "live_" + post.getId().toString().replace("-", "");
        LiveSession session = liveSessionRepository.save(LiveSession.builder()
                .host(host)
                .groupId(request.getGroupId())
                .pageId(request.getPageId())
                .postId(post.getId())
                .title(request.getTitle().trim())
                .description(request.getDescription() == null ? null : request.getDescription().trim())
                .privacy(request.getPrivacy())
                .startMode(request.getStartMode())
                .scheduledAt(request.getStartMode() == LiveStartMode.SCHEDULED ? request.getScheduledAt() : null)
                .status(status)
                .streamKey(roomName)
                .roomName(roomName)
                .recordingStatus(status == LiveSessionStatus.LIVE ? LiveRecordingStatus.RECORDING : LiveRecordingStatus.NONE)
                .viewerCount(0)
                .peakViewerCount(0)
                .totalReactionCount(0)
                .startedAt(status == LiveSessionStatus.LIVE ? now : null)
                .build());

        if (status == LiveSessionStatus.LIVE) {
            realtimePublisher.publishSessionEvent("LIVE_STARTED", toResponse(session));
        }

        LiveKitTokenResponse hostToken = null;
        if (status == LiveSessionStatus.LIVE) {
            LiveKitTokenRequest tokenRequest = new LiveKitTokenRequest();
            tokenRequest.setUserId(request.getUserId());
            tokenRequest.setSessionId(session.getId());
            tokenRequest.setRole(LiveKitTokenRequest.LiveKitParticipantRole.HOST);
            hostToken = liveKitTokenService.createToken(tokenRequest);
        }

        return StartLiveResponse.builder()
                .postId(post.getId())
                .sessionId(session.getId())
                .userId(post.getAuthorId())
                .title(request.getTitle().trim())
                .roomName(session.getRoomName())
                .livekitUrl(hostToken == null ? null : hostToken.getLivekitUrl())
                .hostToken(hostToken == null ? null : hostToken.getToken())
                .startMode(request.getStartMode())
                .postStatus(post.getStatus())
                .scheduledAt(post.getScheduledAt())
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .build();
    }

    private String buildContent(String title, String description) {
        String safeTitle = title == null ? "" : title.trim();
        String safeDescription = description == null ? "" : description.trim();
        if (safeTitle.isBlank() && safeDescription.isBlank()) {
            throw new ValidationException("Live post content cannot be empty");
        }
        if (safeTitle.isBlank()) return safeDescription;
        if (safeDescription.isBlank()) return safeTitle;
        if (safeTitle.equals(safeDescription)) return safeTitle;
        return safeTitle + "\n\n" + safeDescription;
    }

    private LiveSessionResponse toResponse(LiveSession session) {
        return LiveSessionResponse.builder()
                .id(session.getId())
                .hostUserId(session.getHost().getId())
                .hostName(session.getHost().getFullName() != null && !session.getHost().getFullName().isBlank()
                        ? session.getHost().getFullName().trim()
                        : session.getHost().getUsername())
                .hostAvatarUrl(session.getHost().getAvatarUrl())
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
                .hlsPlaybackUrl(session.getHlsPlaybackUrl())
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
