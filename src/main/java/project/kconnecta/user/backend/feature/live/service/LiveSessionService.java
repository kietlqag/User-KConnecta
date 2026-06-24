package project.kconnecta.user.backend.feature.live.service;



import project.kconnecta.user.backend.feature.live.dto.request.session.CreateLiveSessionRequest;

import project.kconnecta.user.backend.feature.live.dto.request.session.UpdateScheduledLiveRequest;

import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveReactionRequest;

import project.kconnecta.user.backend.feature.live.dto.response.session.GoLiveResponse;

import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionReactionResponse;

import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;

import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionStatsResponse;

import org.springframework.web.multipart.MultipartFile;



import java.util.List;

import java.util.UUID;



public interface LiveSessionService {

    LiveSessionResponse createSession(CreateLiveSessionRequest request, UUID hostUserId);

    GoLiveResponse goLive(UUID sessionId, UUID hostUserId);

    LiveSessionResponse endLive(UUID sessionId, UUID requesterUserId);

    LiveSessionResponse saveRecording(UUID sessionId, UUID hostUserId, MultipartFile file, Integer durationSec);

    LiveSessionResponse markRecordingFailed(UUID sessionId, UUID hostUserId, String error);

    LiveSessionResponse join(UUID sessionId, UUID userId);

    LiveSessionResponse heartbeat(UUID sessionId, UUID userId);

    LiveSessionResponse leave(UUID sessionId, UUID userId);

    LiveSessionResponse react(UUID sessionId, UUID userId, UpsertLiveReactionRequest request);

    LiveSessionReactionResponse getReaction(UUID sessionId, UUID userId);

    LiveSessionResponse getById(UUID sessionId, UUID viewerUserId);

    LiveSessionResponse getByPostId(UUID postId, UUID viewerUserId);

    List<LiveSessionResponse> listActive(UUID viewerUserId);

    List<LiveSessionResponse> listScheduled(UUID viewerUserId);

    LiveSessionResponse updateScheduled(UUID sessionId, UUID hostUserId, UpdateScheduledLiveRequest request);

    void cancelScheduled(UUID sessionId, UUID hostUserId);

    List<LiveSessionResponse> listByHost(UUID hostUserId, UUID requesterUserId);

    List<LiveSessionResponse> listByGroup(UUID groupId, UUID viewerUserId);

    LiveSessionStatsResponse getStats(UUID sessionId, UUID viewerUserId);

    int activateDueScheduledSessions();

}

