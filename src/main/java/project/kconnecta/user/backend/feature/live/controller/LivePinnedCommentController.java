package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.feature.live.dto.request.UpsertLivePinnedCommentRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LivePinnedCommentResponse;
import project.kconnecta.user.backend.feature.live.service.LivePinnedCommentService;

import java.util.UUID;

@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
public class LivePinnedCommentController {

    private final LivePinnedCommentService livePinnedCommentService;

    @PostMapping("/pinned-comment")
    public ResponseEntity<LivePinnedCommentResponse> upsertPinnedComment(
            @Valid @RequestBody UpsertLivePinnedCommentRequest request
    ) {
        return ResponseEntity.ok(livePinnedCommentService.upsertPinnedComment(request));
    }

    @GetMapping("/pinned-comment")
    public ResponseEntity<LivePinnedCommentResponse> getPinnedComment(@RequestParam UUID userId) {
        return ResponseEntity.ok(livePinnedCommentService.getPinnedComment(userId));
    }
}

