package project.kconnecta.user.backend.feature.post.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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
    public ResponseEntity<PostResponse> createPost(@Valid @RequestBody CreatePostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.createPost(request));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<java.util.Map<String, String>> uploadPostImage(@RequestParam("file") MultipartFile file) {
        String url = postService.uploadPostImage(file);
        return ResponseEntity.ok(java.util.Collections.singletonMap("url", url));
    }

    @DeleteMapping("/media")
    public ResponseEntity<Void> deleteMedia(@RequestParam String url) {
        postService.deleteMedia(url);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<?> getPosts(
            @RequestParam(required = false) UUID authorId,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false, defaultValue = "false") boolean isGroupFeed,
            @RequestParam(required = false) UUID currentUserId,
            @PageableDefault(size = 10) Pageable pageable
    ) {
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
            @PathVariable UUID id,
            @RequestParam(required = false) UUID currentUserId
    ) {
        return ResponseEntity.ok(postService.getPostById(id, currentUserId));
    }

    @GetMapping("/checkin-suggestions")
    public ResponseEntity<List<CheckInSuggestionResponse>> getCheckInSuggestions(
            @RequestParam(required = false) UUID currentUserId,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String ward
    ) {
        return ResponseEntity.ok(postService.getCheckInSuggestions(currentUserId, province, ward));
    }

    @PostMapping("/{id}/reactions")
    public ResponseEntity<PostReactionResponse> addReaction(
            @PathVariable UUID id,
            @Valid @RequestBody AddReactionRequest request
    ) {
        return ResponseEntity.ok(postService.addReaction(id, request));
    }

    @DeleteMapping("/{id}/reactions")
    public ResponseEntity<Void> removeReaction(
            @PathVariable UUID id,
            @RequestParam UUID userId
    ) {
        postService.removeReaction(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/reactions/details")
    public ResponseEntity<PostReactionDetailsResponse> getReactionDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(postService.getReactionDetails(id));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<Page<PostCommentResponse>> getComments(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID currentUserId,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(postService.getComments(id, currentUserId, pageable));
    }

    @GetMapping("/{id}/comments/{commentId}/replies")
    public ResponseEntity<List<PostCommentResponse>> getReplies(
            @PathVariable UUID id,
            @PathVariable UUID commentId,
            @RequestParam(required = false) UUID currentUserId) {
        return ResponseEntity.ok(postService.getReplies(commentId, currentUserId));
    }

    @PostMapping("/{id}/comments/{commentId}/likes")
    public ResponseEntity<Void> likeComment(
            @PathVariable UUID id,
            @PathVariable UUID commentId,
            @RequestParam UUID userId) {
        postService.likeComment(commentId, userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/comments/{commentId}/likes")
    public ResponseEntity<Void> unlikeComment(
            @PathVariable UUID id,
            @PathVariable UUID commentId,
            @RequestParam UUID userId) {
        postService.unlikeComment(commentId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<PostCommentResponse> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCommentRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.addComment(id, request));
    }

    @PutMapping("/{id}/comments/{commentId}")
    public ResponseEntity<PostCommentResponse> updateComment(
            @PathVariable UUID id,
            @PathVariable UUID commentId,
            @Valid @RequestBody UpdateCommentRequest request) {
        return ResponseEntity.ok(postService.updateComment(commentId, request));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<Map<String, Boolean>> deleteComment(
            @PathVariable UUID id,
            @PathVariable UUID commentId,
            @RequestParam UUID userId) {
        boolean softDeleted = postService.deleteComment(commentId, userId);
        return ResponseEntity.ok(Map.of("softDeleted", softDeleted));
    }

    @PostMapping("/{id}/shares")
    public ResponseEntity<PostShareResponse> sharePost(
            @PathVariable UUID id,
            @Valid @RequestBody SharePostRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.sharePost(id, request));
    }

    @PatchMapping("/{id}/privacy")
    public ResponseEntity<PostResponse> updatePrivacy(
            @PathVariable UUID id,
            @RequestParam UUID userId,
            @RequestParam PostPrivacy privacy) {
        return ResponseEntity.ok(postService.updatePrivacy(id, userId, privacy));
    }

    @PostMapping("/{id}/reports")
    public ResponseEntity<Void> reportPost(
            @PathVariable UUID id,
            @RequestBody ReportPostRequest request) {
        postService.reportPost(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable UUID id,
            @RequestParam UUID userId) {
        postService.deletePost(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/saved")
    public ResponseEntity<Void> savePost(@Valid @RequestBody SavePostRequest request) {
        postService.savePost(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/saved/{userId}")
    public ResponseEntity<List<PostResponse>> getSavedPosts(@PathVariable UUID userId) {
        return ResponseEntity.ok(postService.getSavedPosts(userId));
    }

    @DeleteMapping("/saved")
    public ResponseEntity<Void> unsavePost(
            @RequestParam UUID userId,
            @RequestParam UUID postId
    ) {
        postService.unsavePost(userId, postId);
        return ResponseEntity.noContent().build();
    }
}
