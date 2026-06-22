package project.kconnecta.user.backend.feature.group.pin.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.group.pin.dto.request.PinPostRequest;
import project.kconnecta.user.backend.feature.group.pin.dto.request.ReorderPinsRequest;
import project.kconnecta.user.backend.feature.group.pin.dto.request.SetPinExpirationRequest;
import project.kconnecta.user.backend.feature.group.pin.dto.response.PinHistoryResponse;
import project.kconnecta.user.backend.feature.group.pin.dto.response.PinnedPostResponse;
import project.kconnecta.user.backend.feature.group.pin.service.GroupPinService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupPinController {

    private final GroupPinService pinService;

    @GetMapping("/{groupId}/pinned-posts")
    public ResponseEntity<List<PinnedPostResponse>> getPinnedPosts(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId) {
        return ResponseEntity.ok(pinService.getPinnedPosts(groupId, principal.getUserId()));
    }

    @PostMapping("/{groupId}/posts/{postId}/pin")
    public ResponseEntity<PinnedPostResponse> pin(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId,
            @PathVariable UUID postId,
            @RequestBody(required = false) PinPostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pinService.pin(groupId, postId, principal.getUserId(), request));
    }

    @DeleteMapping("/{groupId}/posts/{postId}/pin")
    public ResponseEntity<Void> unpin(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId,
            @PathVariable UUID postId) {
        pinService.unpin(groupId, postId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{groupId}/pinned-posts/reorder")
    public ResponseEntity<List<PinnedPostResponse>> reorder(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId,
            @Valid @RequestBody ReorderPinsRequest request) {
        return ResponseEntity.ok(pinService.reorder(groupId, principal.getUserId(), request.getOrderedPostIds()));
    }

    @PatchMapping("/{groupId}/posts/{postId}/pin-expiration")
    public ResponseEntity<PinnedPostResponse> setExpiration(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId,
            @PathVariable UUID postId,
            @RequestBody SetPinExpirationRequest request) {
        return ResponseEntity.ok(
                pinService.setExpiration(groupId, postId, principal.getUserId(), request.getExpiresAt()));
    }

    @PostMapping("/{groupId}/pinned-posts/{pinId}/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId,
            @PathVariable UUID pinId) {
        pinService.markRead(groupId, pinId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{groupId}/pinned-posts/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId) {
        return ResponseEntity.ok(Map.of("unreadCount", pinService.unreadCount(groupId, principal.getUserId())));
    }

    @GetMapping("/{groupId}/pin-history")
    public ResponseEntity<Page<PinHistoryResponse>> getHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId,
            @RequestParam(required = false) UUID postId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(pinService.getHistory(groupId, principal.getUserId(), postId, pageable));
    }
}
