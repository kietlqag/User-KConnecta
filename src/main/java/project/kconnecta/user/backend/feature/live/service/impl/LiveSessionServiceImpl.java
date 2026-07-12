package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.exception.BadRequestException;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.LiveKitTokenRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.CreateLiveSessionRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpdateScheduledLiveRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveReactionRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveKitTokenResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.GoLiveResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionReactionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionStatsResponse;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
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
import project.kconnecta.user.backend.feature.live.service.LiveKitEgressService;
import project.kconnecta.user.backend.feature.live.service.LiveKitTokenService;
import project.kconnecta.user.backend.feature.live.service.LiveSessionRealtimePublisher;
import project.kconnecta.user.backend.feature.live.service.LiveSessionService;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.PostReaction;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;
import project.kconnecta.user.backend.feature.post.repository.PostReactionRepository;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Triển khai nghiệp vụ cho việc quản lý phiên livestream (LiveSessionService).
 * Điều phối vòng đời của buổi Live: Khởi tạo -> Lên lịch -> Phát trực tiếp -> Tương tác realtime (Chat, Reaction, Xem số Viewer) -> Kết thúc -> Kết xuất lưu trữ video HLS.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class LiveSessionServiceImpl implements LiveSessionService {

    // Thời gian tối đa nếu Viewer không gửi heartbeat sẽ bị coi là mất kết nối (45 giây)
    private static final long VIEWER_HEARTBEAT_TIMEOUT_SECONDS = 45;
    private static final DateTimeFormatter SCHEDULED_AT_DISPLAY_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final LiveSessionRepository liveSessionRepository;
    private final LiveSessionViewerRepository liveSessionViewerRepository;
    private final LiveSessionReactionRepository liveSessionReactionRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostReactionRepository postReactionRepository;
    private final LiveSessionRealtimePublisher realtimePublisher;
    private final LiveAccessService liveAccessService;
    private final LiveKitTokenService liveKitTokenService;
    private final LiveKitEgressService liveKitEgressService;
    private final LiveEventSubscriptionService liveEventSubscriptionService;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;

    /**
     * Tạo mới một phiên livestream (DRAFT hoặc SCHEDULED).
     */
    @Override
    public LiveSessionResponse createSession(CreateLiveSessionRequest request, UUID hostUserId) {
        liveAccessService.requireAuthenticated(hostUserId);
        if (!request.getHostUserId().equals(hostUserId)) {
            throw new ForbiddenException("Cannot create a live session for another user");
        }

        User host = userRepository.findById(hostUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + hostUserId));

        // Kiểm tra tính hợp lệ của thời gian lên lịch phát
        validateScheduleRule(request.getStartMode(), request.getScheduledAt());

        LiveSessionStatus initialStatus = request.getStartMode() == LiveStartMode.SCHEDULED
                ? LiveSessionStatus.SCHEDULED
                : LiveSessionStatus.DRAFT;

        // Sinh tên phòng ngẫu nhiên duy nhất cho LiveKit
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

    /**
     * Kích hoạt phiên livestream chuyển sang trạng thái phát trực tiếp (LIVE).
     */
    @Override
    public GoLiveResponse goLive(UUID sessionId, UUID hostUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);

        if (session.getStatus() == LiveSessionStatus.ENDED || session.getStatus() == LiveSessionStatus.CANCELED) {
            throw new ValidationException("Cannot start a finished live session");
        }

        // Kiểm tra nếu chưa tới giờ lên lịch đối với phiên Scheduled
        if (session.getStatus() == LiveSessionStatus.SCHEDULED
                && session.getScheduledAt() != null
                && session.getScheduledAt().isAfter(LocalDateTime.now())) {
            throw new ValidationException(
                    "Chưa đến giờ phát. Vui lòng chờ đến "
                            + session.getScheduledAt().format(SCHEDULED_AT_DISPLAY_FORMAT)
            );
        }

        // Tự động kích hoạt hiển thị bài đăng liên kết (Post) gắn liền với phiên Live
        publishLinkedPostIfNeeded(session);

        session.setStatus(LiveSessionStatus.LIVE);
        session.setRecordingStatus(LiveRecordingStatus.RECORDING);
        session.setRecordingError(null);
        if (session.getStartedAt() == null) {
            session.setStartedAt(LocalDateTime.now());
        }

        LiveSessionResponse response = toResponse(liveSessionRepository.save(session), hostUserId);
        
        // Phát sự kiện thời gian thực tới toàn bộ client qua WebSocket
        realtimePublisher.publishSessionEvent("LIVE_STARTED", response);
        liveEventSubscriptionService.notifyLiveStarted(session);

        // Sinh Token LiveKit cho chủ phòng (HOST) để bắt đầu đẩy luồng phát
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

    /**
     * Bắt đầu tiến trình ghi hình/kết xuất luồng HLS lên lưu trữ đám mây.
     */
    @Override
    public LiveSessionResponse startHlsEgress(UUID sessionId, UUID hostUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        if (session.getStatus() != LiveSessionStatus.LIVE) {
            throw new ValidationException("Phiên live chưa ở trạng thái LIVE");
        }
        
        // Khởi chạy LiveKit HLS Egress ghi luồng phát
        startHlsEgressIfNeeded(session);
        LiveSessionResponse response = toResponse(liveSessionRepository.save(session), hostUserId);
        realtimePublisher.publishSessionEvent("SESSION_UPDATED", response);
        return response;
    }

    /**
     * Kết thúc phiên phát livestream (ENDED).
     */
    @Override
    public LiveSessionResponse endLive(UUID sessionId, UUID requesterUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, requesterUserId);

        if (session.getStatus() == LiveSessionStatus.ENDED) {
            LiveSessionResponse response = toResponse(session);
            realtimePublisher.publishSessionEvent("LIVE_ENDED", response);
            return response;
        }

        // Dừng ghi luồng Egress trên LiveKit Server
        if (!isBlank(session.getEgressId())) {
            liveKitEgressService.stopEgress(session.getEgressId());
        }

        session.setStatus(LiveSessionStatus.ENDED);
        session.setEndedAt(LocalDateTime.now());
        session.setViewerCount(0);
        
        // Dọn sạch danh sách Viewer hiện tại khỏi phòng live
        liveSessionViewerRepository.deleteAllBySessionId(sessionId);

        // Xử lý nạp đường dẫn phát lại HLS (VOD) sau khi live kết thúc
        if (!isBlank(session.getHlsPlaybackUrl())) {
            session.setPlaybackUrl(liveKitEgressService.buildVodPlaylistUrl(sessionId));
            session.setRecordingStatus(LiveRecordingStatus.PROCESSING);
            session.setRecordingMimeType("application/vnd.apple.mpegurl");
            session.setRecordingError(null);
        } else if (liveKitEgressService.isEgressConfigured()) {
            session.setRecordingStatus(LiveRecordingStatus.FAILED);
            if (isBlank(session.getRecordingError())) {
                session.setRecordingError(trimToLength(
                        "Không ghi được HLS lên R2. Kiểm tra LIVEKIT_EGRESS_* và quyền bucket R2.", 500));
            }
        } else if (isBlank(session.getPlaybackUrl())) {
            session.setRecordingStatus(LiveRecordingStatus.FAILED);
            session.setRecordingError(trimToLength(
                    "Chưa bật HLS egress. Đặt LIVEKIT_EGRESS_ENABLED=true và cấu hình R2 trên server.", 500));
        }

        LiveSessionResponse response = toResponse(liveSessionRepository.save(session));
        
        // Đồng bộ hóa lượng tương tác thời gian thực thu thập được trong phòng Live sang bài đăng chính thức
        syncLiveEngagementToPost(session);
        
        // Thông báo cho toàn bộ client qua WebSocket
        realtimePublisher.publishSessionEvent("LIVE_ENDED", response);
        return response;
    }

    /**
     * Chuyển cảm xúc live (live_session_reactions) sang post_reactions để bài post
     * hiển thị đúng sau khi kết thúc xem lại.
     */
    private void syncLiveEngagementToPost(LiveSession session) {
        UUID postId = session.getPostId();
        if (postId == null) {
            return;
        }
        Post post = postRepository.findById(postId).orElse(null);
        if (post == null) {
            return;
        }

        // Quét toàn bộ cảm xúc trong phòng live và ghi nhận sang bài viết
        List<LiveSessionReaction> liveReactions = liveSessionReactionRepository.findAllBySession_Id(session.getId());
        for (LiveSessionReaction liveReaction : liveReactions) {
            ReactionType postReactionType = mapLiveReactionToPost(liveReaction.getReactionType());
            if (postReactionType == null) {
                continue;
            }
            UUID userId = liveReaction.getUser().getId();
            Optional<PostReaction> existing = postReactionRepository.findByPostIdAndUserId(postId, userId);
            if (existing.isPresent()) {
                PostReaction reaction = existing.get();
                reaction.setReactionType(postReactionType);
                postReactionRepository.save(reaction);
            } else {
                postReactionRepository.save(PostReaction.builder()
                        .post(post)
                        .user(liveReaction.getUser())
                        .reactionType(postReactionType)
                        .build());
            }
        }
        log.info("Synced {} live reactions to post {} for session {}", liveReactions.size(), postId, session.getId());
    }

    /** Ánh xạ loại cảm xúc của LiveKit sang loại cảm xúc của Post trong DB. */
    private ReactionType mapLiveReactionToPost(LiveReactionType liveType) {
        if (liveType == null) {
            return null;
        }
        return switch (liveType) {
            case LIKE -> ReactionType.LIKE;
            case LOVE, CARE -> ReactionType.LOVE;
            case HAHA -> ReactionType.HAHA;
            case WOW -> ReactionType.WOW;
            case SAD -> ReactionType.SAD;
            case ANGRY -> ReactionType.ANGRY;
        };
    }

    private void syncLiveEngagementToPostIfNeeded(LiveSession session) {
        if (session.getPostId() == null || session.getTotalReactionCount() <= 0) {
            return;
        }
        if (session.getStatus() != LiveSessionStatus.ENDED && session.getStatus() != LiveSessionStatus.CANCELED) {
            return;
        }
        long postReactionCount = postReactionRepository.countByPostId(session.getPostId());
        if (postReactionCount >= session.getTotalReactionCount()) {
            return;
        }
        syncLiveEngagementToPost(session);
    }

    @Override
    public LiveSessionResponse saveRecording(UUID sessionId, UUID hostUserId, MultipartFile file, Integer durationSec) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        throw new BadRequestException(
                "Bản ghi live dùng HLS trên R2 qua LiveKit Egress. Upload file không còn được hỗ trợ.");
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

    /**
     * Người xem (Viewer) tham gia phòng Live.
     */
    @Override
    public LiveSessionResponse join(UUID sessionId, UUID userId) {
        LiveSession session = findLiveSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        if (session.getHost().getId().equals(userId)) {
            return toResponse(session);
        }

        User user = findUser(userId);
        
        // Quét dọn các phiên Viewer bị mất kết nối trước đó (Stale heartbeats)
        cleanupStaleViewers(session);

        LiveSessionViewer viewer = liveSessionViewerRepository.findBySessionIdAndUserId(sessionId, user.getId())
                .orElseGet(() -> LiveSessionViewer.builder().session(session).user(user).build());
        viewer.setLastSeenAt(LocalDateTime.now());
        liveSessionViewerRepository.save(viewer);
        
        // Đếm lại tổng số viewer hiện tại và cập nhật kỷ lục người xem (peak)
        refreshViewerCount(session);

        LiveSessionResponse response = toResponse(session);
        realtimePublisher.publishSessionEvent("VIEWER_COUNT_UPDATED", response);
        return response;
    }

    /**
     * Nhận tin báo duy trì kết nối (Heartbeat) định kỳ từ client của Viewer.
     */
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

    /**
     * Viewer chủ động rời khỏi phòng livestream (Leave).
     */
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

    /**
     * Ghi nhận và phát sóng phản hồi cảm xúc (Reactions) thời gian thực của người dùng trong phiên Live.
     */
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
        
        // Thông báo sự kiện reaction mới qua WebSocket cho tất cả mọi người trong phòng
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
        syncLiveEngagementToPostIfNeeded(session);
        return toResponse(session, viewerUserId);
    }

    /** Lấy danh sách các buổi livestream đang LIVE. */
    @Override
    @Transactional(readOnly = true)
    public List<LiveSessionResponse> listActive(UUID viewerUserId) {
        return liveSessionRepository.findAllByStatusOrderByCreatedAtDesc(LiveSessionStatus.LIVE)
                .stream()
                .filter(session -> liveAccessService.canView(session, viewerUserId))
                .map(this::toResponse)
                .toList();
    }

    /** Lấy danh sách các buổi live đã lên lịch (SCHEDULED). */
    @Override
    @Transactional(readOnly = true)
    public List<LiveSessionResponse> listScheduled(UUID viewerUserId) {
        return liveSessionRepository.findAllByStatusOrderByScheduledAtAsc(LiveSessionStatus.SCHEDULED)
                .stream()
                .filter(session -> liveAccessService.canView(session, viewerUserId))
                .map(session -> toResponse(session, viewerUserId))
                .toList();
    }

    /**
     * Cập nhật thông tin sự kiện livestream đã lên lịch.
     */
    @Override
    public LiveSessionResponse updateScheduled(UUID sessionId, UUID hostUserId, UpdateScheduledLiveRequest request) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        if (session.getStatus() != LiveSessionStatus.SCHEDULED) {
            throw new ValidationException("Chỉ có thể chỉnh sửa sự kiện live đang chờ phát");
        }
        validateScheduleRule(LiveStartMode.SCHEDULED, request.getScheduledAt());

        String title = request.getTitle().trim();
        String description = request.getDescription().trim();
        PostPrivacy privacy = request.getPrivacy();

        session.setTitle(title);
        session.setDescription(description);
        session.setScheduledAt(request.getScheduledAt());
        session.setPrivacy(privacy);

        // Đồng bộ sửa đổi nội dung bài đăng liên kết
        if (session.getPostId() != null) {
            postRepository.findById(session.getPostId()).ifPresent(post -> {
                post.setContent(buildLiveContent(title, description));
                post.setScheduledAt(request.getScheduledAt());
                post.setPrivacy(privacy);
                postRepository.save(post);
            });
        }

        return toResponse(liveSessionRepository.save(session), hostUserId);
    }

    /**
     * Hủy bỏ buổi livestream đã lên lịch.
     */
    @Override
    public void cancelScheduled(UUID sessionId, UUID hostUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);
        if (session.getStatus() != LiveSessionStatus.SCHEDULED) {
            throw new ValidationException("Chỉ có thể xóa sự kiện live đang chờ phát");
        }

        session.setStatus(LiveSessionStatus.CANCELED);
        liveSessionRepository.save(session);

        // Xóa bài viết liên kết
        if (session.getPostId() != null) {
            postRepository.findById(session.getPostId()).ifPresent(postRepository::delete);
        }
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

    /**
     * Lấy danh sách các sự kiện live của Nhóm (Group Events).
     */
    @Override
    @Transactional(readOnly = true)
    public List<LiveSessionResponse> listByGroup(UUID groupId, UUID viewerUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        if (!canAccessGroupContent(group, viewerUserId)) {
            return List.of();
        }

        boolean isApprovedMember = isApprovedGroupMember(groupId, viewerUserId);
        LocalDateTime staleScheduledCutoff = LocalDateTime.now().minusDays(7);

        return liveSessionRepository.findAllForGroupEvents(groupId)
                .stream()
                .filter(session -> session.getStatus() != LiveSessionStatus.CANCELED
                        && session.getStatus() != LiveSessionStatus.DRAFT)
                .filter(session -> !isStaleScheduledSession(session, staleScheduledCutoff))
                .filter(session -> isApprovedMember || liveAccessService.canView(session, viewerUserId))
                .sorted((left, right) -> compareGroupEvents(left, right))
                .map(session -> toResponse(session, viewerUserId))
                .toList();
    }

    private boolean canAccessGroupContent(Group group, UUID viewerUserId) {
        if (group.getPrivacy() != GroupPrivacy.PRIVATE) {
            return true;
        }
        if (viewerUserId == null) {
            return false;
        }
        return isApprovedGroupMember(group.getId(), viewerUserId);
    }

    private boolean isApprovedGroupMember(UUID groupId, UUID userId) {
        if (userId == null) {
            return false;
        }
        return groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .map(member -> member.getStatus() == GroupMemberStatus.APPROVED)
                .orElse(false);
    }

    private boolean isStaleScheduledSession(LiveSession session, LocalDateTime staleScheduledCutoff) {
        if (session.getStatus() != LiveSessionStatus.SCHEDULED || session.getScheduledAt() == null) {
            return false;
        }
        return session.getScheduledAt().isBefore(staleScheduledCutoff);
    }

    private int compareGroupEvents(LiveSession left, LiveSession right) {
        int leftPriority = groupEventPriority(left.getStatus());
        int rightPriority = groupEventPriority(right.getStatus());
        if (leftPriority != rightPriority) {
            return Integer.compare(leftPriority, rightPriority);
        }
        java.time.LocalDateTime leftTime = left.getScheduledAt() != null ? left.getScheduledAt() : left.getCreatedAt();
        java.time.LocalDateTime rightTime = right.getScheduledAt() != null ? right.getScheduledAt() : right.getCreatedAt();
        if (left.getStatus() == LiveSessionStatus.ENDED) {
            return rightTime.compareTo(leftTime);
        }
        return leftTime.compareTo(rightTime);
    }

    private int groupEventPriority(LiveSessionStatus status) {
        return switch (status) {
            case LIVE -> 0;
            case SCHEDULED -> 1;
            case ENDED -> 2;
            default -> 3;
        };
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionStatsResponse getStats(UUID sessionId, UUID viewerUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, viewerUserId);
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

    /**
     * Job tự động quét kích hoạt phát trực tiếp đối với các sự kiện đã lên lịch đến giờ phát.
     */
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

    private void startHlsEgressIfNeeded(LiveSession session) {
        if (!isBlank(session.getHlsPlaybackUrl()) && !isBlank(session.getEgressId())) {
            return;
        }
        if (!liveKitEgressService.isEgressConfigured()) {
            return;
        }
        // Gọi service kết xuất HLS của LiveKit Egress
        liveKitEgressService.startRoomHlsEgress(session).ifPresentOrElse(result -> {
            session.setEgressId(result.getEgressId());
            session.setHlsPlaybackUrl(result.getHlsPlaybackUrl());
            session.setRecordingError(null);
            session.setStartedAt(LocalDateTime.now());
        }, () -> {
            log.warn("LiveKit HLS egress failed to start for session {}", session.getId());
            session.setRecordingError(trimToLength(
                    "Không khởi động được HLS egress. Kiểm tra LiveKit Cloud egress và cấu hình R2.", 500));
        });
    }

    /**
     * Dọn sạch các Viewer hết hạn duy trì kết nối (Heartbeat Timeout).
     */
    private void cleanupStaleViewers(LiveSession session) {
        liveSessionViewerRepository.deleteStaleBySessionId(
                session.getId(),
                LocalDateTime.now().minusSeconds(VIEWER_HEARTBEAT_TIMEOUT_SECONDS)
        );
    }

    /**
     * Làm mới số lượng người xem đồng thời hiện tại của phòng Live.
     */
    private void refreshViewerCount(LiveSession session) {
        int viewers = session.getStatus() == LiveSessionStatus.LIVE
                ? liveSessionViewerRepository.countBySessionId(session.getId())
                : 0;
        session.setViewerCount(viewers);
        if (viewers > session.getPeakViewerCount()) {
            session.setPeakViewerCount(viewers); // Lưu trữ kỷ lục mắt xem cao nhất
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
                .hostName(resolveHostDisplayName(session.getHost()))
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
                .updatedAt(session.getUpdatedAt());

        if (session.getStatus() == LiveSessionStatus.SCHEDULED) {
            builder.subscriptionCount(liveEventSubscriptionService.countBySessionId(session.getId()));
            if (viewerUserId != null) {
                builder.subscribedByCurrentUser(liveEventSubscriptionService.isSubscribed(session.getId(), viewerUserId));
            }
        }

        return builder.build();
    }

    private String resolveHostDisplayName(User host) {
        if (host.getFullName() != null && !host.getFullName().isBlank()) {
            return host.getFullName().trim();
        }
        return host.getUsername();
    }

    private String buildLiveContent(String title, String description) {
        String safeTitle = title == null ? "" : title.trim();
        String safeDescription = description == null ? "" : description.trim();
        if (safeTitle.isBlank() && safeDescription.isBlank()) {
            throw new ValidationException("Live post content cannot be empty");
        }
        if (safeTitle.isBlank()) {
            return safeDescription;
        }
        if (safeDescription.isBlank()) {
            return safeTitle;
        }
        return safeTitle + "\n\n" + safeDescription;
    }
}
