package project.kconnecta.user.backend.feature.post.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionDetailsResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostShareResponse;
import project.kconnecta.user.backend.feature.post.service.PostService;

import java.util.List;
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

    @GetMapping
    public ResponseEntity<List<PostResponse>> getPosts(
            @RequestParam(required = false) UUID authorId,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false, defaultValue = "false") boolean isGroupFeed,
            @RequestParam(required = false) UUID currentUserId
    ) {
        if (groupId != null) {
            return ResponseEntity.ok(postService.getPostsByGroupId(groupId, currentUserId));
        }
        if (authorId != null) {
            return ResponseEntity.ok(postService.getPostsByUserId(authorId, currentUserId));
        }
        if (isGroupFeed) {
            return ResponseEntity.ok(postService.getGroupFeedPosts(currentUserId));
        }
        return ResponseEntity.ok(postService.getAllPosts(currentUserId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getPostById(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID currentUserId
    ) {
        return ResponseEntity.ok(postService.getPostById(id, currentUserId));
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
    public ResponseEntity<List<PostCommentResponse>> getComments(@PathVariable UUID id) {
        return ResponseEntity.ok(postService.getComments(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<PostCommentResponse> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCommentRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.addComment(id, request));
    }

    @PostMapping("/{id}/shares")
    public ResponseEntity<PostShareResponse> sharePost(
            @PathVariable UUID id,
            @Valid @RequestBody SharePostRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.sharePost(id, request));
    }
}
