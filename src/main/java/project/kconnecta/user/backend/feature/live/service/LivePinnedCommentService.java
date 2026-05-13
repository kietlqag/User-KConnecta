package project.kconnecta.user.backend.feature.live.service;

import project.kconnecta.user.backend.feature.live.dto.request.UpsertLivePinnedCommentRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LivePinnedCommentResponse;

import java.util.UUID;

public interface LivePinnedCommentService {
    LivePinnedCommentResponse upsertPinnedComment(UpsertLivePinnedCommentRequest request);
    LivePinnedCommentResponse getPinnedComment(UUID userId);
}

