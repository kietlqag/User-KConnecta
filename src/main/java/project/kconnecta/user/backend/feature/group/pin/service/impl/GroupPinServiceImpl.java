package project.kconnecta.user.backend.feature.group.pin.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.entity.GroupMember;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.group.pin.config.GroupPinProperties;
import project.kconnecta.user.backend.feature.group.pin.dto.request.PinPostRequest;
import project.kconnecta.user.backend.feature.group.pin.dto.response.PinHistoryResponse;
import project.kconnecta.user.backend.feature.group.pin.dto.response.PinnedPostResponse;
import project.kconnecta.user.backend.feature.group.pin.entity.GroupPinHistory;
import project.kconnecta.user.backend.feature.group.pin.entity.GroupPinRead;
import project.kconnecta.user.backend.feature.group.pin.entity.GroupPinnedPost;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.FeaturedType;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinHistoryAction;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinPriority;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinStatus;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinType;
import project.kconnecta.user.backend.feature.group.pin.repository.GroupPinHistoryRepository;
import project.kconnecta.user.backend.feature.group.pin.repository.GroupPinReadRepository;
import project.kconnecta.user.backend.feature.group.pin.repository.GroupPinnedPostRepository;
import project.kconnecta.user.backend.feature.group.pin.service.GroupPinService;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.service.NotificationService;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.post.service.PostService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GroupPinServiceImpl implements GroupPinService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final PostRepository postRepository;
    private final PostService postService;
    private final GroupPinnedPostRepository pinRepository;
    private final GroupPinHistoryRepository historyRepository;
    private final GroupPinReadRepository readRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final GroupPinProperties props;

    // ───────────────────────── Read ─────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<PinnedPostResponse> getPinnedPosts(UUID groupId, UUID currentUserId) {
        Group group = getGroup(groupId);
        if (!canView(group, currentUserId)) {
            return List.of();
        }
        List<GroupPinnedPost> pins = pinRepository.findActiveByGroup(groupId, PinStatus.ACTIVE);
        Set<UUID> readPinIds = readPinIds(currentUserId, pins);
        return pins.stream()
                .map(p -> toResponse(p, currentUserId, readPinIds.contains(p.getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(UUID groupId, UUID userId) {
        if (!props.isReadTracking()) return 0;
        Group group = getGroup(groupId);
        if (!canView(group, userId)) return 0;
        List<GroupPinnedPost> pins = pinRepository.findActiveByGroup(groupId, PinStatus.ACTIVE);
        Set<UUID> readPinIds = readPinIds(userId, pins);
        return pins.stream().filter(p -> !readPinIds.contains(p.getId())).count();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PinHistoryResponse> getHistory(UUID groupId, UUID actorId, UUID postId, Pageable pageable) {
        requireAdmin(groupId, actorId);
        Page<GroupPinHistory> page = (postId == null)
                ? historyRepository.findByGroupIdOrderByCreatedAtDesc(groupId, pageable)
                : historyRepository.findByGroupIdAndPostIdOrderByCreatedAtDesc(groupId, postId, pageable);
        return page.map(h -> PinHistoryResponse.builder()
                .id(h.getId()).postId(h.getPostId()).action(h.getAction())
                .actorId(h.getActorId()).reason(h.getReason()).createdAt(h.getCreatedAt())
                .build());
    }

    // ───────────────────────── Write (Admin) ─────────────────────────

    @Override
    public PinnedPostResponse pin(UUID groupId, UUID postId, UUID actorId, PinPostRequest request) {
        Group group = getGroup(groupId);
        requireAdmin(groupId, actorId);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));
        if (post.getStatus() == PostStatus.DELETED) {
            throw new ValidationException("Không thể ghim bài viết đã xóa");
        }
        if (post.getStatus() != PostStatus.PUBLISHED) {
            throw new ValidationException("Chỉ ghim được bài viết đã đăng");
        }
        if (post.getGroup() == null || !post.getGroup().getId().equals(groupId)) {
            throw new ValidationException("Không thể ghim bài viết của nhóm khác");
        }
        if (pinRepository.findByGroupIdAndPostId(groupId, postId).isPresent()) {
            throw new DuplicateResourceException("Bài viết đã được ghim");
        }
        if (pinRepository.countByGroupIdAndStatus(groupId, PinStatus.ACTIVE) >= props.getMax()) {
            throw new ValidationException("Đã đạt số bài ghim tối đa (" + props.getMax() + ")");
        }
        LocalDateTime expiresAt = request != null ? request.getExpiresAt() : null;
        if (expiresAt != null && !expiresAt.isAfter(LocalDateTime.now())) {
            throw new ValidationException("Thời gian hết hạn phải ở tương lai");
        }

        GroupPinnedPost pin = GroupPinnedPost.builder()
                .group(group)
                .post(post)
                .pinnedBy(getMember(groupId, actorId).getUser())
                .featuredType(FeaturedType.POST)
                .pinType(request != null && request.getPinType() != null ? request.getPinType() : PinType.NORMAL)
                .priority(request != null && request.getPriority() != null ? request.getPriority() : PinPriority.NORMAL)
                .status(PinStatus.ACTIVE)
                .displayOrder(pinRepository.findMaxDisplayOrder(groupId, PinStatus.ACTIVE) + 1)
                .expiresAt(expiresAt)
                .reason(request != null ? trimToNull(request.getReason()) : null)
                .build();
        pin = pinRepository.save(pin);

        writeHistory(groupId, postId, PinHistoryAction.PIN, actorId, pin.getReason());
        notifyNewPin(group, actorId, postId);
        broadcast(groupId);
        return toResponse(pin, actorId, true);
    }

    @Override
    public void unpin(UUID groupId, UUID postId, UUID actorId) {
        getGroup(groupId);
        requireAdmin(groupId, actorId);
        GroupPinnedPost pin = pinRepository.findByGroupIdAndPostId(groupId, postId)
                .orElseThrow(() -> new ResourceNotFoundException("Bài ghim không tồn tại"));
        pinRepository.delete(pin);
        writeHistory(groupId, postId, PinHistoryAction.UNPIN, actorId, null);
        broadcast(groupId);
    }

    @Override
    public List<PinnedPostResponse> reorder(UUID groupId, UUID actorId, List<UUID> orderedPostIds) {
        getGroup(groupId);
        requireAdmin(groupId, actorId);
        List<GroupPinnedPost> active = pinRepository.findActiveByGroup(groupId, PinStatus.ACTIVE);
        Set<UUID> currentPostIds = active.stream().map(p -> p.getPost().getId()).collect(Collectors.toSet());
        if (orderedPostIds.size() != active.size() || !currentPostIds.containsAll(orderedPostIds)) {
            throw new ValidationException("Danh sách sắp xếp không khớp với các bài ghim hiện có");
        }
        Map<UUID, GroupPinnedPost> byPost = active.stream()
                .collect(Collectors.toMap(p -> p.getPost().getId(), p -> p));
        for (int i = 0; i < orderedPostIds.size(); i++) {
            byPost.get(orderedPostIds.get(i)).setDisplayOrder(i);
        }
        pinRepository.saveAll(byPost.values());
        writeHistory(groupId, orderedPostIds.get(0), PinHistoryAction.REORDER, actorId, null);
        broadcast(groupId);
        return getPinnedPosts(groupId, actorId);
    }

    @Override
    public PinnedPostResponse setExpiration(UUID groupId, UUID postId, UUID actorId, LocalDateTime expiresAt) {
        getGroup(groupId);
        requireAdmin(groupId, actorId);
        if (expiresAt != null && !expiresAt.isAfter(LocalDateTime.now())) {
            throw new ValidationException("Thời gian hết hạn phải ở tương lai");
        }
        GroupPinnedPost pin = pinRepository.findByGroupIdAndPostIdAndStatus(groupId, postId, PinStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Bài ghim không tồn tại"));
        pin.setExpiresAt(expiresAt);
        pinRepository.save(pin);
        writeHistory(groupId, postId, PinHistoryAction.SET_EXPIRY, actorId, null);
        broadcast(groupId);
        return toResponse(pin, actorId, true);
    }

    @Override
    public void markRead(UUID groupId, UUID pinId, UUID userId) {
        if (!props.isReadTracking()) return; // no-op khi tắt tính năng
        GroupPinnedPost pin = pinRepository.findById(pinId)
                .orElseThrow(() -> new ResourceNotFoundException("Bài ghim không tồn tại"));
        if (!pin.getGroup().getId().equals(groupId)) {
            throw new ResourceNotFoundException("Bài ghim không thuộc nhóm này");
        }
        if (readRepository.existsByPinIdAndUserId(pinId, userId)) {
            return; // idempotent
        }
        readRepository.save(GroupPinRead.builder().pinId(pinId).userId(userId).build());
    }

    // ───────────────────────── Scheduler ─────────────────────────

    @Override
    public int sweepExpiredPins() {
        if (!props.isAutoUnpin()) return 0;
        List<GroupPinnedPost> expired = pinRepository.findActiveExpired(LocalDateTime.now());
        for (GroupPinnedPost pin : expired) {
            UUID groupId = pin.getGroup().getId();
            UUID postId = pin.getPost().getId();
            pinRepository.delete(pin);
            writeHistory(groupId, postId, PinHistoryAction.AUTO_UNPIN, null, "EXPIRED");
            broadcast(groupId);
        }
        return expired.size();
    }

    // ───────────────────────── Helpers ─────────────────────────

    private Group getGroup(UUID groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));
    }

    private GroupMember getMember(UUID groupId, UUID userId) {
        return groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new ForbiddenException("Bạn không phải thành viên của nhóm"));
    }

    private void requireAdmin(UUID groupId, UUID actorId) {
        GroupMember member = getMember(groupId, actorId);
        if (member.getRole() != GroupMemberRole.ADMIN || member.getStatus() != GroupMemberStatus.APPROVED) {
            throw new ForbiddenException("Chỉ quản trị viên nhóm mới được quản lý bài ghim");
        }
    }

    private boolean canView(Group group, UUID userId) {
        if (group.getPrivacy() != GroupPrivacy.PRIVATE) return true;
        if (userId == null) return false;
        return groupMemberRepository.findByGroupIdAndUserId(group.getId(), userId)
                .map(m -> m.getStatus() == GroupMemberStatus.APPROVED)
                .orElse(false);
    }

    private Set<UUID> readPinIds(UUID userId, List<GroupPinnedPost> pins) {
        if (!props.isReadTracking() || userId == null || pins.isEmpty()) return Set.of();
        List<UUID> ids = pins.stream().map(GroupPinnedPost::getId).toList();
        return Set.copyOf(readRepository.findReadPinIds(userId, ids));
    }

    private void writeHistory(UUID groupId, UUID postId, PinHistoryAction action, UUID actorId, String reason) {
        historyRepository.save(GroupPinHistory.builder()
                .groupId(groupId).postId(postId).action(action).actorId(actorId).reason(reason)
                .build());
    }

    private void notifyNewPin(Group group, UUID actorId, UUID postId) {
        if (!props.isNotifications()) return;
        String content = "📌 " + group.getName() + " vừa ghim một bài viết";
        List<GroupMember> members = groupMemberRepository.findAllByGroupId(group.getId());
        for (GroupMember m : members) {
            if (m.getStatus() != GroupMemberStatus.APPROVED) continue;
            if (m.getUser().getId().equals(actorId)) continue;
            try {
                notificationService.createNotification(
                        m.getUser().getId(), actorId,
                        NotificationType.GROUP_POST_PINNED, content, group.getId());
            } catch (Exception e) {
                log.warn("[pin] notify failed for member {}: {}", m.getUser().getId(), e.getMessage());
            }
        }
    }

    private void broadcast(UUID groupId) {
        try {
            messagingTemplate.convertAndSend("/topic/group/" + groupId,
                    Map.of("event", "PIN_CHANGED", "groupId", groupId.toString()));
        } catch (Exception e) {
            log.warn("[pin] broadcast failed for group {}: {}", groupId, e.getMessage());
        }
    }

    private PinnedPostResponse toResponse(GroupPinnedPost pin, UUID viewerId, boolean read) {
        return PinnedPostResponse.builder()
                .pinId(pin.getId())
                .groupId(pin.getGroup().getId())
                .featuredType(pin.getFeaturedType())
                .pinType(pin.getPinType())
                .priority(pin.getPriority())
                .displayOrder(pin.getDisplayOrder())
                .pinnedAt(pin.getPinnedAt())
                .expiresAt(pin.getExpiresAt())
                .reason(pin.getReason())
                .pinnedBy(PinnedPostResponse.PinnedByUser.builder()
                        .id(pin.getPinnedBy().getId())
                        .fullName(pin.getPinnedBy().getFullName())
                        .avatarUrl(pin.getPinnedBy().getAvatarUrl())
                        .build())
                .read(read)
                .post(postService.getPostById(pin.getPost().getId(), viewerId))
                .build();
    }

    private String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
