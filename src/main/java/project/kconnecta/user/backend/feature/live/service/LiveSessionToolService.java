package project.kconnecta.user.backend.feature.live.service;

import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveFeaturedLinkRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveHostNoticeRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveSessionPinnedCommentRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.VoteLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionToolStateResponse;

import java.util.UUID;

public interface LiveSessionToolService {
    LiveSessionToolStateResponse get(UUID sessionId, UUID viewerUserId);
    LiveSessionToolStateResponse upsertPoll(UUID sessionId, UUID hostUserId, UpsertLivePollRequest request);
    LiveSessionToolStateResponse upsertFeaturedLink(UUID sessionId, UUID hostUserId, UpsertLiveFeaturedLinkRequest request);
    LiveSessionToolStateResponse upsertHostNotice(UUID sessionId, UUID hostUserId, UpsertLiveHostNoticeRequest request);
    LiveSessionToolStateResponse upsertPinnedComment(UUID sessionId, UUID hostUserId, UpsertLiveSessionPinnedCommentRequest request);
    LiveSessionToolStateResponse votePoll(UUID sessionId, UUID userId, VoteLivePollRequest request);
}
