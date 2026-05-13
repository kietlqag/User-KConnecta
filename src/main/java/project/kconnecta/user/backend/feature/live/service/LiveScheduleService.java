package project.kconnecta.user.backend.feature.live.service;

import project.kconnecta.user.backend.feature.live.dto.request.UpsertLiveScheduleRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveScheduleResponse;

import java.util.UUID;

public interface LiveScheduleService {
    LiveScheduleResponse upsertSchedule(UpsertLiveScheduleRequest request);
    LiveScheduleResponse getSchedule(UUID userId);
}

