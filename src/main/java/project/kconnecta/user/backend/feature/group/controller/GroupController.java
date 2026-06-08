package project.kconnecta.user.backend.feature.group.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.group.dto.request.CreateGroupRequest;
import project.kconnecta.user.backend.feature.group.dto.request.UpdateGroupDescriptionRequest;
import project.kconnecta.user.backend.feature.group.dto.response.GroupMemberResponse;
import project.kconnecta.user.backend.feature.group.dto.response.GroupResponse;
import project.kconnecta.user.backend.feature.group.service.GroupService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @GetMapping("/joined")
    public ResponseEntity<List<GroupResponse>> getJoinedGroups(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(groupService.getJoinedGroups(principal.getUserId()));
    }

    @GetMapping("/managed")
    public ResponseEntity<List<GroupResponse>> getManagedGroups(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(groupService.getManagedGroups(principal.getUserId()));
    }

    @GetMapping("/discover")
    public ResponseEntity<List<GroupResponse>> getDiscoverGroups(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(groupService.getDiscoverGroups(principal.getUserId()));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<GroupResponse> joinGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(groupService.joinGroup(id, principal.getUserId()));
    }

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateGroupRequest request) {
        request.setCreatorId(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(request));
    }

    @PutMapping("/{id}/cover-photo")
    public ResponseEntity<GroupResponse> updateCoverPhoto(
            @PathVariable UUID id,
            @RequestParam("coverPhoto") MultipartFile file) {
        return ResponseEntity.ok(groupService.updateCoverPhoto(id, file));
    }

    @DeleteMapping("/{id}/cover-photo")
    public ResponseEntity<Void> removeCoverPhoto(@PathVariable UUID id) {
        groupService.removeCoverPhoto(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/description")
    public ResponseEntity<GroupResponse> updateDescription(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateGroupDescriptionRequest request) {
        request.setRequesterId(principal.getUserId());
        return ResponseEntity.ok(
                groupService.updateDescription(id, request.getRequesterId(), request.getDescription())
        );
    }

    @GetMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}")
    public ResponseEntity<GroupResponse> getGroupById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(groupService.getGroupById(id, principal.getUserId()));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<GroupMemberResponse>> getGroupMembers(@PathVariable UUID id) {
        return ResponseEntity.ok(groupService.getGroupMembers(id));
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<Void> inviteFriends(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody List<UUID> userIds) {
        groupService.inviteFriends(id, principal.getUserId(), userIds);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/invites/{notificationId}/accept")
    public ResponseEntity<Void> acceptInvite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID notificationId) {
        groupService.acceptInvite(id, notificationId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/invites/{notificationId}/reject")
    public ResponseEntity<Void> rejectInvite(
            @PathVariable UUID id,
            @PathVariable UUID notificationId) {
        groupService.rejectInvite(id, notificationId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID userId) {
        groupService.removeMember(id, userId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        groupService.leaveGroup(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
