package project.kconnecta.user.backend.feature.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.feature.user.dto.request.UpdateUserRequest;
import project.kconnecta.user.backend.feature.user.dto.response.UserResponse;
import project.kconnecta.user.backend.feature.user.service.UserService;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/{id}/avatar")
    public ResponseEntity<UserResponse> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        requireSelf(principal, id);
        return ResponseEntity.ok(userService.uploadAvatar(id, file));
    }

    @PostMapping("/{id}/cover")
    public ResponseEntity<UserResponse> uploadCoverPhoto(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        requireSelf(principal, id);
        return ResponseEntity.ok(userService.uploadCoverPhoto(id, file));
    }

    @PutMapping("/{id}/avatar")
    public ResponseEntity<UserResponse> updateAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        requireSelf(principal, id);
        return ResponseEntity.ok(userService.uploadAvatar(id, file));
    }

    @PutMapping("/{id}/cover")
    public ResponseEntity<UserResponse> updateCoverPhoto(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        requireSelf(principal, id);
        return ResponseEntity.ok(userService.uploadCoverPhoto(id, file));
    }

    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUsers(pageable));
    }

    @GetMapping("/{identifier}")
    public ResponseEntity<UserResponse> getUserByIdOrUsername(@PathVariable String identifier) {
        return ResponseEntity.ok(userService.getUserByIdOrUsername(identifier));
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<UserResponse> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        requireSelf(principal, id);
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        requireSelf(principal, id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    private void requireSelf(UserPrincipal principal, UUID targetId) {
        if (!principal.getUserId().equals(targetId)) {
            throw new ForbiddenException("Access denied: you can only modify your own profile");
        }
    }
}
