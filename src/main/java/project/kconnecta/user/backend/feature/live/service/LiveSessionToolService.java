package project.kconnecta.user.backend.feature.live.service;

import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveFeaturedLinkRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveHostNoticeRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionToolStateResponse;

import java.util.UUID;

public interface LiveSessionToolService {
    LiveSessionToolStateResponse get(UUID sessionId);
    LiveSessionToolStateResponse upsertPoll(UUID sessionId, UpsertLivePollRequest request);
    LiveSessionToolStateResponse upsertFeaturedLink(UUID sessionId, UpsertLiveFeaturedLinkRequest request);
    LiveSessionToolStateResponse upsertHostNotice(UUID sessionId, UpsertLiveHostNoticeRequest request);
}
