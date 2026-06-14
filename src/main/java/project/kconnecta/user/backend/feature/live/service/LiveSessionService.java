package project.kconnecta.user.backend.feature.live.service;

import project.kconnecta.user.backend.feature.live.dto.request.session.CreateLiveSessionRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.LiveViewerRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveReactionRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionStatsResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface LiveSessionService {
    LiveSessionResponse createSession(CreateLiveSessionRequest request);
    LiveSessionResponse goLive(UUID sessionId);
    LiveSessionResponse endLive(UUID sessionId, UUID requesterUserId);
    LiveSessionResponse saveRecording(UUID sessionId, UUID hostUserId, MultipartFile file, Integer durationSec);
    LiveSessionResponse markRecordingFailed(UUID sessionId, UUID hostUserId, String error);
    LiveSessionResponse join(UUID sessionId, LiveViewerRequest request);
    LiveSessionResponse heartbeat(UUID sessionId, LiveViewerRequest request);
    LiveSessionResponse leave(UUID sessionId, LiveViewerRequest request);
    LiveSessionResponse react(UUID sessionId, UpsertLiveReactionRequest request);
    LiveSessionResponse getById(UUID sessionId);
    LiveSessionResponse getByPostId(UUID postId);
    List<LiveSessionResponse> listActive();
    List<LiveSessionResponse> listByHost(UUID hostUserId);
    LiveSessionStatsResponse getStats(UUID sessionId);
}
