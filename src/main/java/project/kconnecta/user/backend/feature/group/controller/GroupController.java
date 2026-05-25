package project.kconnecta.user.backend.feature.group.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.group.dto.request.CreateGroupRequest;
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
    public ResponseEntity<List<GroupResponse>> getJoinedGroups(@RequestParam UUID userId) {
        return ResponseEntity.ok(groupService.getJoinedGroups(userId));
    }

    @GetMapping("/managed")
    public ResponseEntity<List<GroupResponse>> getManagedGroups(@RequestParam UUID userId) {
        return ResponseEntity.ok(groupService.getManagedGroups(userId));
    }

    @GetMapping("/discover")
    public ResponseEntity<List<GroupResponse>> getDiscoverGroups(@RequestParam UUID userId) {
        return ResponseEntity.ok(groupService.getDiscoverGroups(userId));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<GroupResponse> joinGroup(
            @PathVariable UUID id,
            @RequestParam UUID userId
    ) {
        return ResponseEntity.ok(groupService.joinGroup(id, userId));
    }


    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@Valid @RequestBody CreateGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(request));
    }

    @PutMapping("/{id}/cover-photo")
    public ResponseEntity<GroupResponse> updateCoverPhoto(
            @PathVariable UUID id,
            @RequestParam("coverPhoto") MultipartFile file
    ) {
        return ResponseEntity.ok(groupService.updateCoverPhoto(id, file));
    }

    @DeleteMapping("/{id}/cover-photo")
    public ResponseEntity<Void> removeCoverPhoto(@PathVariable UUID id) {
        groupService.removeCoverPhoto(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}")
    public ResponseEntity<GroupResponse> getGroupById(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID currentUserId
    ) {
        return ResponseEntity.ok(groupService.getGroupById(id, currentUserId));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<GroupMemberResponse>> getGroupMembers(@PathVariable UUID id) {
        return ResponseEntity.ok(groupService.getGroupMembers(id));
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<Void> inviteFriends(
            @PathVariable UUID id, 
            @RequestParam UUID currentUserId, 
            @RequestBody List<UUID> userIds) {
        groupService.inviteFriends(id, currentUserId, userIds);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/invites/{notificationId}/accept")
    public ResponseEntity<Void> acceptInvite(
            @PathVariable UUID id,
            @PathVariable UUID notificationId,
            @RequestParam UUID userId) {
        groupService.acceptInvite(id, notificationId, userId);
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
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @RequestParam UUID requesterId) {
        groupService.removeMember(id, userId, requesterId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveGroup(
            @PathVariable UUID id,
            @RequestParam UUID userId) {
        groupService.leaveGroup(id, userId);
        return ResponseEntity.noContent().build();
    }
}
