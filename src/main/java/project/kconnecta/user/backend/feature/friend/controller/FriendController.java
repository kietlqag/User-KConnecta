package project.kconnecta.user.backend.feature.friend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.feature.friend.dto.request.FriendRequestBody;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendResponse;
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

    @GetMapping("/{userId}/requests")
    public ResponseEntity<List<FriendResponse>> getFriendRequests(@PathVariable UUID userId) {
        return ResponseEntity.ok(friendService.getFriendRequests(userId));
    }

    @GetMapping("/{userId}/suggestions")
    public ResponseEntity<List<FriendResponse>> getSuggestions(@PathVariable UUID userId) {
        return ResponseEntity.ok(friendService.getSuggestions(userId));
    }

    @PostMapping("/request")
    public ResponseEntity<FriendResponse> sendFriendRequest(@Valid @RequestBody FriendRequestBody body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(friendService.sendFriendRequest(body.getRequesterId(), body.getAddresseeId()));
    }

    @PutMapping("/{friendshipId}/accept")
    public ResponseEntity<FriendResponse> acceptFriendRequest(@PathVariable UUID friendshipId) {
        return ResponseEntity.ok(friendService.acceptFriendRequest(friendshipId));
    }

    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<Void> deleteFriendship(@PathVariable UUID friendshipId) {
        friendService.deleteFriendship(friendshipId);
        return ResponseEntity.noContent().build();
    }
}
