package project.kconnecta.user.backend.feature.album.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.album.dto.request.*;
import project.kconnecta.user.backend.feature.album.dto.response.AlbumCommentResponse;
import project.kconnecta.user.backend.feature.album.dto.response.AlbumMediaResponse;
import project.kconnecta.user.backend.feature.album.dto.response.AlbumResponse;
import project.kconnecta.user.backend.feature.album.dto.response.AlbumSidebarItemResponse;
import project.kconnecta.user.backend.feature.album.dto.response.ShareAlbumResponse;
import project.kconnecta.user.backend.feature.album.service.AlbumService;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AlbumController {

    private final AlbumService albumService;

    @PostMapping("/api/albums")
    public ResponseEntity<AlbumResponse> createAlbum(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateAlbumRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(albumService.createAlbum(principal.getUserId(), request));
    }

    @PutMapping("/api/albums/{id}")
    public ResponseEntity<AlbumResponse> updateAlbum(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAlbumRequest request) {
        return ResponseEntity.ok(albumService.updateAlbum(principal.getUserId(), id, request));
    }

    @DeleteMapping("/api/albums/{id}")
    public ResponseEntity<Void> deleteAlbum(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        albumService.deleteAlbum(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/albums/{id}")
    public ResponseEntity<AlbumResponse> getAlbum(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "true") boolean includeMedia) {
        return ResponseEntity.ok(albumService.getAlbum(principal.getUserId(), id, includeMedia));
    }

    @GetMapping("/api/me/albums")
    public ResponseEntity<Page<AlbumResponse>> getMyAlbums(
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 12) Pageable pageable) {
        return ResponseEntity.ok(albumService.getMyAlbums(principal.getUserId(), pageable));
    }

    @GetMapping("/api/me/albums/sidebar")
    public ResponseEntity<List<AlbumSidebarItemResponse>> getSidebarAlbums(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(albumService.getSidebarAlbums(principal.getUserId()));
    }

    @GetMapping("/api/users/{userId}/albums")
    public ResponseEntity<Page<AlbumResponse>> getUserAlbums(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID userId,
            @PageableDefault(size = 12) Pageable pageable) {
        return ResponseEntity.ok(albumService.getUserAlbums(principal.getUserId(), userId, pageable));
    }

    @GetMapping("/api/groups/{groupId}/albums")
    public ResponseEntity<Page<AlbumResponse>> getGroupAlbums(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID groupId,
            @PageableDefault(size = 12) Pageable pageable) {
        return ResponseEntity.ok(albumService.getGroupAlbums(principal.getUserId(), groupId, pageable));
    }

    @PostMapping(value = "/api/albums/{id}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AlbumMediaResponse> uploadMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file,
            @RequestPart(value = "caption", required = false) String caption) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(albumService.uploadMedia(principal.getUserId(), id, file, caption));
    }

    @DeleteMapping("/api/albums/{albumId}/media/{mediaId}")
    public ResponseEntity<Void> deleteMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID albumId,
            @PathVariable UUID mediaId) {
        albumService.deleteMedia(principal.getUserId(), albumId, mediaId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/albums/{id}/media/reorder")
    public ResponseEntity<Void> reorderMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody ReorderAlbumMediaRequest request) {
        albumService.reorderMedia(principal.getUserId(), id, request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/albums/{id}/cover")
    public ResponseEntity<Void> setCover(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody SetAlbumCoverRequest request) {
        albumService.setCover(principal.getUserId(), id, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/albums/{id}/comments")
    public ResponseEntity<AlbumCommentResponse> addComment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody CreateAlbumCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(albumService.addAlbumComment(principal.getUserId(), id, request));
    }

    @GetMapping("/api/albums/{id}/comments")
    public ResponseEntity<List<AlbumCommentResponse>> getComments(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(albumService.getAlbumComments(principal.getUserId(), id));
    }

    @PostMapping("/api/albums/{id}/reactions")
    public ResponseEntity<Void> addReaction(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody AlbumReactionRequest request) {
        albumService.addAlbumReaction(principal.getUserId(), id, request.getReactionType());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/albums/{id}/reactions")
    public ResponseEntity<Void> removeReaction(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        albumService.removeAlbumReaction(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/albums/{albumId}/media/{mediaId}/comments")
    public ResponseEntity<AlbumCommentResponse> addMediaComment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID albumId,
            @PathVariable UUID mediaId,
            @Valid @RequestBody CreateAlbumCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(albumService.addMediaComment(principal.getUserId(), albumId, mediaId, request));
    }

    @GetMapping("/api/albums/{albumId}/media/{mediaId}/comments")
    public ResponseEntity<List<AlbumCommentResponse>> getMediaComments(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID albumId,
            @PathVariable UUID mediaId) {
        return ResponseEntity.ok(albumService.getMediaComments(principal.getUserId(), albumId, mediaId));
    }

    @PostMapping("/api/albums/{albumId}/media/{mediaId}/reactions")
    public ResponseEntity<Void> addMediaReaction(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID albumId,
            @PathVariable UUID mediaId,
            @Valid @RequestBody AlbumReactionRequest request) {
        albumService.addMediaReaction(principal.getUserId(), albumId, mediaId, request.getReactionType());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/albums/{albumId}/media/{mediaId}/reactions")
    public ResponseEntity<Void> removeMediaReaction(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID albumId,
            @PathVariable UUID mediaId) {
        albumService.removeMediaReaction(principal.getUserId(), albumId, mediaId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/albums/{id}/share")
    public ResponseEntity<ShareAlbumResponse> shareAlbum(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody ShareAlbumRequest request) {
        return ResponseEntity.ok(albumService.shareAlbum(principal.getUserId(), id, request));
    }

    @PostMapping("/api/albums/{id}/report")
    public ResponseEntity<Void> reportAlbum(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody ReportAlbumRequest request) {
        albumService.reportAlbum(principal.getUserId(), id, request);
        return ResponseEntity.noContent().build();
    }
}
