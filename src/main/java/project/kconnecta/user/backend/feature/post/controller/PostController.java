package project.kconnecta.user.backend.feature.post.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SavePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.ReportPostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.CheckInSuggestionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionDetailsResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostShareResponse;
import project.kconnecta.user.backend.feature.post.service.PostService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping
    public ResponseEntity<PostResponse> createPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreatePostRequest request) {
        request.setAuthorId(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.createPost(request));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<java.util.Map<String, String>> uploadPostImage(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        String url = postService.uploadPostImage(principal.getUserId(), file);
        return ResponseEntity.ok(java.util.Collections.singletonMap("url", url));
    }

    @DeleteMapping("/media")
    public ResponseEntity<Void> deleteMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String url) {
        postService.deleteMedia(url, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/watch")
    public ResponseEntity<Page<PostResponse>> getWatchPosts(
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(postService.getWatchPosts(principal.getUserId(), pageable));
    }

    @GetMapping
    public ResponseEntity<?> getPosts(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID authorId,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false, defaultValue = "false") boolean isGroupFeed,
            @PageableDefault(size = 10) Pageable pageable) {
        UUID currentUserId = principal.getUserId();
        if (groupId != null) {
            return ResponseEntity.ok(postService.getPostsByGroupId(groupId, currentUserId));
        }
        if (authorId != null) {
            return ResponseEntity.ok(postService.getPostsByUserId(authorId, currentUserId, pageable));
        }
        if (isGroupFeed) {
            return ResponseEntity.ok(postService.getGroupFeedPosts(currentUserId));
        }
        return ResponseEntity.ok(postService.getAllPosts(currentUserId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getPostById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(postService.getPostById(id, principal.getUserId()));
    }

    @GetMapping("/checkin-suggestions")
    public ResponseEntity<List<CheckInSuggestionResponse>> getCheckInSuggestions(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String ward) {
        return ResponseEntity.ok(postService.getCheckInSuggestions(principal.getUserId(), province, ward));
    }

    @PostMapping("/{id}/reactions")
    public ResponseEntity<PostReactionResponse> addReaction(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody AddReactionRequest request) {
        request.setUserId(principal.getUserId());
        return ResponseEntity.ok(postService.addReaction(id, request));
    }

    @DeleteMapping("/{id}/reactions")
    public ResponseEntity<Void> removeReaction(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        postService.removeReaction(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/reactions/details")
    public ResponseEntity<PostReactionDetailsResponse> getReactionDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(postService.getReactionDetails(id));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<Page<PostCommentResponse>> getComments(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(postService.getComments(id, principal.getUserId(), pageable));
    }

    @GetMapping("/{id}/comments/{commentId}/replies")
    public ResponseEntity<List<PostCommentResponse>> getReplies(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID commentId) {
        return ResponseEntity.ok(postService.getReplies(commentId, principal.getUserId()));
    }

    @PostMapping("/{id}/comments/{commentId}/likes")
    public ResponseEntity<Void> likeComment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID commentId) {
        postService.likeComment(commentId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/comments/{commentId}/likes")
    public ResponseEntity<Void> unlikeComment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID commentId) {
        postService.unlikeComment(commentId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<PostCommentResponse> addComment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody CreateCommentRequest request) {
        request.setUserId(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.addComment(id, request));
    }

    @PutMapping("/{id}/comments/{commentId}")
    public ResponseEntity<PostCommentResponse> updateComment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID commentId,
            @Valid @RequestBody UpdateCommentRequest request) {
        return ResponseEntity.ok(postService.updateComment(commentId, principal.getUserId(), request));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<Map<String, Boolean>> deleteComment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID commentId) {
        boolean softDeleted = postService.deleteComment(commentId, principal.getUserId());
        return ResponseEntity.ok(Map.of("softDeleted", softDeleted));
    }

    @PostMapping("/{id}/shares")
    public ResponseEntity<PostShareResponse> sharePost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody SharePostRequest request) {
        request.setUserId(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.sharePost(id, request));
    }

    @PatchMapping("/{id}/privacy")
    public ResponseEntity<PostResponse> updatePrivacy(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam PostPrivacy privacy) {
        return ResponseEntity.ok(postService.updatePrivacy(id, principal.getUserId(), privacy));
    }

    @PostMapping("/{id}/reports")
    public ResponseEntity<Void> reportPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody ReportPostRequest request) {
        request.setReporterId(principal.getUserId());
        postService.reportPost(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        postService.deletePost(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/saved")
    public ResponseEntity<Void> savePost(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SavePostRequest request) {
        request.setUserId(principal.getUserId());
        postService.savePost(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/saved")
    public ResponseEntity<List<PostResponse>> getSavedPosts(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(postService.getSavedPosts(principal.getUserId()));
    }

    @DeleteMapping("/saved")
    public ResponseEntity<Void> unsavePost(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID postId) {
        postService.unsavePost(principal.getUserId(), postId);
        return ResponseEntity.noContent().build();
    }
}
