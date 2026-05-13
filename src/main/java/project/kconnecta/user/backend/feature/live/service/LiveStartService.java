package project.kconnecta.user.backend.feature.live.service;

import project.kconnecta.user.backend.feature.live.dto.request.StartLiveRequest;
import project.kconnecta.user.backend.feature.live.dto.response.StartLiveResponse;

public interface LiveStartService {
    StartLiveResponse startLive(StartLiveRequest request);
}
