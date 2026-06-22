package project.kconnecta.user.backend.feature.group.pin.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import project.kconnecta.user.backend.feature.group.pin.dto.request.PinPostRequest;
import project.kconnecta.user.backend.feature.group.pin.dto.response.PinHistoryResponse;
import project.kconnecta.user.backend.feature.group.pin.dto.response.PinnedPostResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface GroupPinService {

    List<PinnedPostResponse> getPinnedPosts(UUID groupId, UUID currentUserId);

    PinnedPostResponse pin(UUID groupId, UUID postId, UUID actorId, PinPostRequest request);

    void unpin(UUID groupId, UUID postId, UUID actorId);

    List<PinnedPostResponse> reorder(UUID groupId, UUID actorId, List<UUID> orderedPostIds);

    PinnedPostResponse setExpiration(UUID groupId, UUID postId, UUID actorId, LocalDateTime expiresAt);

    void markRead(UUID groupId, UUID pinId, UUID userId);

    long unreadCount(UUID groupId, UUID userId);

    Page<PinHistoryResponse> getHistory(UUID groupId, UUID actorId, UUID postId, Pageable pageable);

    /** Dùng cho scheduler: tự bỏ ghim các pin đã hết hạn. Trả về số pin đã gỡ. */
    int sweepExpiredPins();
}
