package project.kconnecta.user.backend.feature.friend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.friend.dto.request.FriendRequestBody;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendBirthdayResponse;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendResponse;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendshipStatusResponse;
import project.kconnecta.user.backend.feature.friend.service.FriendService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @GetMapping("/{userId}")
    public ResponseEntity<List<FriendResponse>> getFriends(@PathVariable UUID userId) {
        return ResponseEntity.ok(friendService.getFriends(userId));
    }

    @GetMapping("/{userId}/birthdays")
    public ResponseEntity<List<FriendBirthdayResponse>> getFriendBirthdays(@PathVariable UUID userId) {
        return ResponseEntity.ok(friendService.getFriendBirthdays(userId));
    }

    @GetMapping("/requests")
    public ResponseEntity<List<FriendResponse>> getFriendRequests(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(friendService.getFriendRequests(principal.getUserId()));
    }

    @GetMapping("/{userId}/suggestions")
    public ResponseEntity<List<FriendResponse>> getSuggestions(@PathVariable UUID userId) {
        return ResponseEntity.ok(friendService.getSuggestions(userId));
    }

    @GetMapping("/status")
    public ResponseEntity<FriendshipStatusResponse> getStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID target) {
        return ResponseEntity.ok(friendService.getStatus(principal.getUserId(), target));
    }

    @PostMapping("/request")
    public ResponseEntity<FriendResponse> sendFriendRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody FriendRequestBody body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(friendService.sendFriendRequest(principal.getUserId(), body.getAddresseeId()));
    }

    @PutMapping("/{friendshipId}/accept")
    public ResponseEntity<FriendResponse> acceptFriendRequest(@PathVariable UUID friendshipId) {
        return ResponseEntity.ok(friendService.acceptFriendRequest(friendshipId));
    }

    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<Void> deleteFriendship(
            @PathVariable UUID friendshipId,
            @AuthenticationPrincipal UserPrincipal principal) {
        friendService.deleteFriendship(friendshipId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
